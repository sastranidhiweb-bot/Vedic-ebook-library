import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  uploadBook,
  getAllBooks,
  getBookById,
  getBookContent,
  getBookText,
  updateBook,
  deleteBook,
  searchBooks,
  searchInBook,
  getBooksByLanguage,
  getBooksByCategory,
  getBooksByAuthor,
  getBooksHierarchyTree,
  getCacheStats,
  clearBookCache,
  clearAllCache,
  preloadCache
} from '../controllers/books.js';

import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { validateBookUpload, validateBookSearch } from '../middleware/validation.js';

const router = express.Router();

// Configure multer for memory storage (we'll handle GridFS manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/epub+zip'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and EPUB files are allowed.'), false);
    }
  }
});

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all books with pagination and filtering
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [english, telugu, sanskrit]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 */

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book details
 *       404:
 *         description: Book not found
 */

/**
 * @swagger
 * /api/books/{id}/content:
 *   get:
 *     summary: Stream book content (Protected)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book file stream
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Upload new book (Admin only)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               book:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [english, telugu, sanskrit]
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Book uploaded successfully
 *       403:
 *         description: Admin access required
 */

// Public routes (no authentication required)
import { getBookList } from '../controllers/books.js';
router.get('/list', optionalAuth, getBookList);
router.get('/', optionalAuth, getAllBooks);
router.get('/search', optionalAuth, searchBooks);
router.get('/language/:language', optionalAuth, getBooksByLanguage);
router.get('/category/:category', optionalAuth, getBooksByCategory);
router.get('/author/:author', optionalAuth, getBooksByAuthor);
router.get('/tree', optionalAuth, getBooksHierarchyTree);

// Protected content routes (more specific routes should come first)
router.get('/:id/content', authenticate, getBookContent);
router.get('/:id/text', optionalAuth, getBookText);
router.get('/:id/search', optionalAuth, searchInBook);

// Book by ID route (this should come last among the /:id routes)
router.get('/:id', optionalAuth, getBookById);

// Admin routes (require authentication and admin role)
router.post('/', authenticate, requireAdmin, upload.single('book'), validateBookUpload, uploadBook);
router.put('/:id', authenticate, requireAdmin, validateBookUpload, updateBook);
router.delete('/:id', authenticate, requireAdmin, deleteBook);

// Cache management routes (admin only)
router.get('/cache/stats', authenticate, requireAdmin, getCacheStats);
router.post('/cache/preload', authenticate, requireAdmin, preloadCache);
router.delete('/cache/clear', authenticate, requireAdmin, clearAllCache);
router.delete('/:id/cache', authenticate, requireAdmin, clearBookCache);

export default router;