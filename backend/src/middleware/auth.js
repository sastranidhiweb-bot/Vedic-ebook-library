import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import User from '../models/User.js';

// Middleware to authenticate user
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Find user by ID from token
    const user = await User.findById(decoded.id).select('+refreshTokens');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Attach user to request object (without sensitive data)
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      isActive: user.isActive,
      emailVerified: user.emailVerified
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware to check if user is authenticated (optional auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Middleware to authorize based on roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Middleware to check if user is admin
export const requireAdmin = authorize('admin');

// Middleware to check if user is admin or the resource owner
export const requireAdminOrOwner = (getUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const isAdmin = req.user.role === 'admin';
    const resourceUserId = typeof getUserId === 'function' 
      ? getUserId(req) 
      : req.params.userId || req.user.id;
    
    const isOwner = req.user.id.toString() === resourceUserId.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin rights or resource ownership required.'
      });
    }

    next();
  };
};

// Middleware to check email verification
export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      action: 'verify-email'
    });
  }

  next();
};

// Middleware for API key authentication (for external integrations)
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required'
      });
    }

    // In a real application, you would validate the API key against a database
    // For now, we'll use a simple environment variable check
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Set a system user for API requests
    req.user = {
      id: 'system',
      role: 'admin',
      type: 'api'
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'API key authentication failed'
    });
  }
};

// Middleware to log authentication events
export const logAuthEvent = (event) => {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const userInfo = req.user ? `${req.user.username} (${req.user.id})` : 'Unknown';
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`🔐 Auth Event: ${event} | User: ${userInfo} | IP: ${ip} | Time: ${timestamp}`);
    
    next();
  };
};