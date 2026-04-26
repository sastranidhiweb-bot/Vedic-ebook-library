import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ['normal', 'special', 'private'],
      default: 'normal',
      required: true
    },
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  language: {
    type: String,
    required: [true, 'Language is required'],
    enum: {
      values: ['english', 'telugu', 'sanskrit'],
      message: 'Language must be english, telugu, or sanskrit'
    },
    lowercase: true
  },
  
  // category, subcategory and subSubcategory removed
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  fileInfo: {
    originalName: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileExtension: {
      type: String,
      required: true,
      enum: ['.pdf', '.docx', '.epub']
    }
  },
  
  metadata: {
    totalPages: {
      type: Number,
      default: 0,
      min: 0
    },
    isbn: {
      type: String,
      sparse: true,
      validate: {
        validator: function(v) {
          return !v || /^(97(8|9))?\d{9}(\d|X)$/.test(v.replace(/[-\s]/g, ''));
        },
        message: 'Invalid ISBN format'
      }
    },
    publishedDate: Date,
    publisher: {
      type: String,
      trim: true,
      maxlength: [100, 'Publisher name cannot exceed 100 characters']
    },
    edition: {
      type: String,
      trim: true,
      maxlength: [50, 'Edition cannot exceed 50 characters']
    }
  },
  
  uploadInfo: {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  accessControl: {
    isPublic: {
      type: Boolean,
      default: true
    },
    accessLevel: {
      type: String,
      enum: ['public', 'user', 'admin'],
      default: 'public'
    },
    allowedRoles: [{
      type: String,
      enum: ['admin', 'user', 'guest']
    }]
  },
  
  statistics: {
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
bookSchema.index({ title: 'text', author: 'text', description: 'text' }, { 
  default_language: 'none',
  language_override: 'textLanguage'  // Use a different field name to avoid conflict
});
// bookSchema.index({ language: 1, category: 1 });
// bookSchema.index({ category: 1, subcategory: 1, subSubcategory: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ tags: 1 });
bookSchema.index({ 'uploadInfo.uploadDate': -1 });
bookSchema.index({ 'statistics.viewCount': -1 });
bookSchema.index({ 'statistics.downloadCount': -1 });
bookSchema.index({ isActive: 1 });
bookSchema.index({ 'accessControl.isPublic': 1, 'accessControl.accessLevel': 1 });

// Pre-save middleware
bookSchema.pre('save', function(next) {
  this.uploadInfo.lastModified = new Date();
  next();
});

// Instance methods
bookSchema.methods.incrementView = async function() {
  this.statistics.viewCount += 1;
  return await this.save();
};

bookSchema.methods.incrementDownload = async function() {
  this.statistics.downloadCount += 1;
  return await this.save();
};

bookSchema.methods.updateRating = async function(newRating) {
  const totalRatings = this.statistics.totalRatings;
  const currentAverage = this.statistics.averageRating;
  
  this.statistics.totalRatings += 1;
  this.statistics.averageRating = 
    (currentAverage * totalRatings + newRating) / this.statistics.totalRatings;
  
  return await this.save();
};

// Static methods
bookSchema.statics.findByLanguage = function(language) {
  return this.find({ language: language.toLowerCase(), isActive: true });
};

// bookSchema.statics.findByCategory removed (category deprecated)

bookSchema.statics.findByAuthor = function(author, language = null) {
  const filter = { 
    author: { $regex: author, $options: 'i' }, 
    isActive: true 
  };
  if (language) {
    filter.language = language.toLowerCase();
  }
  return this.find(filter);
};

bookSchema.statics.searchBooks = function(searchTerm, language = null, limit = 20) {
  const filter = { 
    $text: { $search: searchTerm },
    isActive: true 
  };
  if (language) {
    filter.language = language.toLowerCase();
  }
  return this.find(filter)
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

// Virtual for formatted file size
bookSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.fileInfo.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Ensure virtual fields are serialized
bookSchema.set('toJSON', { virtuals: true });

const Book = mongoose.model('Book', bookSchema);

export default Book;