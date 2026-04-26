import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication and admin requirement to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// Get all users (admin only)
import User from '../models/User.js';

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Exclude password field
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});


// Update user fields (except name, username, password)
router.put('/users/:id', async (req, res) => {
  try {
    const allowedFields = ['email', 'contactNo', 'dob', 'role', 'privilegeForBooks'];
    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'privilegeForBooks') {
          // Ensure privilegeForBooks is always an array
          if (Array.isArray(req.body[field])) {
            update[field] = req.body[field];
          } else if (typeof req.body[field] === 'string') {
            update[field] = [req.body[field]];
          } else {
            update[field] = [];
          }
        } else {
          update[field] = req.body[field];
        }
      }
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true, context: 'query' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
});

// Deactivate user (admin only)
router.delete('/users/:id', async (req, res) => {
  res.json({
    success: true,
    message: 'Deactivate user endpoint - to be implemented'
  });
});

// Get system analytics (admin only)
router.get('/analytics', async (req, res) => {
  res.json({
    success: true,
    message: 'System analytics endpoint - to be implemented',
    data: {
      totalUsers: 0,
      totalBooks: 0,
      totalDownloads: 0,
      activeUsers: 0
    }
  });
});

export default router;