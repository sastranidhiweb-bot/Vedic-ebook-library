import express from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import ReadingProgress from '../models/ReadingProgress.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticate);

// Map a highlight subdocument to the client-facing shape
const mapHighlight = (h) => ({
  id: h._id.toString(),
  text: h.text,
  color: h.color,
  page: h.page,
  createdAt: h.createdAt,
});

// Find or create a ReadingProgress document for the current user + book
async function getOrCreateProgress(userId, bookId) {
  let doc = await ReadingProgress.findOne({ userId, bookId });
  if (!doc) {
    doc = new ReadingProgress({ userId, bookId });
  }
  return doc;
}

// Get current user's reading history
router.get('/reading-history', async (req, res) => {
  res.json({
    success: true,
    message: 'Reading history endpoint - to be implemented',
    data: []
  });
});

// Get bookmark + highlights for a specific book
router.get('/progress/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'Invalid book id' });
    }
    const doc = await ReadingProgress.findOne({ userId: req.user.id, bookId });
    res.json({
      success: true,
      bookmark: doc && doc.bookmarks && doc.bookmarks.length > 0 ? { page: doc.bookmarks[0].page } : null,
      highlights: doc && doc.highlights ? doc.highlights.map(mapHighlight) : [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load progress', error: error.message });
  }
});

// Save (upsert) the single bookmark for a book
router.put('/progress/:bookId/bookmark', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { page } = req.body;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'Invalid book id' });
    }
    const pageNum = parseInt(page, 10);
    if (!Number.isFinite(pageNum) || pageNum < 0) {
      return res.status(400).json({ success: false, message: 'Invalid page number' });
    }
    const doc = await getOrCreateProgress(req.user.id, bookId);
    doc.bookmarks = [{ page: pageNum }];
    await doc.save();
    res.json({ success: true, bookmark: { page: pageNum } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save bookmark', error: error.message });
  }
});

// Remove the bookmark for a book
router.delete('/progress/:bookId/bookmark', async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'Invalid book id' });
    }
    const doc = await ReadingProgress.findOne({ userId: req.user.id, bookId });
    if (doc) {
      doc.bookmarks = [];
      await doc.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove bookmark', error: error.message });
  }
});

// Add a highlight to a book
router.post('/progress/:bookId/highlights', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { text, color, page } = req.body;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'Invalid book id' });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Highlight text is required' });
    }
    const doc = await getOrCreateProgress(req.user.id, bookId);
    doc.highlights.push({
      text: text.trim().slice(0, 2000),
      color: typeof color === 'string' ? color : undefined,
      page: Number.isFinite(parseInt(page, 10)) ? parseInt(page, 10) : 0,
    });
    await doc.save();
    res.json({ success: true, highlights: doc.highlights.map(mapHighlight) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add highlight', error: error.message });
  }
});

// Delete a highlight from a book
router.delete('/progress/:bookId/highlights/:highlightId', async (req, res) => {
  try {
    const { bookId, highlightId } = req.params;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'Invalid book id' });
    }
    const doc = await ReadingProgress.findOne({ userId: req.user.id, bookId });
    if (doc && doc.highlights) {
      doc.highlights = doc.highlights.filter(h => h._id.toString() !== highlightId);
      await doc.save();
    }
    res.json({ success: true, highlights: doc && doc.highlights ? doc.highlights.map(mapHighlight) : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete highlight', error: error.message });
  }
});

// Get current user's bookmarks
router.get('/bookmarks', async (req, res) => {
  res.json({
    success: true,
    message: 'Bookmarks endpoint - to be implemented',
    data: []
  });
});

// Get current user's reading statistics
router.get('/reading-stats', async (req, res) => {
  res.json({
    success: true,
    message: 'Reading statistics endpoint - to be implemented',
    data: {
      totalBooks: 0,
      completedBooks: 0,
      totalReadingTime: 0,
      totalBookmarks: 0,
      totalNotes: 0
    }
  });
});

export default router;