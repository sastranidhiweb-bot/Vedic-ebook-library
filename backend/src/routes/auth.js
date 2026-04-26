import express from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  verifyTokenEndpoint,
  forgotPassword,
  resetPassword,
  verifyOtp,
  resetPasswordWithOtp
} from '../controllers/auth.js';

import { authenticate } from '../middleware/auth.js';
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
  validateRefreshToken,
  validateVerifyOtp,
  validateResetPasswordWithOtp
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: 'john_doe'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'john@example.com'
 *               password:
 *                 type: string
 *                 example: 'SecurePass123!'
 *               firstName:
 *                 type: string
 *                 example: 'John'
 *               lastName:
 *                 type: string
 *                 example: 'Doe'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
// Public routes (no authentication required)
router.post('/register', validateRegister, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'user1@example.com'
 *               password:
 *                 type: string
 *                 example: 'TestPass123!'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateLogin, login);
router.post('/refresh-token', validateRefreshToken, refreshToken);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/verify-otp', validateVerifyOtp, verifyOtp);
router.post('/reset-password-otp', validateResetPasswordWithOtp, resetPasswordWithOtp);

// Protected routes (authentication required)
router.use(authenticate); // Apply authentication middleware to all routes below

router.post('/logout', logout);
router.get('/verify', verifyTokenEndpoint);
router.get('/profile', getProfile);
router.put('/profile', validateUpdateProfile, updateProfile);
router.put('/change-password', validateChangePassword, changePassword);

export default router;