import express from 'express';
import categoriesController from '../controllers/categories.js';
const router = express.Router();

// GET /api/categories/tree?parentId=&lang=
router.get('/tree', categoriesController.getCategoryTree);


// GET /api/categories/:id/books
router.get('/:id/books', categoriesController.getCategoryBooks);

// POST /api/categories/:id/link-book
router.post('/:id/link-book', categoriesController.linkBookToCategory);

export default router;
