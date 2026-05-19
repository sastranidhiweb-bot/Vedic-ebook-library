import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import configurations and middleware
import { connectDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { specs, swaggerUi } from './config/swagger.js';
import optimizedCache from '../utils/optimizedContentCache.js';

// Import routes
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import cashfreeRoutes from './routes/cashfree.js';
import categoriesRoutes from './routes/categories.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration

app.use(cors({
  origin: process.env.CORS_ORIGIN || false,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'OK'
 *                 message:
 *                   type: string
 *                   example: 'Vedic eBook Library Backend is running'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: 'development'
 */
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Vedic eBook Library Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Vedic eBook Library API Documentation'
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', cashfreeRoutes);
app.use('/api/categories', categoriesRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    // Initialize optimized content cache with popular books
    try {
      const Book = (await import('./models/Book.js')).default;
      
      // Get recently uploaded and popular books
      const recentBooks = await Book.find({ isActive: true })
        .sort({ 'uploadInfo.uploadDate': -1 })
        .limit(3)
        .lean();
        
      const popularBooks = await Book.find({ isActive: true })
        .sort({ viewCount: -1 })
        .limit(5)
        .lean();
      
      // Combine and deduplicate
      const booksToPreload = [
        ...recentBooks,
        ...popularBooks.filter(pb => !recentBooks.some(rb => rb._id.toString() === pb._id.toString()))
      ].slice(0, 5);
      
      if (booksToPreload.length > 0) {
        console.log(`🔥 Preloading optimized cache with ${booksToPreload.length} books...`);
        console.log('📚 Books to preload:', booksToPreload.map(b => b.title).join(', '));
        
        // Start background preload (don't wait)
        optimizedCache.preloadPopularBooks(booksToPreload, booksToPreload.length).catch(error => {
          console.error('❌ Background cache preload error:', error.message);
        });
        
        // Show initial cache stats
        setTimeout(() => {
          const stats = optimizedCache.getCacheStats();
          console.log('📊 Cache initialization stats:', {
            hotCache: `${stats.hotCache.entries}/${stats.hotCache.maxSize} (${stats.hotCache.memoryUsageMB}MB)`,
            hitRate: stats.performance.hitRate
          });
        }, 2000);
      } else {
        console.log('📚 No books found for cache preload');
      }
    } catch (error) {
      console.error('❌ Cache initialization error:', error.message);
    }
    
    serverInstance = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 Vedic eBook Library Backend (Optimized Cache)`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🎯 Cache Management: http://localhost:${PORT}/api/books/cache/stats`);
      console.log(`⚡ Ready to serve requests!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Only exit if startup fails
    process.exit(1);
  }
};

let serverInstance = null;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close(() => {
      console.log('🛑 Server closed after unhandled rejection. Exiting.');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close(() => {
      console.log('🛑 Server closed after uncaught exception. Exiting.');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('💤 Process terminated');
  });
});

startServer();

export default app;