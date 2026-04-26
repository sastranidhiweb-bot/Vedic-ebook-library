import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema({
    privilegeForBooks: {
      type: [String],
      default: ['normal'],
      validate: {
        validator: function(arr) {
          const allowed = ['normal', 'special', 'private'];
          return Array.isArray(arr) && arr.every(v => allowed.includes(v));
        },
        message: 'Invalid privilege value in privilegeForBooks'
      }
    },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  contactNo: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true,
    maxlength: [20, 'Contact number cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  
  role: {
    type: String,
    enum: {
      values: ['admin', 'user', 'guest'],
      message: 'Role must be either admin, user, or guest'
    },
    default: 'user'
  },
  
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    preferences: {
      defaultLanguage: {
        type: String,
        enum: ['english', 'telugu', 'sanskrit'],
        default: 'english'
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto', 'premium1', 'premium2'],
        default: 'light'
      },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      booksPerPage: {
        type: Number,
        default: 12,
        min: 6,
        max: 50
      }
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },

  // OTP for password reset and its expiry
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },

  lastLogin: {
    type: Date,
    default: null
  },
  
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000 // 30 days
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  try {
    // Hash the password with cost of 12
    const salt = await bcryptjs.genSalt(12);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshTokens;
  return user;
};

// Static method to find active users
userSchema.statics.findActiveUsers = function(filter = {}) {
  return this.find({ ...filter, isActive: true });
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.username;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;