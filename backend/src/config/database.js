import mongoose from 'mongoose';
import Grid from 'gridfs-stream';

let gfs, gridfsBucket;


export const connectDatabase = async () => {
  const maxRetries = 5;
  const retryDelay = 3000; // ms
  let attempt = 0;

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  while (attempt < maxRetries) {
    try {
      // Connect to MongoDB
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        // useNewUrlParser and useUnifiedTopology are deprecated and not needed in Mongoose 6+
      });

      console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
      // Initialize GridFS
      const db = conn.connection.db;
      // GridFS Stream (for compatibility)
      gfs = Grid(db, mongoose.mongo);
      gfs.collection('books');
      // GridFS Bucket (modern approach)
      gridfsBucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'books'
      });
      console.log('📚 GridFS initialized for book storage');
      return conn;
    } catch (error) {
      attempt++;
      console.error(`❌ Database connection error (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt >= maxRetries) {
        console.error('❌ Could not connect to MongoDB after multiple attempts. Exiting.');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, retryDelay));
    }
  }
};

// Export GridFS instances

export const getGfs = () => {
  if (!gfs) {
    console.error('❌ GridFS not initialized. Call connectDatabase first.');
    return null;
  }
  return gfs;
};


export const getGridfsBucket = () => {
  if (!gridfsBucket) {
    console.error('❌ GridFS Bucket not initialized. Call connectDatabase first.');
    return null;
  }
  return gridfsBucket;
};

// Database health check
export const checkDatabaseHealth = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return { status: 'healthy', message: 'Database connection is active' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

// Graceful database disconnection
export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log('📦 MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error.message);
  }
};