import Book from '../models/Book.js'; // <-- Move this to the top
import Category from '../models/Category.js';

// Fetch category tree (lazy loading, i18n)
const getCategoryTree = async (req, res) => {
  try {
    const { parentId, lang = 'en' } = req.query;
    let filter = {};
    if (parentId) filter.parent = parentId;
    else filter.parent = null;

    const categories = await Category.find(filter).lean();
    // For each category, fetch its immediate children as full objects
    async function populateChildren(category, lang) {
      const childrenObjs = await Category.find({ parent: category._id }).lean();
      // Populate books as full documents
      let books = [];
      if (category.books && category.books.length > 0) {
        books = await Book.find({ _id: { $in: category.books } }).lean();
      }
      return {
        _id: category._id,
        name: category.translations && category.translations[lang] ? category.translations[lang] : category.name,
        type: category.type,
        children: await Promise.all(childrenObjs.map(child => populateChildren(child, lang))),
        books,
        description: category.description,
      };
    }
    const mapped = await Promise.all(categories.map(cat => populateChildren(cat, lang)));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
  }
};

// Fetch books for a leaf category
const getCategoryBooks = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).populate('books').lean();
    if (!category || category.type !== 'book-list') {
      return res.status(404).json({ error: 'Category not found or not a leaf node' });
    }
    res.json(category.books || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books', details: err.message });
  }
};


// Link a book to a category (leaf node)
const linkBookToCategory = async (req, res) => {
  try {
    const { id } = req.params; // category id
    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: 'bookId is required' });
    }
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    // Only allow linking to leaf nodes (no children or type === 'book-list')
    if ((category.children && category.children.length > 0) || category.type !== 'book-list') {
      return res.status(400).json({ error: 'Can only link books to leaf (book-list) categories' });
    }
    // Prevent duplicate linking
    if (category.books.includes(bookId)) {
      return res.status(409).json({ error: 'Book already linked to this category' });
    }
    category.books.push(bookId);
    await category.save();
    res.json({ success: true, message: 'Book linked to category', category });
  } catch (err) {
    res.status(500).json({ error: 'Failed to link book', details: err.message });
  }
};

// Unlink a book from a category (leaf node)
const unlinkBookFromCategory = async (req, res) => {
  try {
    const { id } = req.params; // category id
    const bookId = req.body?.bookId || req.query?.bookId;

    if (!bookId) {
      return res.status(400).json({ error: 'bookId is required' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (!category.books || !category.books.some((book) => String(book) === String(bookId))) {
      return res.status(404).json({ error: 'Book is not linked to this category' });
    }

    category.books = category.books.filter((book) => String(book) !== String(bookId));
    await category.save();

    res.json({ success: true, message: 'Book unlinked from category', category });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink book', details: err.message });
  }
};

export default {
  getCategoryTree,
  getCategoryBooks,
  linkBookToCategory,
  unlinkBookFromCategory
};
