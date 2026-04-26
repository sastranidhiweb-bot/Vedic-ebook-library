# Vedic eBook Library Backend

A secure, scalable Node.js backend API for the Vedic eBook Library application with JWT authentication, role-based access control, and GridFS file storage.

## 🏗️ Architecture

```
📚 Vedic eBook Library Backend
├── 🔐 Authentication & Authorization (JWT + Role-based)
├── 📖 Book Management (GridFS Storage)
├── 👥 User Management (Profiles & Preferences)
├── 📊 Reading Progress Tracking
└── 🔒 Secure API Endpoints
```

## 🚀 Features

### 🔐 Authentication & Security
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (Admin, User, Guest)
- **Password hashing** with bcryptjs
- **Rate limiting** and security headers
- **Input validation** with express-validator

### 📖 Book Management
- **Secure file upload** with GridFS storage
- **Multiple file format support** (PDF, DOCX, EPUB)
- **Metadata management** (title, author, category, language)
- **Access control** with public/private books
- **Search functionality** with text indexing

### 👥 User Features
- **User profiles** with preferences
- **Reading progress tracking**
- **Bookmarks and notes**
- **Reading statistics**
- **Language preferences** (English, Telugu, Sanskrit)

## 📦 Installation

### Prerequisites
- Node.js (v16+)
- MongoDB (v4.4+)
- npm or yarn

### Setup Steps

1. **Clone and navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment Configuration:**
```bash
cp .env.example .env
```
Edit `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/vedic-ebook-library
JWT_SECRET=your-super-secure-jwt-secret-key
FRONTEND_URL=http://localhost:3000
```

4. **Start MongoDB:**
```bash
# Make sure MongoDB is running on your system
mongod
```

5. **Seed the database with initial data:**
```bash
npm run seed
```

6. **Start the server:**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 🌐 API Endpoints

### 🔐 Authentication Routes
```http
POST /api/auth/register          # Register new user
POST /api/auth/login             # Login user
POST /api/auth/logout            # Logout user
POST /api/auth/refresh-token     # Refresh access token
GET  /api/auth/profile           # Get user profile
PUT  /api/auth/profile           # Update user profile
PUT  /api/auth/change-password   # Change password
POST /api/auth/forgot-password   # Request password reset
POST /api/auth/reset-password    # Reset password
```

### 📚 Book Routes
```http
GET    /api/books                    # List all books (with pagination)
GET    /api/books/search?q=query     # Search books
GET    /api/books/language/:language # Books by language
GET    /api/books/category/:category # Books by category
GET    /api/books/author/:author     # Books by author
GET    /api/books/:id                # Get book details
GET    /api/books/:id/content        # Stream book content (Protected)
POST   /api/books                    # Upload new book (Admin only)
PUT    /api/books/:id                # Update book (Admin only)
DELETE /api/books/:id                # Delete book (Admin only)
```

### 👥 User Routes
```http
GET /api/users/reading-history       # User's reading history
GET /api/users/bookmarks             # User's bookmarks
GET /api/users/reading-stats         # User's reading statistics
```

### 🛠️ Admin Routes
```http
GET    /api/admin/users              # List all users
PUT    /api/admin/users/:id/role     # Update user role
DELETE /api/admin/users/:id          # Deactivate user
GET    /api/admin/analytics          # System analytics
```

### 🏥 Health Check
```http
GET /api/health                      # Server health status
```

## 🔑 Authentication Flow

### Registration/Login
```json
POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "jwt_token_here",
      "refreshToken": "refresh_token_here",
      "tokenType": "Bearer",
      "expiresIn": "7d"
    }
  }
}
```

### Protected Requests
```http
Authorization: Bearer your_jwt_token_here
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB & GridFS configuration
│   ├── controllers/
│   │   ├── auth.js              # Authentication logic
│   │   └── books.js             # Book management logic
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js      # Global error handling
│   │   └── validation.js        # Input validation rules
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Book.js              # Book schema
│   │   └── ReadingProgress.js   # Reading progress schema
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── books.js             # Book routes
│   │   ├── users.js             # User routes
│   │   └── admin.js             # Admin routes
│   ├── scripts/
│   │   └── seedData.js          # Database seeding script
│   ├── utils/
│   │   └── jwt.js               # JWT utilities
│   └── server.js                # Main server file
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── package.json                 # Dependencies & scripts
└── README.md                    # This file
```

## 🧪 Testing

### Sample Login Credentials (After Seeding)
```
Admin User:
  Email: admin@vedicebooks.com
  Password: SecureAdminPass123!

Test Users:
  Email: user1@example.com
  Password: TestPass123!
  
  Email: user2@example.com
  Password: TestPass123!
```

### API Testing with curl

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"TestPass123!"}'

# Get books (with token)
curl http://localhost:5000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Upload book (admin only)
curl -X POST http://localhost:5000/api/books \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -F "book=@/path/to/your/book.pdf" \
  -F "title=Sample Book" \
  -F "author=Sample Author" \
  -F "language=english" \
  -F "category=Other"
```

## 🔒 Security Features

- **Helmet.js** for security headers
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization
- **JWT token expiration** and refresh mechanism
- **Password hashing** with salt
- **CORS configuration** for frontend integration
- **File upload restrictions** (type, size)
- **Role-based access control**

## 📊 Database Schema

### User Schema
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  role: ['admin', 'user', 'guest'],
  profile: {
    firstName: String,
    lastName: String,
    preferences: {
      defaultLanguage: ['english', 'telugu', 'sanskrit'],
      theme: ['light', 'dark', 'auto']
    }
  },
  isActive: Boolean,
  emailVerified: Boolean
}
```

### Book Schema
```javascript
{
  title: String,
  author: String,
  description: String,
  language: ['english', 'telugu', 'sanskrit'],
  category: String,
  tags: [String],
  fileInfo: {
    gridfsId: ObjectId,
    originalName: String,
    mimeType: String,
    fileSize: Number
  },
  accessControl: {
    isPublic: Boolean,
    accessLevel: ['public', 'user', 'admin']
  }
}
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db/vedic-ebook-library
JWT_SECRET=your-super-secure-production-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🛠️ Development Scripts

```bash
npm run dev          # Start development server with auto-reload
npm start            # Start production server
npm run seed         # Seed database with initial data
npm test             # Run tests (when implemented)
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## 🤝 Contributing

1. Follow the existing code style
2. Add validation for new endpoints
3. Include error handling
4. Update this README for new features
5. Test thoroughly before submitting

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Check the API documentation above
- Review error messages in development mode
- Check MongoDB connection and ensure it's running
- Verify environment variables are set correctly

---

**Built with ❤️ for the Vedic eBook Library Project**