import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate JWT Access Token
export const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'vedic-ebook-library',
      audience: 'vedic-ebook-users'
    }
  );
};

// Generate JWT Refresh Token
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
      issuer: 'vedic-ebook-library',
      audience: 'vedic-ebook-users'
    }
  );
};

// Verify JWT Token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'vedic-ebook-library',
      audience: 'vedic-ebook-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Generate secure random token (for email verification, password reset, etc.)
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Extract token from request header
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

// Generate token pair (access + refresh)
export const generateTokenPair = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user._id });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRE || '7d'
  };
};

// Decode token without verification (for getting expired token data)
export const decodeTokenPayload = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};

// Get token expiration time
export const getTokenExpirationTime = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
};

// Validate token format
export const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

// Create password reset token
export const createPasswordResetToken = (userId) => {
  const payload = {
    userId,
    type: 'password-reset',
    timestamp: Date.now()
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // Password reset tokens expire in 1 hour
  );
};

// Create email verification token
export const createEmailVerificationToken = (userId, email) => {
  const payload = {
    userId,
    email,
    type: 'email-verification',
    timestamp: Date.now()
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // Email verification tokens expire in 24 hours
  );
};

// Verify special purpose tokens (password reset, email verification)
export const verifySpecialToken = (token, expectedType) => {
  try {
    const decoded = verifyToken(token);
    
    if (decoded.type !== expectedType) {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};