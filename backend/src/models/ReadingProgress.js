import mongoose from 'mongoose';

const readingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  
  progress: {
    currentPage: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPages: {
      type: Number,
      default: 0,
      min: 0
    },
    percentageComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastReadPosition: {
      type: String, // For storing scroll position or specific location
      default: null
    }
  },
  
  bookmarks: [{
    page: {
      type: Number,
      required: true,
      min: 0
    },
    position: String, // Specific position within page
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Bookmark note cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  notes: [{
    page: {
      type: Number,
      required: true,
      min: 0
    },
    position: String, // Specific position within page
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters']
    },
    isPrivate: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  readingStatistics: {
    totalReadingTime: {
      type: Number, // in minutes
      default: 0,
      min: 0
    },
    sessionsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    averageSessionTime: {
      type: Number, // in minutes
      default: 0,
      min: 0
    },
    firstStarted: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  },
  
  status: {
    type: String,
    enum: ['not-started', 'reading', 'completed', 'paused'],
    default: 'not-started'
  },
  
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Compound indexes
readingProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, status: 1 });
readingProgressSchema.index({ userId: 1, 'readingStatistics.lastAccessed': -1 });
readingProgressSchema.index({ bookId: 1, 'rating.score': 1 });

// Pre-save middleware to update percentage
readingProgressSchema.pre('save', function(next) {
  if (this.progress.totalPages > 0) {
    this.progress.percentageComplete = 
      Math.round((this.progress.currentPage / this.progress.totalPages) * 100 * 100) / 100;
  }
  
  // Update reading statistics
  if (this.isModified('readingStatistics.totalReadingTime') || this.isModified('readingStatistics.sessionsCount')) {
    if (this.readingStatistics.sessionsCount > 0) {
      this.readingStatistics.averageSessionTime = 
        this.readingStatistics.totalReadingTime / this.readingStatistics.sessionsCount;
    }
  }
  
  // Update last accessed
  this.readingStatistics.lastAccessed = new Date();
  
  // Update status based on progress
  if (this.progress.percentageComplete >= 100) {
    this.status = 'completed';
  } else if (this.progress.percentageComplete > 0) {
    this.status = 'reading';
  }
  
  next();
});

// Instance methods
readingProgressSchema.methods.addBookmark = function(page, position = null, note = null) {
  this.bookmarks.push({
    page,
    position,
    note
  });
  return this.save();
};

readingProgressSchema.methods.removeBookmark = function(bookmarkId) {
  this.bookmarks.id(bookmarkId).remove();
  return this.save();
};

readingProgressSchema.methods.addNote = function(page, content, position = null, isPrivate = true) {
  this.notes.push({
    page,
    position,
    content,
    isPrivate
  });
  return this.save();
};

readingProgressSchema.methods.updateNote = function(noteId, content) {
  const note = this.notes.id(noteId);
  if (note) {
    note.content = content;
    note.updatedAt = new Date();
  }
  return this.save();
};

readingProgressSchema.methods.removeNote = function(noteId) {
  this.notes.id(noteId).remove();
  return this.save();
};

readingProgressSchema.methods.updateProgress = function(currentPage, totalPages = null) {
  this.progress.currentPage = currentPage;
  if (totalPages !== null) {
    this.progress.totalPages = totalPages;
  }
  return this.save();
};

readingProgressSchema.methods.addReadingSession = function(sessionTimeMinutes) {
  this.readingStatistics.totalReadingTime += sessionTimeMinutes;
  this.readingStatistics.sessionsCount += 1;
  return this.save();
};

readingProgressSchema.methods.setRating = function(score, review = null, isPublic = false) {
  this.rating = {
    score,
    review,
    isPublic,
    ratedAt: new Date()
  };
  return this.save();
};

// Static methods
readingProgressSchema.statics.getUserProgress = function(userId, status = null) {
  const filter = { userId };
  if (status) {
    filter.status = status;
  }
  return this.find(filter).populate('bookId', 'title author language category');
};

readingProgressSchema.statics.getBookRatings = function(bookId) {
  return this.find({ 
    bookId, 
    'rating.score': { $exists: true },
    'rating.isPublic': true 
  }).populate('userId', 'username profile.firstName profile.lastName');
};

readingProgressSchema.statics.getUserReadingStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalBooks: { $sum: 1 },
        completedBooks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalReadingTime: { $sum: '$readingStatistics.totalReadingTime' },
        totalBookmarks: { $sum: { $size: '$bookmarks' } },
        totalNotes: { $sum: { $size: '$notes' } }
      }
    }
  ]);
};

const ReadingProgress = mongoose.model('ReadingProgress', readingProgressSchema);

export default ReadingProgress;