import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import Book from '../models/Book.js';
import Category from '../models/Category.js';
import ReadingProgress from '../models/ReadingProgress.js';
import { AppError, catchAsync, validationError } from '../middleware/errorHandler.js';
import { extractTextContent, getPaginatedContent, extractHtmlContent } from '../utils/textExtractor.js';
import optimizedCache from '../../utils/optimizedContentCache.js';
import { saveBookFile, getBookReadStream, streamToResponse, deleteBookFile } from '../../utils/bookStorage.js';

const normalizeSearchText = (input = '') => {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

// Upload a new book
export const uploadBook = catchAsync(async (req, res, next) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  if (!req.file) {
    return next(new AppError('Please upload a book file', 400));
  }

  const {
    title,
    author,
    description,
    language,
    tags = [],
    type = 'normal',
    metadata = {}
  } = req.body;

  try {
    // Save file via configured storage provider (local or catalyst)
    const filename = `${Date.now()}_${req.file.originalname}`;
    await saveBookFile(filename, req.file.buffer, req.file.mimetype, req);

    // Create book document
    const book = await Book.create({
      type,
      title,
      author,
      description,
      language: language.toLowerCase(),
      // category removed
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      fileInfo: {
        originalName: req.file.originalname,
        filename,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileExtension: getFileExtension(req.file.originalname)
      },
      metadata: {
        totalPages: metadata.totalPages || 0,
        isbn: metadata.isbn || undefined,
        publishedDate: metadata.publishedDate || undefined,
        publisher: metadata.publisher || undefined,
        edition: metadata.edition || undefined
      },
      uploadInfo: {
        uploadedBy: req.user.id,
        uploadDate: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Book uploaded successfully',
      data: {
        book
      }
    });
  } catch (error) {
    console.error('[uploadBook] Error uploading book file:', error);
    return next(new AppError(`Error uploading book file: ${error.message}`, 500));
  }
});

// Get all books with pagination and filtering
export const getAllBooks = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 12,
    language,
    category,
    subcategory,
    subSubcategory,
    author,
    sort = '-uploadInfo.uploadDate',
    search
  } = req.query;

  // Build filter
  const filter = { isActive: true };
  
  if (language) filter.language = language.toLowerCase();
  // if (category) filter.category = category; // category removed
  if (subcategory) filter.subcategory = subcategory;
  if (subSubcategory) filter.subSubcategory = subSubcategory;
  if (author) filter.author = { $regex: author, $options: 'i' };
  
  // Add text search if search query provided
  if (search) {
    filter.$text = { $search: search };
  }

  // Get user's access level
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    filter.$or = [
      { 'accessControl.isPublic': true },
      { 'accessControl.accessLevel': 'public' },
      ...(req.user ? [{ 'accessControl.allowedRoles': userRole }] : [])
    ];
  }

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const books = await Book.find(filter)
    .populate('uploadInfo.uploadedBy', 'username profile.firstName profile.lastName')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    // .select('-fileInfo.gridfsId');

  const total = await Book.countDocuments(filter);

  res.json({
    success: true,
    data: {
      books,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBooks: total,
        hasNextPage: skip + books.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
});

// Get a specific book by ID
export const getBookById = catchAsync(async (req, res, next) => {
  const book = await Book.findOne({ 
    _id: req.params.id, 
    isActive: true 
  })
    .populate('uploadInfo.uploadedBy', 'username profile.firstName profile.lastName')
    // .select('-fileInfo.gridfsId');

  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  // Check access permissions
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    const hasAccess = book.accessControl.isPublic || 
                     book.accessControl.accessLevel === 'public' ||
                     (req.user && book.accessControl.allowedRoles.includes(userRole));
    
    if (!hasAccess) {
      return next(new AppError('Access denied to this book', 403));
    }
  }

  // Increment view count
  await book.incrementView();

  // Get user's reading progress if authenticated
  let readingProgress = null;
  if (req.user) {
    readingProgress = await ReadingProgress.findOne({
      userId: req.user.id,
      bookId: book._id
    });
  }

  res.json({
    success: true,
    data: {
      book,
      readingProgress
    }
  });
});

// Stream book content
export const getBookContent = catchAsync(async (req, res, next) => {
  const book = await Book.findOne({ 
    _id: req.params.id, 
    isActive: true 
  });

  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  // Check access permissions
  const userRole = req.user.role;
  if (userRole !== 'admin') {
    const hasAccess = book.accessControl.isPublic || 
                     book.accessControl.accessLevel === 'public' ||
                     book.accessControl.allowedRoles.includes(userRole);
    
    if (!hasAccess) {
      return next(new AppError('Access denied to this book', 403));
    }
  }

  try {
    // Set response headers and stream file from configured storage provider
    res.set({
      'Content-Type': book.fileInfo.mimeType,
      'Content-Disposition': `inline; filename="${book.fileInfo.originalName}"`,
      'Cache-Control': 'private, max-age=3600'
    });

    const readStream = await getBookReadStream(book.fileInfo.filename, req);
    
    readStream.on('error', (error) => {
      console.error('File read error:', error);
      if (!res.headersSent) {
        return next(new AppError('Error streaming book content', 500));
      }
    });

    // Increment download count
    await book.incrementDownload();

    streamToResponse(readStream, res);
  } catch (error) {
    return next(new AppError('Error accessing book file', 500));
  }
});

// Get readable text content from book
export const getBookText = catchAsync(async (req, res, next) => {
  console.log('--- [getBookText] ---');
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);
  console.log('Request user:', req.user ? req.user._id || req.user.id : 'guest');
  const book = await Book.findOne({ 
    _id: req.params.id, 
    isActive: true 
  });

  if (!book) {
    console.log('[getBookText] Book not found:', req.params.id);
    return next(new AppError('Book not found', 404));
  }

  // Check access permissions
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    const hasAccess = book.accessControl.isPublic || 
                     book.accessControl.accessLevel === 'public' ||
                     (req.user && book.accessControl.allowedRoles.includes(userRole));
    if (!hasAccess) {
      console.log('[getBookText] Access denied for user:', req.user ? req.user._id || req.user.id : 'guest');
      return next(new AppError('Access denied to this book', 403));
    }
  }

  try {
    console.log('[getBookText] Passed access control checks.');
    // Get query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const format = req.query.format || 'html'; // 'text' or 'html'

    // Always use backend default wordsPerPage
    const wordsPerPage = optimizedCache.config.wordsPerPage || 500;

    console.log(`[getBookText] Getting book text content for: ${book.title} (page: ${page}, format: ${format}, wordsPerPage: ${wordsPerPage})`);

    // Try to get cached content first
    let paginatedContent = await optimizedCache.getPaginatedContent(
      book._id.toString(), 
      page, 
      wordsPerPage, 
      format
    );

    if (!paginatedContent) {
      // Cache miss - extract and cache the content
      console.log(`[getBookText] Cache miss for book ${book.title}, extracting content...`);
      try {
        await optimizedCache.cacheBookContent(book, 'high', req);
        // Now get the paginated content
        paginatedContent = await optimizedCache.getPaginatedContent(
          book._id.toString(), 
          page, 
          wordsPerPage, 
          format
        );
      } catch (error) {
        console.error('[getBookText] Content extraction failed:', error);
        return next(new AppError('Failed to extract book content', 500));
      }
    }

    if (!paginatedContent) {
      console.log('[getBookText] Failed to process book content for:', book.title, 'page:', page);
      return next(new AppError('Failed to process book content', 500));
    }

    // Increment view count if first page
    if (page === 1) {
      await book.incrementView();
    }

    // Log cache performance
    const cacheStats = optimizedCache.getCacheStats();
    console.log(`[getBookText] Served page ${page} for ${book.title} (Hit rate: ${cacheStats.performance.hitRate})`);
    console.log('[getBookText] Responding with paginatedContent:', Object.keys(paginatedContent));

    res.json({
      success: true,
      data: paginatedContent
    });

  } catch (error) {
    console.error('[getBookText] Error extracting book text:', error);
    return next(new AppError('Error reading book content. This file format may not be supported for text extraction.', 500));
  }
});

// Update book metadata (admin only)
export const updateBook = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  const book = await Book.findById(req.params.id);
  
  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  const allowedFields = [
    'title', 'author', 'description', 'language', 'tags',
    'metadata', 'accessControl', 'type'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Set modified info
  updates['uploadInfo.lastModified'] = new Date();
  updates['uploadInfo.modifiedBy'] = req.user.id;

  const updatedBook = await Book.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('uploadInfo.uploadedBy uploadInfo.modifiedBy', 'username profile.firstName profile.lastName');

  // Clear cache for updated book
  await optimizedCache.clearBookCache(req.params.id);
  console.log(`🗑️ Cache cleared for updated book: ${updatedBook.title}`);

  res.json({
    success: true,
    message: 'Book updated successfully',
    data: {
      book: updatedBook
    }
  });
});

// Delete book (admin only)
export const deleteBook = catchAsync(async (req, res, next) => {
  console.log(`[DELETE] Book request received for ID: ${req.params.id}`);
  const book = await Book.findById(req.params.id);
  if (book) {
    console.log(`[DELETE] Book found: ${book.title} (${book._id})`);
  } else {
    console.log(`[DELETE] Book not found for ID: ${req.params.id}`);
  }
  
  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  console.log('[DELETE] Removing book file from configured storage provider...');
  await deleteBookFile(book.fileInfo.filename, req);

  // Soft delete in books collection
  book.isActive = false;
  book.uploadInfo.lastModified = new Date();
  book.uploadInfo.modifiedBy = req.user.id;
  await book.save();

  // Unlink this book from all categories where it is referenced.
  const unlinkResult = await Category.updateMany(
    { books: book._id },
    { $pull: { books: book._id } }
  );
  const unlinkedCategoryCount = unlinkResult.modifiedCount || 0;
  console.log(`[DELETE] Unlinked book from ${unlinkedCategoryCount} categories`);

  // Clear cache for deleted book
  await optimizedCache.clearBookCache(req.params.id);
  console.log(`🗑️ Cache cleared for deleted book: ${book.title}`);
  console.log(`[DELETE] Book deletion process completed for ID: ${req.params.id}`);

  res.json({
    success: true,
    message: 'Book deleted successfully',
    data: {
      deletedBookId: String(book._id),
      deletedFilename: book.fileInfo.filename,
      unlinkedCategoryCount,
    }
  });
});

// Search books
export const searchBooks = catchAsync(async (req, res, next) => {
  const {
    q: query,
    language,
    category,
    limit = 20,
    page = 1
  } = req.query;

  if (!query) {
    return next(new AppError('Search query is required', 400));
  }

  const filter = {
    $text: { $search: query },
    isActive: true
  };

  if (language) filter.language = language.toLowerCase();
  if (category) filter.category = category;

  // Apply access control
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    filter.$or = [
      { 'accessControl.isPublic': true },
      { 'accessControl.accessLevel': 'public' },
      ...(req.user ? [{ 'accessControl.allowedRoles': userRole }] : [])
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const books = await Book.find(filter)
    .select('title author language description statistics')
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Book.countDocuments(filter);

  res.json({
    success: true,
    data: {
      books,
      query,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalResults: total
      }
    }
  });
});

// Get books by language
export const getBooksByLanguage = catchAsync(async (req, res, next) => {
  const { language } = req.params;
  const { page = 1, limit = 12, category, sort = '-uploadInfo.uploadDate' } = req.query;

  const filter = { 
    language: language.toLowerCase(), 
    isActive: true 
  };
  
  if (category) filter.category = category;

  // Apply access control
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    filter.$or = [
      { 'accessControl.isPublic': true },
      { 'accessControl.accessLevel': 'public' },
      ...(req.user ? [{ 'accessControl.allowedRoles': userRole }] : [])
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const books = await Book.find(filter)
    .populate('uploadInfo.uploadedBy', 'username')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    // .select('-fileInfo.gridfsId');

  const total = await Book.countDocuments(filter);

  res.json({
    success: true,
    data: {
      books,
      language,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBooks: total
      }
    }
  });
});

// Get books by category
export const getBooksByCategory = catchAsync(async (req, res, next) => {
  const { category } = req.params;
  const { page = 1, limit = 12, language, sort = '-uploadInfo.uploadDate' } = req.query;

  const filter = { category, isActive: true };
  
  if (language) filter.language = language.toLowerCase();

  // Apply access control
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    filter.$or = [
      { 'accessControl.isPublic': true },
      { 'accessControl.accessLevel': 'public' },
      ...(req.user ? [{ 'accessControl.allowedRoles': userRole }] : [])
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const books = await Book.find(filter)
    .populate('uploadInfo.uploadedBy', 'username')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    // .select('-fileInfo.gridfsId');

  const total = await Book.countDocuments(filter);

  res.json({
    success: true,
    data: {
      books,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBooks: total
      }
    }
  });
});

// Get books by author
export const getBooksByAuthor = catchAsync(async (req, res, next) => {
  const { author } = req.params;
  const { page = 1, limit = 12, language, sort = '-uploadInfo.uploadDate' } = req.query;

  const filter = { 
    author: { $regex: author, $options: 'i' }, 
    isActive: true 
  };
  
  if (language) filter.language = language.toLowerCase();

  // Apply access control
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    filter.$or = [
      { 'accessControl.isPublic': true },
      { 'accessControl.accessLevel': 'public' },
      ...(req.user ? [{ 'accessControl.allowedRoles': userRole }] : [])
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const books = await Book.find(filter)
    .populate('uploadInfo.uploadedBy', 'username')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    // .select('-fileInfo.gridfsId');

  const total = await Book.countDocuments(filter);

  res.json({
    success: true,
    data: {
      books,
      author,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBooks: total
      }
    }
  });
});

// Get hierarchical tree of categories -> subcategories -> sub-subcategories -> books
export const getBooksHierarchyTree = catchAsync(async (req, res, next) => {
  const { language } = req.query;

  const matchFilter = { isActive: true };
  if (language) {
    matchFilter.language = language.toLowerCase();
  }

  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    matchFilter.$or = [
      { 'accessControl.isPublic': true },
      { 'accessControl.accessLevel': 'public' },
      ...(req.user ? [{ 'accessControl.allowedRoles': userRole }] : [])
    ];
  }

  const books = await Book.find(matchFilter)
    .select('_id title author language category subcategory subSubcategory type uploadInfo.uploadDate')
    .sort({ category: 1, subcategory: 1, subSubcategory: 1, title: 1 })
    .lean();

  const treeMap = new Map();

  books.forEach((book) => {
    const categoryName = (book.category || 'Uncategorized').trim();
    const subcategoryName = (book.subcategory || 'General').trim() || 'General';
    const subSubcategoryName = (book.subSubcategory || '').trim();

    if (!treeMap.has(categoryName)) {
      treeMap.set(categoryName, {
        name: categoryName,
        subcategories: new Map(),
      });
    }

    const categoryNode = treeMap.get(categoryName);

    if (!categoryNode.subcategories.has(subcategoryName)) {
      categoryNode.subcategories.set(subcategoryName, {
        name: subcategoryName,
        subSubcategories: new Map(),
        books: [],
      });
    }

    const subcategoryNode = categoryNode.subcategories.get(subcategoryName);

    if (subSubcategoryName) {
      if (!subcategoryNode.subSubcategories.has(subSubcategoryName)) {
        subcategoryNode.subSubcategories.set(subSubcategoryName, {
          name: subSubcategoryName,
          books: [],
        });
      }

      subcategoryNode.subSubcategories.get(subSubcategoryName).books.push({
        _id: book._id,
        title: book.title,
        author: book.author,
        type: book.type,
        language: book.language,
      });
    } else {
      subcategoryNode.books.push({
        _id: book._id,
        title: book.title,
        author: book.author,
        type: book.type,
        language: book.language,
      });
    }
  });

  const tree = Array.from(treeMap.values()).map((categoryNode) => ({
    name: categoryNode.name,
    subcategories: Array.from(categoryNode.subcategories.values()).map((subcategoryNode) => ({
      name: subcategoryNode.name,
      books: subcategoryNode.books,
      subSubcategories: Array.from(subcategoryNode.subSubcategories.values()),
    })),
  }));

  res.json({
    success: true,
    data: {
      tree,
      totalBooks: books.length,
    },
  });
});

// Helper function to get file extension
function getFileExtension(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
}

// Cache Management Endpoints (Admin only)

// Get cache statistics
export const getCacheStats = catchAsync(async (req, res, next) => {
  const stats = optimizedCache.getCacheStats();
  
  res.json({
    success: true,
    data: {
      cache: stats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  });
});

// Clear cache for specific book
export const clearBookCache = catchAsync(async (req, res, next) => {
  const bookId = req.params.id;
  const cleared = await optimizedCache.clearBookCache(bookId);
  
  res.json({
    success: true,
    message: cleared ? 'Cache cleared successfully' : 'No cache found for this book',
    data: { bookId, cleared }
  });
});

// Clear all cache
export const clearAllCache = catchAsync(async (req, res, next) => {
  await optimizedCache.clearAllCaches();
  
  res.json({
    success: true,
    message: 'All cache cleared successfully'
  });
});

// Preload popular books into cache
export const preloadCache = catchAsync(async (req, res, next) => {
  const { limit = 5 } = req.query;
  
  // Get most popular books
  const popularBooks = await Book.find({ isActive: true })
    .sort({ viewCount: -1 })
    .limit(parseInt(limit))
    .lean();
  
  // Start background preload (don't wait for completion)
  optimizedCache.preloadPopularBooks(popularBooks, parseInt(limit)).catch(error => {
    console.error('Background preload error:', error);
  });
  
  res.json({
    success: true,
    message: `Started preloading ${popularBooks.length} popular books`,
    data: {
      booksToPreload: popularBooks.map(book => ({
        id: book._id,
        title: book.title,
        viewCount: book.viewCount
      }))
    }
  });
});

// ...existing code...

// Get all books (id, title, author only) for dropdowns
export const getBookList = catchAsync(async (req, res, next) => {
  const books = await Book.find({ isActive: true }).select('_id title author').sort({ title: 1 });
  console.log('[getBookList] Book count:', books.length);
  if (books.length > 0) {
    console.log('[getBookList] First book:', books[0]);
  }
  res.json({ success: true, books });
});

// Search within a specific book
export const searchInBook = catchAsync(async (req, res, next) => {
  console.log('🔍 Search endpoint called for book:', req.params.id, 'query:', req.query.q);
  
  const book = await Book.findOne({ 
    _id: req.params.id, 
    isActive: true 
  });

  if (!book) {
    console.log('❌ Book not found:', req.params.id);
    return next(new AppError('Book not found', 404));
  }

  // Check access permissions
  const userRole = req.user?.role || 'guest';
  if (userRole !== 'admin') {
    const hasAccess = book.accessControl.isPublic || 
                     book.accessControl.accessLevel === 'public' ||
                     (req.user && book.accessControl.allowedRoles.includes(userRole));
    
    if (!hasAccess) {
      return next(new AppError('Access denied to this book', 403));
    }
  }

  const searchQuery = req.query.q;
  const limit = parseInt(req.query.limit) || 100; // Limit results to 100 by default
  const maxLimit = 500; // Maximum allowed limit
  
  if (!searchQuery || searchQuery.trim() === '') {
    return res.json({
      success: true,
      data: {
        results: [],
        totalMatches: 0,
        query: searchQuery,
        limit: 0,
        hasMore: false
      }
    });
  }

  try {
    console.log(`🔍 Searching in book: ${book.title} for: "${searchQuery}"`);
    
    // Get full book content from optimized cache
    // console.log('📖 Attempting to get full book content...');
    // const fullContent = await optimizedCache.getFullBookContent(book._id.toString());
    // console.log('📄 Full content result:', fullContent ? `${fullContent.length} characters` : 'null/undefined');
    
    // if (!fullContent) {
    //   console.log('❌ Book content not available for search');
    //   return next(new AppError('Book content not available for search', 404));
    // }

    // Perform search across full content
    const results = [];
    const normalizedSearchQuery = normalizeSearchText(searchQuery);
    
    // Get the same pagination logic as used by getPaginatedContent API
    const cached = await optimizedCache.getCachedContent(book._id.toString(), 'html');
    if (!cached || !cached.content) {
      console.log('❌ No cached content available for search mapping');
      return next(new AppError('Book content not available for search mapping', 404));
    }
    
    // Use same pagination logic as the API to ensure page numbers match
    const htmlContent = cached.content;
    const paragraphs = htmlContent.split(/<\/p>\s*<p[^>]*>|<\/div>\s*<div[^>]*>/i);
    const avgWordsPerParagraph = 50;
    const wordsPerPage = 500;
    const paragraphsPerPage = Math.max(1, Math.floor(wordsPerPage / avgWordsPerParagraph));
    const totalPages = Math.ceil(paragraphs.length / paragraphsPerPage);
    
    console.log(`🔍 Search pagination info: ${paragraphs.length} paragraphs, ${paragraphsPerPage} per page, ${totalPages} total pages`);
    
    // Search through each page using the same pagination as the API
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const startParagraph = (pageNum - 1) * paragraphsPerPage;
      const endParagraph = Math.min(startParagraph + paragraphsPerPage, paragraphs.length);
      const pageParagraphs = paragraphs.slice(startParagraph, endParagraph);
      // For each paragraph, search for matches and record paragraph index
      pageParagraphs.forEach((paragraph, localParagraphIndex) => {
        const cleanParagraph = paragraph
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        const normalizedParagraph = normalizeSearchText(cleanParagraph);
        // Split paragraph into sentences (simple split on . ! ?)
        const sentenceRegex = /[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g;
        const sentences = cleanParagraph.match(sentenceRegex) || [cleanParagraph];
        sentences.forEach((sentence, sentenceIdx) => {
          const normalizedSentence = normalizeSearchText(sentence);
          let searchIndex = 0;
          let matchCount = 0;
          const MAX_MATCHES_PER_SENTENCE = 1000;
          while (true) {
            if (matchCount++ > MAX_MATCHES_PER_SENTENCE) {
              console.warn('⚠️ Too many matches in one sentence, breaking to avoid infinite loop.');
              break;
            }
            const foundIndex = normalizedSentence.indexOf(normalizedSearchQuery, searchIndex);
            if (foundIndex === -1) break;
            // Context is just the sentence
            const beforeContext = sentence.substring(0, foundIndex);
            const matchText = sentence.substring(foundIndex, foundIndex + normalizedSearchQuery.length);
            const afterContext = sentence.substring(foundIndex + normalizedSearchQuery.length);
            // Helper function to clean HTML tags for display
            const cleanHtml = (htmlString) => {
              return htmlString
                .replace(/<[^>]*>/g, '') // Remove all HTML tags
                .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
                .replace(/&amp;/g, '&') // Replace HTML entities
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .trim();
            };
            results.push({
              pageNumber: pageNum, // Now matches API pagination
              match: cleanHtml(matchText),
              beforeContext: cleanHtml(beforeContext),
              afterContext: cleanHtml(afterContext),
              context: cleanHtml(sentence),
              fullContext: cleanHtml(sentence),
              paragraphIndex: startParagraph + localParagraphIndex,
              paragraphText: cleanHtml(cleanParagraph),
              sentenceIndex: sentenceIdx
            });
            searchIndex = foundIndex + normalizedSearchQuery.length;
          }
        });
      });
    }
    
    console.log(`✅ Found ${results.length} total matches for "${searchQuery}" in ${book.title}`);
    
    // Apply limit to results
    const actualLimit = Math.min(limit, maxLimit);
    const limitedResults = results.slice(0, actualLimit);
    const hasMore = results.length > actualLimit;
    
    console.log(`📊 Returning ${limitedResults.length} of ${results.length} matches (limit: ${actualLimit})`);
    
    res.json({
      success: true,
      data: {
        results: limitedResults,
        totalMatches: results.length,
        returnedMatches: limitedResults.length,
        query: searchQuery,
        bookTitle: book.title,
        limit: actualLimit,
        hasMore: hasMore
      }
    });

  } catch (error) {
    console.error('Error searching in book:', error);
    return next(new AppError('Error searching book content', 500));
  }
});