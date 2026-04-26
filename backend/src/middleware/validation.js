import { body } from 'express-validator';

// User registration validation
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('contactNo')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .isLength({ max: 20 })
    .withMessage('Contact number cannot exceed 20 characters'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
    
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
];

// User login validation
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please provide your email or username'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Change password validation
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      // Debug log for backend console
      console.log('DEBUG: newPassword =', req.body.newPassword, 'confirmPassword =', value);
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Forgot password validation
export const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
];

// Reset password validation
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Reset password with OTP validation
export const validateResetPasswordWithOtp = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

// Update profile validation
export const validateUpdateProfile = [
  body('dob')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('contactNo')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Contact number cannot exceed 20 characters'),
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
    
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
    
  body('profile.preferences.defaultLanguage')
    .optional()
    .isIn(['english', 'telugu', 'sanskrit'])
    .withMessage('Default language must be english, telugu, or sanskrit'),
    
  body('profile.preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
    
  body('profile.preferences.booksPerPage')
    .optional()
    .isInt({ min: 6, max: 50 })
    .withMessage('Books per page must be between 6 and 50')
];

// Refresh token validation
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid refresh token format')
];

// Book upload validation
export const validateBookUpload = [
  body('tags').customSanitizer(value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  }),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and cannot exceed 200 characters'),
    
  body('author')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author is required and cannot exceed 100 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
    
  body('language')
    .isIn(['english', 'telugu', 'sanskrit'])
    .withMessage('Language must be english, telugu, or sanskrit'),
    
  // category, subcategory, and subSubcategory validation removed
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Cannot have more than 10 tags');
      }
      return true;
    }),
    
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
    
  body('metadata.totalPages')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total pages must be a positive integer'),
    
  body('metadata.isbn')
    .optional()
    .matches(/^(97(8|9))?\d{9}(\d|X)$/)
    .withMessage('Invalid ISBN format'),
    
  body('metadata.publisher')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Publisher name cannot exceed 100 characters'),
    
  body('metadata.edition')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Edition cannot exceed 50 characters')
];

// Book search validation
export const validateBookSearch = [
  body('query')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),
    
  body('language')
    .optional()
    .isIn(['english', 'telugu', 'sanskrit'])
    .withMessage('Language must be english, telugu, or sanskrit'),
    
  body('category')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Category cannot exceed 120 characters'),
    
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Reading progress validation
export const validateReadingProgress = [
  body('currentPage')
    .isInt({ min: 0 })
    .withMessage('Current page must be a positive integer'),
    
  body('totalPages')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total pages must be a positive integer'),
    
  body('lastReadPosition')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Last read position cannot exceed 200 characters')
];

// Bookmark validation
export const validateBookmark = [
  body('page')
    .isInt({ min: 0 })
    .withMessage('Page number must be a positive integer'),
    
  body('position')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Position cannot exceed 200 characters'),
    
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters')
];

// Note validation
export const validateNote = [
  body('page')
    .isInt({ min: 0 })
    .withMessage('Page number must be a positive integer'),
    
  body('position')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Position cannot exceed 200 characters'),
    
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Note content is required and cannot exceed 2000 characters'),
    
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean value')
];

// Rating validation
export const validateRating = [
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating score must be between 1 and 5'),
    
  body('review')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters'),
    
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

// OTP verification validation
export const validateVerifyOtp = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];