import { extractTextContent, extractHtmlContent } from '../src/utils/textExtractor.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ContentCache {
  constructor() {
    this.cache = new Map(); // Map<bookId, {content, htmlContent, extractedAt, fileHash}>
    this.maxCacheSize = 50; // Maximum number of books to cache
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache timeout
  }

  /**
   * Generate a cache key for a book
   */
  getCacheKey(bookId) {
    return `book_${bookId}`;
  }

  /**
   * Check if content is cached and still valid
   */
  isCached(bookId) {
    const key = this.getCacheKey(bookId);
    const cached = this.cache.get(key);
    
    if (!cached) return false;
    
    // Check if cache has expired
    const now = Date.now();
    if (now - cached.extractedAt > this.cacheTimeout) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cached content for a book
   */
  getCachedContent(bookId, format = 'html') {
    const key = this.getCacheKey(bookId);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    return {
      content: format === 'html' ? cached.htmlContent : cached.content,
      extractedAt: cached.extractedAt,
      format: format
    };
  }

  /**
   * Cache content for a book
   */
  async cacheBookContent(book) {
    const key = this.getCacheKey(book._id);
    
    try {
      console.log(`Extracting and caching content for book: ${book.title}`);
      const startTime = Date.now();
      
      const filePath = path.join(__dirname, '../uploads/books', book.fileInfo.filename);
      
      // Extract both text and HTML content
      const textContent = await extractTextContent(filePath, book.fileInfo.fileExtension);
      const htmlContent = await extractHtmlContent(filePath, book.fileInfo.fileExtension);
      
      const extractionTime = Date.now() - startTime;
      console.log(`Content extraction completed in ${extractionTime}ms for ${book.title}`);
      
      // Manage cache size - remove oldest entries if cache is full
      if (this.cache.size >= this.maxCacheSize) {
        this.evictOldestEntries(5); // Remove 5 oldest entries
      }
      
      // Cache the content
      this.cache.set(key, {
        content: textContent,
        htmlContent: htmlContent,
        extractedAt: Date.now(),
        bookId: book._id,
        title: book.title,
        fileSize: book.fileInfo.fileSize
      });
      
      console.log(`Content cached for book: ${book.title}. Cache size: ${this.cache.size}`);
      
      return { textContent, htmlContent };
    } catch (error) {
      console.error(`Failed to cache content for book ${book.title}:`, error);
      throw error;
    }
  }

  /**
   * Get paginated content from cache
   */
  getPaginatedContent(bookId, page = 1, wordsPerPage = 500, format = 'html') {
    const cached = this.getCachedContent(bookId, format);
    if (!cached) return null;
    
    const content = cached.content;
    
    if (format === 'html') {
      // For HTML content, split by paragraphs for better formatting
      const paragraphs = content.split(/<\/p>\s*<p[^>]*>|<\/div>\s*<div[^>]*>|<\/li>\s*<li[^>]*>/i);
      const totalParagraphs = paragraphs.length;
      
      // Calculate paragraphs per page (roughly equivalent to wordsPerPage)
      const avgWordsPerParagraph = 50; // Estimate
      const paragraphsPerPage = Math.max(1, Math.floor(wordsPerPage / avgWordsPerParagraph));
      
      const startParagraph = (page - 1) * paragraphsPerPage;
      const endParagraph = Math.min(startParagraph + paragraphsPerPage, totalParagraphs);
      
      const pageParagraphs = paragraphs.slice(startParagraph, endParagraph);
      const pageContent = pageParagraphs.join('</p><p>');
      
      // Wrap in proper HTML tags if needed
      const formattedContent = pageContent.startsWith('<') ? pageContent : `<p>${pageContent}</p>`;
      
      return {
        content: formattedContent,
        currentPage: page,
        totalPages: Math.ceil(totalParagraphs / paragraphsPerPage),
        hasNextPage: endParagraph < totalParagraphs,
        hasPrevPage: page > 1,
        totalParagraphs: totalParagraphs,
        format: format
      };
    } else {
      // For text content, split by words
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
        format: format
      };
    }
  }

  /**
   * Remove oldest entries from cache
   */
  evictOldestEntries(count = 1) {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].extractedAt - b[1].extractedAt);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key, value] = entries[i];
      this.cache.delete(key);
      console.log(`Evicted cached content for book: ${value.title}`);
    }
  }

  /**
   * Clear cache for a specific book
   */
  clearBookCache(bookId) {
    const key = this.getCacheKey(bookId);
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`Cleared cache for book ID: ${bookId}`);
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`Cleared all cache. Removed ${size} entries.`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + (entry.content?.length || 0) + (entry.htmlContent?.length || 0), 0);
    
    return {
      totalEntries: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      totalContentSize: totalSize,
      totalContentSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.extractedAt)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.extractedAt)) : null
    };
  }

  /**
   * Preload content for multiple books (background operation)
   */
  async preloadBooks(books) {
    console.log(`Starting background preload for ${books.length} books...`);
    
    for (const book of books) {
      try {
        if (!this.isCached(book._id)) {
          await this.cacheBookContent(book);
          // Add small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to preload book ${book.title}:`, error.message);
        // Continue with other books
      }
    }
    
    console.log(`Background preload completed. Cache stats:`, this.getCacheStats());
  }
}

// Create singleton instance
const contentCache = new ContentCache();

export default contentCache;