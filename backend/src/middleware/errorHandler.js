import mongoose from 'mongoose';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Please upload a smaller file.', 400);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Please upload fewer files.', 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected field. Please check your form data.', 400);
  }
  return new AppError('File upload error. Please try again.', 400);
};

const sendErrorDev = (err, req, res) => {
  // API errors in development
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    });
  }

  // Non-API errors
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  // API errors in production
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }

  // Non-API errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  console.error('ERROR 💥', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
};

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);

    sendErrorProd(error, req, res);
  }
};

// Catch async errors wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
export const notFound = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(err);
};

// Validation error handler
export const validationError = (errors) => {
  const errorMessages = errors.map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));

  return new AppError(
    `Validation failed: ${errorMessages.map(e => e.message).join(', ')}`,
    400
  );
};

// Database connection error handler
export const handleDatabaseError = (error) => {
  console.error('Database Error:', error.message);
  
  if (error.name === 'MongoNetworkError') {
    return new AppError('Database connection failed. Please try again later.', 503);
  }
  
  if (error.name === 'MongooseServerSelectionError') {
    return new AppError('Database server is not available. Please try again later.', 503);
  }

  return new AppError('Database operation failed', 500);
};

// File operation error handler
export const handleFileError = (error, operation = 'file operation') => {
  console.error(`File Error (${operation}):`, error.message);
  
  if (error.code === 'ENOENT') {
    return new AppError('File not found', 404);
  }
  
  if (error.code === 'EACCES') {
    return new AppError('Permission denied for file operation', 403);
  }
  
  if (error.code === 'ENOSPC') {
    return new AppError('Not enough storage space', 507);
  }

  return new AppError(`${operation} failed`, 500);
};