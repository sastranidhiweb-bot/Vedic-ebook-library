  // ...existing code...
import { extractTextContent, extractHtmlContent } from '../src/utils/textExtractor.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let extractHeadingsWithPositions;
try {
  ({ extractHeadingsWithPositions } = require('./extractHeadingsWithPositions.cjs'));
} catch (err) {
  console.error('❌ Failed to load extractHeadingsWithPositions.cjs:', err.message);
  extractHeadingsWithPositions = null;
}
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import { ensureLocalBookFile } from './bookStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class OptimizedContentCache {
  constructor() {
    // Three-tier caching system
    this.hotCache = new Map();     // Recently accessed books (full content)
    this.warmCache = new Map();    // Metadata only (for quick access)
    this.diskCache = new Map();    // File paths for extracted content on disk
    
    // Configuration for large libraries
    this.config = {
      maxHotCacheSize: 10,        // Only 10 books in memory at once
      maxWarmCacheSize: 100,      // 100 book metadata entries
      maxDiskCacheSize: 1000,     // 1000 books on disk
      hotCacheTimeout: 15 * 60 * 1000,  // 15 minutes for hot cache
      warmCacheTimeout: 2 * 60 * 60 * 1000, // 2 hours for warm cache
      diskCacheTimeout: 24 * 60 * 60 * 1000, // 24 hours for disk cache
      wordsPerPage: 500,
      maxMemoryUsageMB: 100,      // Maximum 100MB in memory
      maxDocxHtmlExtractionSizeMB: 4, // For large DOCX, avoid heavy HTML conversion
    };
    
    this.stats = {
      hotHits: 0,
      warmHits: 0,
      diskHits: 0,
      misses: 0,
      extractions: 0
    };
    
    this.diskCacheDir = path.join(__dirname, '../cache');
    this.initializeDiskCache();
  }

  async initializeDiskCache() {
    try {
      await fs.mkdir(this.diskCacheDir, { recursive: true });
      console.log('📁 Disk cache directory initialized:', this.diskCacheDir);
    } catch (error) {
      console.error('Failed to create disk cache directory:', error);
    }
  }

  /**
   * Generate content hash for cache invalidation
   */
  async getFileHash(filePath) {
    try {
      const stat = await fs.stat(filePath);
      return crypto
        .createHash('md5')
        .update(`${stat.size}:${stat.mtimeMs}`)
        .digest('hex');
    } catch (error) {
      return Date.now().toString(); // Fallback to timestamp
    }
  }

  htmlToText(html = '') {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  textToHtml(text = '') {
    if (!text) return '<p></p>';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `<p>${escaped
      .split(/\n{2,}/)
      .map((para) => para.replace(/\n/g, '<br/>').trim())
      .filter(Boolean)
      .join('</p><p>')}</p>`;
  }

  estimateHeadingPagesFromHtml(htmlContent = '', wordsPerPage = 500) {
    const headingMap = new Map();
    const headingRegex = /<(h[1-6])[^>]*>(.*?)<\/\1>/gi;
    let match;
    let lastIndex = 0;
    let wordCount = 0;

    while ((match = headingRegex.exec(htmlContent)) !== null) {
      const beforeHeading = htmlContent.slice(lastIndex, match.index);
      wordCount += this.htmlToText(beforeHeading).split(/\s+/).filter(Boolean).length;

      const headingText = this.htmlToText(match[2]);
      if (headingText && !headingMap.has(headingText)) {
        headingMap.set(headingText, Math.max(1, Math.floor(wordCount / wordsPerPage) + 1));
      }

      lastIndex = headingRegex.lastIndex;
    }

    return Array.from(headingMap.entries()).map(([heading, page]) => ({
      chapterName: heading,
      pageNumber: page
    }));
  }

  /**
   * Get memory usage in MB
   */
  getMemoryUsageMB() {
    let totalSize = 0;
    
    for (const entry of this.hotCache.values()) {
      totalSize += (entry.content?.length || 0) + (entry.htmlContent?.length || 0);
    }
    
    return totalSize / 1024 / 1024;
  }

  getContentSizeMB(textContent = '', htmlContent = '') {
    const textBytes = Buffer.byteLength(textContent || '', 'utf8');
    const htmlBytes = Buffer.byteLength(htmlContent || '', 'utf8');
    return (textBytes + htmlBytes) / 1024 / 1024;
  }

  getProcessMemorySnapshot() {
    const mem = process.memoryUsage();
    return {
      rssMB: Number((mem.rss / 1024 / 1024).toFixed(2)),
      heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMB: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
      externalMB: Number((mem.external / 1024 / 1024).toFixed(2)),
    };
  }

  logExtractionStep(bookId, title, step, extra = {}) {
    console.log(
      `[cacheBookContent][${bookId}] ${step}`,
      {
        title,
        ...extra,
        memory: this.getProcessMemorySnapshot(),
        ts: new Date().toISOString(),
      }
    );
  }

  /**
   * Get cached content with three-tier lookup
   */
  async getCachedContent(bookId, format = 'html') {
    const now = Date.now();

    // Tier 1: Hot cache (memory) - fastest
    if (this.hotCache.has(bookId)) {
      const entry = this.hotCache.get(bookId);
      if (now - entry.cachedAt < this.config.hotCacheTimeout) {
        this.stats.hotHits++;
        this.updateAccessTime(bookId, 'hot');
        console.log(`🔥 Hot cache hit for book: ${entry.metadata.title}`);
        return {
          content: format === 'html' ? entry.htmlContent : entry.content,
          chapterswithPageNo: entry.chapterswithPageNo || [],
          metadata: entry.metadata,
          source: 'hot-cache'
        };
      } else {
        console.log(`🕒 Hot cache expired for book: ${entry.metadata.title}`);
        this.hotCache.delete(bookId);
      }
    }

    // Tier 2: Warm cache (metadata) - medium speed
    if (this.warmCache.has(bookId)) {
      const entry = this.warmCache.get(bookId);
      if (now - entry.cachedAt < this.config.warmCacheTimeout) {
        this.stats.warmHits++;
        console.log(`🌡️ Warm cache hit, checking disk for: ${entry.metadata.title}`);
        // Load from disk cache if available
        const diskContent = await this.loadFromDiskCache(bookId, format);
        if (diskContent) {
          return diskContent;
        }
      } else {
        this.warmCache.delete(bookId);
      }
    }

    // Tier 3: Disk cache - slower but persistent
    const diskContent = await this.loadFromDiskCache(bookId, format);
    if (diskContent) {
      this.stats.diskHits++;
      console.log(`💾 Disk cache hit for book: ${diskContent.metadata.title}`);
      return diskContent;
    }

    this.stats.misses++;
    console.log(`❌ Cache miss for book ID: ${bookId}`);
    return null;
  }

  /**
   * Cache content with intelligent tier placement
   */
  async cacheBookContent(book, priority = 'normal', requestContext = null) {
    console.log('Start First loading of cacheBookContent.');
    const bookId = book._id.toString();
    const startTime = Date.now();
    const fileSizeMB = ((book.fileInfo?.fileSize || 0) / 1024 / 1024).toFixed(2);
    const extension = (book.fileInfo?.fileExtension || '').toLowerCase();
    
    try {
      this.logExtractionStep(bookId, book.title, 'start', {
        priority,
        filename: book.fileInfo?.filename,
        extension,
        fileSizeMB,
      });

      const filePath = await ensureLocalBookFile(book.fileInfo.filename, requestContext);
      console.log(`[cacheBookContent] Using file path: ${filePath}`);
      console.log(`📖 Extracting content for book: ${book.title} (Priority: ${priority})`);
      this.logExtractionStep(bookId, book.title, 'local-file-ready', { filePath });
      
      // Extract once for DOCX to avoid duplicate in-memory buffers.
      const isDocx = extension === '.docx';
      const numericFileSizeMB = (book.fileInfo.fileSize || 0) / 1024 / 1024;
      let textContent = '';
      let htmlContent = '';

      if (isDocx) {
        const useLowMemoryDocxPath = numericFileSizeMB > this.config.maxDocxHtmlExtractionSizeMB;
        this.logExtractionStep(bookId, book.title, 'docx-extraction-mode-selected', {
          useLowMemoryDocxPath,
          thresholdMB: this.config.maxDocxHtmlExtractionSizeMB,
        });

        if (useLowMemoryDocxPath) {
          console.log(
            `⚠️ Large DOCX detected (${numericFileSizeMB.toFixed(2)}MB). Using low-memory extraction path.`
          );
          const textStart = Date.now();
          textContent = await extractTextContent(filePath, book.fileInfo.fileExtension);
          this.logExtractionStep(bookId, book.title, 'text-extracted-low-memory', {
            elapsedMs: Date.now() - textStart,
            textLength: textContent.length,
          });

          const htmlStart = Date.now();
          htmlContent = this.textToHtml(textContent);
          this.logExtractionStep(bookId, book.title, 'html-derived-from-text', {
            elapsedMs: Date.now() - htmlStart,
            htmlLength: htmlContent.length,
          });
        } else {
          const htmlStart = Date.now();
          htmlContent = await extractHtmlContent(filePath, book.fileInfo.fileExtension);
          this.logExtractionStep(bookId, book.title, 'html-extracted-docx', {
            elapsedMs: Date.now() - htmlStart,
            htmlLength: htmlContent.length,
          });

          const textStart = Date.now();
          textContent = this.htmlToText(htmlContent);
          this.logExtractionStep(bookId, book.title, 'text-derived-from-html', {
            elapsedMs: Date.now() - textStart,
            textLength: textContent.length,
          });
        }
      } else {
        const textStart = Date.now();
        textContent = await extractTextContent(filePath, book.fileInfo.fileExtension);
        this.logExtractionStep(bookId, book.title, 'text-extracted-generic', {
          elapsedMs: Date.now() - textStart,
          textLength: textContent.length,
        });

        const htmlStart = Date.now();
        htmlContent = await extractHtmlContent(filePath, book.fileInfo.fileExtension);
        this.logExtractionStep(bookId, book.title, 'html-extracted-generic', {
          elapsedMs: Date.now() - htmlStart,
          htmlLength: htmlContent.length,
        });
      }

      const fileHash = await this.getFileHash(filePath);
      this.logExtractionStep(bookId, book.title, 'file-hash-generated', { fileHash });

      // Extract chapters/headings (move logic from extractHeadingsWithPageNumbers here)
      let chapterswithPageNo = [];
      try {
        const wordsPerPage = this.config.wordsPerPage || 500;
        chapterswithPageNo = this.estimateHeadingPagesFromHtml(htmlContent, wordsPerPage);
      } catch (e) {
        this.logExtractionStep(bookId, book.title, 'heading-estimation-failed', {
          error: e?.message,
        });
        chapterswithPageNo = [];
      }
      console.log(`Extracted chapters/headings for ${book.title}: ${JSON.stringify(chapterswithPageNo.length)}`);
      const extractionTime = Date.now() - startTime;
      this.stats.extractions++;
      const cacheEntry = {
        content: textContent,
        htmlContent: htmlContent,
        chapterswithPageNo: chapterswithPageNo,
        cachedAt: Date.now(),
        accessedAt: Date.now(),
        fileHash: fileHash,
        metadata: {
          bookId: bookId,
          title: book.title,
          author: book.author,
          fileSize: book.fileInfo.fileSize,
          totalWords: textContent.split(/\s+/).length,
          extractionTime: extractionTime
        }
      };

      this.logExtractionStep(bookId, book.title, 'cache-entry-created', {
        extractionTime,
        totalWords: cacheEntry.metadata.totalWords,
        chapters: chapterswithPageNo.length,
      });

      // Save to disk cache first
      const diskStart = Date.now();
      await this.saveToDiskCache(bookId, cacheEntry);
      this.logExtractionStep(bookId, book.title, 'disk-cache-saved', {
        elapsedMs: Date.now() - diskStart,
      });

      // Decide cache tier based on priority and memory usage
      const contentSizeMB = this.getContentSizeMB(textContent, htmlContent);
      const canPromoteToHot =
        contentSizeMB <= 15 &&
        this.getMemoryUsageMB() < this.config.maxMemoryUsageMB;

      this.logExtractionStep(bookId, book.title, 'cache-tier-decision', {
        contentSizeMB: Number(contentSizeMB.toFixed(2)),
        canPromoteToHot,
      });

      if (priority === 'high' && canPromoteToHot) {
        await this.promoteToHotCache(bookId, cacheEntry);
      } else if (canPromoteToHot) {
        await this.promoteToHotCache(bookId, cacheEntry);
      } else {
        // Add to warm cache (metadata only)
        this.addToWarmCache(bookId, cacheEntry.metadata);
        console.log(
          `🌡️ Kept in warm cache only for ${book.title} (content size: ${contentSizeMB.toFixed(2)}MB)`
        );
      }

      console.log(`✅ End First Content cached for: ${book.title} (${extractionTime}ms)`);
      this.logExtractionStep(bookId, book.title, 'completed', {
        totalElapsedMs: Date.now() - startTime,
      });
      return { textContent, htmlContent };
      
    } catch (error) {
      this.logExtractionStep(bookId, book.title, 'failed', {
        errorName: error?.name,
        errorMessage: error?.message,
        stack: error?.stack,
        totalElapsedMs: Date.now() - startTime,
      });
      console.error(`❌ Failed to cache content for ${book.title}:`, error);
      throw error;
    }
  }

  /**
   * Promote content to hot cache (memory)
   */
  async promoteToHotCache(bookId, cacheEntry) {
    // Check memory limits
    if (this.hotCache.size >= this.config.maxHotCacheSize || 
        this.getMemoryUsageMB() > this.config.maxMemoryUsageMB) {
      await this.evictFromHotCache();
    }

    this.hotCache.set(bookId, cacheEntry);
    this.addToWarmCache(bookId, cacheEntry.metadata);
    console.log(`🔥 Promoted to hot cache: ${cacheEntry.metadata.title}`);
  }

  /**
   * Add metadata to warm cache
   */
  addToWarmCache(bookId, metadata) {
    if (this.warmCache.size >= this.config.maxWarmCacheSize) {
      this.evictFromWarmCache();
    }

    this.warmCache.set(bookId, {
      metadata: metadata,
      cachedAt: Date.now(),
      accessedAt: Date.now()
    });
  }

  /**
   * Save content to disk cache
   */
  async saveToDiskCache(bookId, cacheEntry) {
    try {
      const cacheFile = path.join(this.diskCacheDir, `${bookId}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(cacheEntry));
      
      this.diskCache.set(bookId, {
        filePath: cacheFile,
        cachedAt: Date.now(),
        metadata: cacheEntry.metadata
      });

      // Clean up old disk cache if needed
      if (this.diskCache.size > this.config.maxDiskCacheSize) {
        await this.cleanupDiskCache();
      }
    } catch (error) {
      console.error(`Failed to save disk cache for ${bookId}:`, error);
    }
  }

  /**
   * Load content from disk cache
   */
  async loadFromDiskCache(bookId, format = 'html') {
    try {
      if (!this.diskCache.has(bookId)) return null;

      const diskEntry = this.diskCache.get(bookId);
      const now = Date.now();
      
      if (now - diskEntry.cachedAt > this.config.diskCacheTimeout) {
        await this.removeDiskCacheEntry(bookId);
        return null;
      }

      const cacheData = await fs.readFile(diskEntry.filePath, 'utf8');
      const entry = JSON.parse(cacheData);
      
      return {
        content: format === 'html' ? entry.htmlContent : entry.content,
        chapterswithPageNo: entry.chapterswithPageNo || [],
        metadata: entry.metadata,
        source: 'disk-cache'
      };
    } catch (error) {
      console.error(`Failed to load from disk cache for ${bookId}:`, error);
      return null;
    }
  }

  /**
   * Get paginated content with caching
   */
  async getPaginatedContent(bookId, page = 1, wordsPerPage = null, format = 'html') {
    console.log('Start getPaginatedContent');
    wordsPerPage = wordsPerPage || this.config.wordsPerPage;
    
    const cached = await this.getCachedContent(bookId, format);
    if (!cached) return null;

    const content = cached.content;

    let result;
    if (format === 'html') {
      result = this.paginateHtmlContent(content, page, wordsPerPage, cached.metadata, format);
    } else {
      result = this.paginateTextContent(content, page, wordsPerPage, cached.metadata, format);
    }
    // Use cached chapterswithPageNo if available
    let chapterswithPageNo = [];
    if (cached.chapterswithPageNo && Array.isArray(cached.chapterswithPageNo)) {
      chapterswithPageNo = cached.chapterswithPageNo;
    }
    console.log('Cached chapterswithPageNo length:', chapterswithPageNo.length);
    console.log('End getPaginatedContent');
    return {
      ...result,
      chapterswithPageNo
    };
    
  }

  /**
   * Extract all headings and the page number where each heading first appears
   * Uses paginateHtmlContent to iterate through all pages
   * Returns: [{ heading: 'Chapter 1', page: 3 }, ...]
   */
  async extractHeadingsWithPageNumbers(bookId, format = 'html') {
    const wordsPerPage = this.config.wordsPerPage || 500;
    // Get cached content (HTML)
    const cached = await this.getCachedContent(bookId, format);
    if (!cached || !cached.content) return [];
    // Get total pages
    const firstPage = this.paginateHtmlContent(cached.content, 1, wordsPerPage, cached.metadata, format);
    const totalPages = firstPage.totalPages;
    const headingMap = new Map();
    const headingRegex = /<(h[1-6])[^>]*>(.*?)<\/\1>/gi;
    for (let page = 1; page <= totalPages; page++) {
      const pageData = this.paginateHtmlContent(cached.content, page, wordsPerPage, cached.metadata, format);
      const html = pageData.content;
      let match;
      let matchCount = 0;
      const MAX_MATCHES = 1000;
      while ((match = headingRegex.exec(html)) !== null) {
        if (++matchCount > MAX_MATCHES) {
          console.warn('⚠️ Too many heading matches in one page, breaking to avoid infinite loop.');
          break;
        }
        const headingText = match[2].replace(/<[^>]+>/g, '').trim();
        if (headingText && !headingMap.has(headingText)) {
          headingMap.set(headingText, page);
        }
      }
    }
    // Convert to array with chapterName and pageNumber
    return Array.from(headingMap.entries()).map(([heading, page]) => ({ chapterName: heading, pageNumber: page }));
  }

  /**
   * Paginate HTML content
   */
  paginateHtmlContent(content, page, wordsPerPage, metadata, format = 'html') {
    const paragraphs = content.split(/<\/p>\s*<p[^>]*>|<\/div>\s*<div[^>]*>/i);
    const avgWordsPerParagraph = 50;
    const paragraphsPerPage = Math.max(1, Math.floor(wordsPerPage / avgWordsPerParagraph));
    
    const totalParagraphs = paragraphs.length;
    const totalPages = Math.ceil(totalParagraphs / paragraphsPerPage);
    
    const startParagraph = (page - 1) * paragraphsPerPage;
    const endParagraph = Math.min(startParagraph + paragraphsPerPage, totalParagraphs);
    
    const pageParagraphs = paragraphs.slice(startParagraph, endParagraph);
    const pageContent = pageParagraphs.join('</p><p>');
    const formattedContent = pageContent.startsWith('<') ? pageContent : `<p>${pageContent}</p>`;
    
    return {
      content: formattedContent,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: endParagraph < totalParagraphs,
      hasPrevPage: page > 1,
      format: format,
      title: metadata.title,
      book: {
        _id: metadata.bookId,
        title: metadata.title,
        author: metadata.author
      }
    };
  }

  /**
   * Paginate text content
   */
  paginateTextContent(content, page, wordsPerPage, metadata, format = 'text') {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const totalWords = words.length;
    const totalPages = Math.ceil(totalWords / wordsPerPage);
    
    const startWord = (page - 1) * wordsPerPage;
    const endWord = Math.min(startWord + wordsPerPage, totalWords);
    
    const pageWords = words.slice(startWord, endWord);
    const pageContent = pageWords.join(' ');
    
    return {
      content: pageContent,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: endWord < totalWords,
      hasPrevPage: page > 1,
      totalWords: totalWords,
      format: format,
      title: metadata.title,
      book: {
        _id: metadata.bookId,
        title: metadata.title,
        author: metadata.author
      }
    };
  }

  /**
   * Evict entries from hot cache (LRU)
   */
  async evictFromHotCache(count = 3) {
    const entries = Array.from(this.hotCache.entries());
    entries.sort((a, b) => a[1].accessedAt - b[1].accessedAt);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [bookId, entry] = entries[i];
      this.hotCache.delete(bookId);
      console.log(`🗑️ Evicted from hot cache: ${entry.metadata.title}`);
    }
  }

  /**
   * Evict entries from warm cache (LRU)
   */
  evictFromWarmCache(count = 10) {
    const entries = Array.from(this.warmCache.entries());
    entries.sort((a, b) => a[1].accessedAt - b[1].accessedAt);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [bookId] = entries[i];
      this.warmCache.delete(bookId);
    }
  }

  /**
   * Clean up old disk cache entries
   */
  async cleanupDiskCache() {
    const entries = Array.from(this.diskCache.entries());
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    
    const toRemove = entries.slice(0, Math.floor(this.config.maxDiskCacheSize * 0.1));
    
    for (const [bookId] of toRemove) {
      await this.removeDiskCacheEntry(bookId);
    }
  }

  /**
   * Remove disk cache entry
   */
  async removeDiskCacheEntry(bookId) {
    try {
      const diskEntry = this.diskCache.get(bookId);
      if (diskEntry) {
        await fs.unlink(diskEntry.filePath);
        this.diskCache.delete(bookId);
      }
    } catch (error) {
      console.error(`Failed to remove disk cache for ${bookId}:`, error);
    }
  }

  /**
   * Update access time for cache entry
   */
  updateAccessTime(bookId, tier) {
    const now = Date.now();
    
    if (tier === 'hot' && this.hotCache.has(bookId)) {
      this.hotCache.get(bookId).accessedAt = now;
    }
    
    if (this.warmCache.has(bookId)) {
      this.warmCache.get(bookId).accessedAt = now;
    }
  }

  /**
   * Preload popular books with intelligent prioritization
   */
  async preloadPopularBooks(books, maxPreload = 5) {
    console.log(`🚀 Intelligently preloading ${Math.min(maxPreload, books.length)} popular books...`);
    
    // Sort by popularity metrics
    const prioritized = books
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, maxPreload);
    
    for (const book of prioritized) {
      try {
        if (!await this.getCachedContent(book._id)) {
          await this.cacheBookContent(book, 'high');
        }
      } catch (error) {
        console.error(`Failed to preload ${book.title}:`, error.message);
      }
    }
    
    const stats = this.getCacheStats();
    console.log(`📊 Preload completed. Cache stats:`, stats.performance);
  }

  /**
   * Clear specific book cache
   */
  async clearBookCache(bookId) {
    let cleared = false;
    
    if (this.hotCache.has(bookId)) {
      this.hotCache.delete(bookId);
      cleared = true;
    }
    
    if (this.warmCache.has(bookId)) {
      this.warmCache.delete(bookId);
      cleared = true;
    }
    
    await this.removeDiskCacheEntry(bookId);
    
    if (cleared) {
      console.log(`🗑️ Cleared cache for book ID: ${bookId}`);
    }
    
    return cleared;
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats() {
    const hotMemoryMB = this.getMemoryUsageMB();
    const totalRequests = this.stats.hotHits + this.stats.warmHits + this.stats.diskHits + this.stats.misses;
    
    return {
      hotCache: {
        entries: this.hotCache.size,
        maxSize: this.config.maxHotCacheSize,
        memoryUsageMB: hotMemoryMB.toFixed(2),
        maxMemoryMB: this.config.maxMemoryUsageMB,
        utilizationPercent: ((this.hotCache.size / this.config.maxHotCacheSize) * 100).toFixed(1)
      },
      warmCache: {
        entries: this.warmCache.size,
        maxSize: this.config.maxWarmCacheSize,
        utilizationPercent: ((this.warmCache.size / this.config.maxWarmCacheSize) * 100).toFixed(1)
      },
      diskCache: {
        entries: this.diskCache.size,
        maxSize: this.config.maxDiskCacheSize,
        utilizationPercent: ((this.diskCache.size / this.config.maxDiskCacheSize) * 100).toFixed(1)
      },
      performance: {
        hitRate: totalRequests > 0 ? ((this.stats.hotHits + this.stats.warmHits + this.stats.diskHits) / totalRequests * 100).toFixed(2) + '%' : '0%',
        hotHits: this.stats.hotHits,
        warmHits: this.stats.warmHits,
        diskHits: this.stats.diskHits,
        misses: this.stats.misses,
        totalRequests: totalRequests,
        extractions: this.stats.extractions
      }
    };
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    const hotEntries = this.hotCache.size;
    const warmEntries = this.warmCache.size;
    const diskEntries = this.diskCache.size;
    
    this.hotCache.clear();
    this.warmCache.clear();
    
    // Clear disk cache
    for (const bookId of this.diskCache.keys()) {
      await this.removeDiskCacheEntry(bookId);
    }
    
    // Reset stats
    this.stats = {
      hotHits: 0,
      warmHits: 0,
      diskHits: 0,
      misses: 0,
      extractions: 0
    };
    
    console.log(`🗑️ All caches cleared: ${hotEntries} hot, ${warmEntries} warm, ${diskEntries} disk entries`);
  }

  /**
   * Get full book content for search purposes
   */
  async getFullBookContent(bookId) {
    try {
      // Check hot cache first
      const hotEntry = this.hotCache.get(bookId);
      if (hotEntry) {
        console.log(`🔥 Hot cache hit for full content: ${bookId}`);
        console.log('🔍 Hot cache entry properties:', Object.keys(hotEntry));
        console.log('📄 Has fullContent:', !!hotEntry.fullContent);
        
        // If fullContent exists, return it
        if (hotEntry.fullContent) {
          return hotEntry.fullContent;
        }
        
        // If no fullContent but has content, use that (this is the main content)
        if (hotEntry.content) {
          console.log('📝 Using content property as fullContent');
          return hotEntry.content;
        }
        
        console.log('❌ Hot cache entry has no usable content');
        return null;
      }

      // Check disk cache
      const diskPath = path.join(this.diskCacheDir, `${bookId}.json`);
      if (fsSync.existsSync(diskPath)) {
        console.log(`💾 Loading full content from disk cache: ${bookId}`);
        const diskEntry = JSON.parse(fsSync.readFileSync(diskPath, 'utf8'));
        console.log('🔍 Disk cache entry properties:', Object.keys(diskEntry));
        
        if (diskEntry) {
          let contentToReturn = null;
          
          // Try fullContent first, then content
          if (diskEntry.fullContent) {
            contentToReturn = diskEntry.fullContent;
          } else if (diskEntry.content) {
            contentToReturn = diskEntry.content;
            console.log('📝 Using content property from disk cache');
          }
          
          if (contentToReturn) {
            // Add to hot cache for future access
            this.addToHotCache(bookId, diskEntry);
            return contentToReturn;
          }
        }
        
        console.log('❌ Disk cache entry has no usable content');
      }

      // Need to load and extract full content
      console.log(`📖 Extracting full content for search: ${bookId}`);
      const Book = (await import('../src/models/Book.js')).default;
      const book = await Book.findById(bookId);
      
      if (!book) {
        throw new Error('Book not found');
      }

      const filePath = path.join(process.cwd(), book.filePath);
      
      if (!fsSync.existsSync(filePath)) {
        throw new Error('Book file not found');
      }

      const { extractTextContent } = await import('../src/utils/textExtractor.js');
      const fullContent = await extractTextContent(filePath, book.mimeType);

      // Cache the content
      const bookData = {
        fullContent,
        content: fullContent, // Store as both for compatibility
        extractedAt: new Date(),
        title: book.title,
        size: fullContent.length
      };

      // Add to caches
      this.addToHotCache(bookId, bookData);
      this.addToDiskCache(bookId, bookData);

      console.log(`✅ Full content extracted and cached: ${book.title} (${fullContent.length} chars)`);
      return fullContent;

    } catch (error) {
      console.error(`❌ Error getting full book content for ${bookId}:`, error.message);
      throw error;
    }
  }
}

// Create singleton instance
const optimizedCache = new OptimizedContentCache();

export default optimizedCache;