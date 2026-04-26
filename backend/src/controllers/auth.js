import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { 
  generateTokenPair, 
  verifyToken,
  createPasswordResetToken,
  createEmailVerificationToken,
  verifySpecialToken
} from '../utils/jwt.js';
import { AppError, catchAsync, validationError } from '../middleware/errorHandler.js';
import { sendOtpEmail } from '../utils/email.js';

// Register a new user
export const register = catchAsync(async (req, res, next) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  const { username, email, password, name, dob, contactNo, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    return next(new AppError(`User with this ${field} already exists`, 409));
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    password,
    name,
    dob,
    contactNo,
    profile: {
      firstName,
      lastName
    }
  });

  // Generate tokens
  const tokens = generateTokenPair(user);

  // Save refresh token to user
  user.refreshTokens.push({
    token: tokens.refreshToken,
    createdAt: new Date()
  });
  await user.save();

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.getPublicProfile(),
      tokens
    }
  });
});

// Login user
export const login = catchAsync(async (req, res, next) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }


  const { email, password } = req.body;
  // Support login by email or username
  let user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user) {
    user = await User.findOne({ username: email }).select('+password +refreshTokens');
  }
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or username or password', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Account is deactivated. Please contact support.', 403));
  }

  // Update last login
  user.lastLogin = new Date();

  // Generate new tokens
  const tokens = generateTokenPair(user);

  // Clean up old refresh tokens (keep only last 5)
  user.refreshTokens = user.refreshTokens.slice(-4);
  user.refreshTokens.push({
    token: tokens.refreshToken,
    createdAt: new Date()
  });

  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      tokens
    }
  });
});

// Logout user
export const logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Remove the specific refresh token
    await User.updateOne(
      { _id: req.user.id },
      { $pull: { refreshTokens: { token: refreshToken } } }
    );
  } else {
    // Remove all refresh tokens (logout from all devices)
    await User.updateOne(
      { _id: req.user.id },
      { $set: { refreshTokens: [] } }
    );
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Refresh access token
export const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }

  // Find user and check if refresh token exists
  const user = await User.findById(decoded.id).select('+refreshTokens');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
  if (!tokenExists) {
    return next(new AppError('Refresh token not found', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Account is deactivated', 403));
  }

  // Generate new tokens
  const tokens = generateTokenPair(user);

  // Replace old refresh token with new one
  user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
  user.refreshTokens.push({
    token: tokens.refreshToken,
    createdAt: new Date()
  });

  await user.save();

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      tokens
    }
  });
});

// Get current user profile
export const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    success: true,
    data: {
      user: user.getPublicProfile()
    }
  });
});

// Update user profile
export const updateProfile = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  // Debug: log incoming request body
  console.log('updateProfile request body:', req.body);

  // Only allow specific fields to be updated
  const allowedFields = [
    'profile.firstName',
    'profile.lastName',
    'profile.preferences.defaultLanguage',
    'profile.preferences.theme',
    'profile.preferences.booksPerPage',
    'dob',
    'contactNo'
  ];

  const updates = {};
    // Always allow dob/contactNo if present
    if (typeof req.body.dob !== 'undefined') {
      updates.dob = req.body.dob;
    }
    if (typeof req.body.contactNo !== 'undefined') {
      updates.contactNo = req.body.contactNo;
    }
  // Also allow other allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key) && typeof updates[key] === 'undefined') {
      updates[key] = req.body[key];
    }
  });

  // Debug: log what will be updated
  console.log('updateProfile updates object:', updates);

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.getPublicProfile()
    }
  });
});

// Change password
export const changePassword = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password +refreshTokens');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check current password
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Update password
  user.password = newPassword;
  
  // Clear all refresh tokens (force re-login on all devices)
  user.refreshTokens = [];
  
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully. Please login again on all devices.'
  });
});

// Verify token endpoint
export const verifyTokenEndpoint = catchAsync(async (req, res, next) => {
  // If we reach here, the auth middleware has already verified the token
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user
    }
  });
});

// Request password reset
export const forgotPassword = catchAsync(async (req, res, next) => {
  console.log('--- forgotPassword START ---');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('forgotPassword: validation error', errors.array());
    return next(validationError(errors.array()));
  }

  const { email } = req.body;
  console.log('forgotPassword: received email:', email);

  const user = await User.findOne({ email });
  console.log('forgotPassword: user found:', !!user);
  if (!user) {
    // Don't reveal if user exists or not
    console.log('--- forgotPassword END (user not found) ---');
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  // Generate a 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Set expiry to 10 minutes from now
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  console.log('forgotPassword: generated OTP:', otp, 'expires at:', otpExpires);

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();
  console.log('forgotPassword: OTP and expiry saved to user');

  // Send OTP via email
  try {
    await sendOtpEmail(user.email, otp);
    console.log('forgotPassword: OTP email sent to', user.email);
  } catch (err) {
    console.log('--- forgotPassword END (email send failed) ---', err);
    return next(new AppError('Failed to send OTP email', 500));
  }

  console.log('--- forgotPassword END (success) ---');
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset code has been sent.',
    ...(process.env.NODE_ENV === 'development' && { otp })
  });
});

// Reset password
export const resetPassword = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  const { token, newPassword } = req.body;

  // Verify reset token
  let decoded;
  try {
    decoded = verifySpecialToken(token, 'password-reset');
  } catch (error) {
    return next(new AppError('Invalid or expired reset token', 400));
  }

  // Find user
  const user = await User.findById(decoded.userId).select('+refreshTokens');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Update password
  user.password = newPassword;
  
  // Clear all refresh tokens
  user.refreshTokens = [];
  
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successful. Please login with your new password.'
  });
});

// Verify OTP
export const verifyOtp = catchAsync(async (req, res, next) => {
  console.log('--- verifyOtp START ---');
  console.log('verifyOtp request body:', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  console.log('verifyOtp fetched user:', user);
  if (user) {
    console.log('verifyOtp stored OTP:', user.otp);
    console.log('verifyOtp stored OTP expiry:', user.otpExpires);
  }

  if (!user || !user.otp || !user.otpExpires) {
    console.log('--- verifyOtp END (invalid/expired) ---');
    return next(new AppError('Invalid or expired OTP', 400));
  }

  if (user.otp !== otp) {
    console.log('--- verifyOtp END (incorrect) ---');
    console.log('verifyOtp sent OTP:', otp);
    return next(new AppError('Incorrect OTP', 400));
  }

  if (user.otpExpires < new Date()) {
    console.log('--- verifyOtp END (expired) ---');
    console.log('verifyOtp expiry check:', user.otpExpires, '<', new Date());
    return next(new AppError('OTP has expired', 400));
  }

  // OTP is valid, clear it
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  console.log('--- verifyOtp END (success) ---');
  res.json({
    success: true,
    message: 'OTP verified successfully. You may now reset your password.'
  });
});

// Reset password using OTP
export const resetPasswordWithOtp = catchAsync(async (req, res, next) => {
  console.log('--- resetPasswordWithOtp START ---');
  console.log('resetPasswordWithOtp request body:', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array()));
  }

  const { email, newPassword } = req.body;
  const user = await User.findOne({ email });
  console.log('resetPasswordWithOtp fetched user:', user);

  if (!user) {
    console.log('--- resetPasswordWithOtp END (user not found) ---');
    return next(new AppError('User not found', 404));
  }

  // Directly reset password and clear OTP fields
  user.password = newPassword;
  user.otp = null;
  user.otpExpires = null;
  user.refreshTokens = [];
  await user.save();

  console.log('--- resetPasswordWithOtp END (success) ---');
  res.json({
    success: true,
    message: 'Password reset successful. Please login with your new password.'
  });
});