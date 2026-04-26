# 📋 API Testing Guide

This guide provides comprehensive instructions for testing the Vedic eBook Library API using Swagger UI and other tools.

## 🌐 Swagger UI Access

Once the backend server is running, you can access the interactive API documentation at:

**Swagger UI URL:** `http://localhost:5000/api-docs`

## 🔧 Setup Instructions

### 1. Start MongoDB
First, ensure MongoDB is running on your system:

```bash
# Windows (if MongoDB is installed as a service)
net start MongoDB

# Or manually start mongod
mongod --dbpath "C:\data\db"

# Linux/Mac
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 2. Seed the Database
```bash
cd backend
npm run seed
```

This will create:
- **Admin User:** `admin@vedicebooks.com` / `SecureAdminPass123!`
- **Test Users:** `user1@example.com` / `TestPass123!`
- **Sample Books:** 4 books in different languages

### 3. Start the Backend Server
```bash
npm run dev
```

You should see:
```
🚀 Server is running on port 5000
📚 Vedic eBook Library Backend
🌍 Environment: development
📡 Health check: http://localhost:5000/api/health
📖 API Documentation: http://localhost:5000/api-docs
⚡ Ready to serve requests!
```

## 📖 Using Swagger UI

### 🔐 Authentication Flow

1. **Open Swagger UI:** Navigate to `http://localhost:5000/api-docs`

2. **Register a New User (Optional):**
   - Expand the `Authentication` section
   - Click on `POST /api/auth/register`
   - Click "Try it out"
   - Fill in the sample data:
   ```json
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "TestPass123!",
     "firstName": "Test",
     "lastName": "User"
   }
   ```
   - Click "Execute"

3. **Login with Test User:**
   - Click on `POST /api/auth/login`
   - Click "Try it out"
   - Use existing credentials:
   ```json
   {
     "email": "user1@example.com",
     "password": "TestPass123!"
   }
   ```
   - Click "Execute"
   - **Copy the `accessToken` from the response!**

4. **Authorize in Swagger UI:**
   - Click the "Authorize" button (🔒) at the top of Swagger UI
   - Enter: `Bearer YOUR_ACCESS_TOKEN_HERE`
   - Click "Authorize"
   - Click "Close"

Now you can test protected endpoints!

### 📚 Testing Book Endpoints

#### Get All Books
- Click `GET /api/books`
- Try different query parameters:
  - `page`: 1, 2, 3...
  - `limit`: 5, 10, 20...
  - `language`: english, telugu, sanskrit
  - `search`: caitanya, gita, bhagavat

#### Get Specific Book
- Click `GET /api/books/{id}`
- Use a book ID from the previous response
- Example: Copy an `_id` from the books list

#### Stream Book Content (Protected)
- **Must be authenticated first!**
- Click `GET /api/books/{id}/content`
- Use a book ID
- This will stream the actual book file

#### Upload New Book (Admin Only)
- **Login as admin first:**
  ```json
  {
    "email": "admin@vedicebooks.com",
    "password": "SecureAdminPass123!"
  }
  ```
- Click `POST /api/books`
- Click "Try it out"
- Upload a PDF/DOCX file and fill metadata

### 👤 Testing User Endpoints

#### Get User Profile
- Click `GET /api/auth/profile`
- Must be authenticated

#### Update Profile
- Click `PUT /api/auth/profile`
- Try updating:
  ```json
  {
    "profile.firstName": "Updated",
    "profile.preferences.defaultLanguage": "telugu"
  }
  ```

## 🧪 Alternative Testing Methods

### Using cURL

#### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"TestPass123!"}'
```

#### 3. Get Books with Authentication
```bash
# Replace YOUR_TOKEN with the token from login
curl http://localhost:5000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Upload Book (Admin)
```bash
# First login as admin and get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vedicebooks.com","password":"SecureAdminPass123!"}'

# Then upload (replace ADMIN_TOKEN and adjust file path)
curl -X POST http://localhost:5000/api/books \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "book=@/path/to/your/book.pdf" \
  -F "title=Test Book" \
  -F "author=Test Author" \
  -F "language=english" \
  -F "category=Other"
```

### Using Postman

1. **Import Collection:**
   - Create a new collection in Postman
   - Add requests for each endpoint from Swagger

2. **Set Environment Variables:**
   - `baseUrl`: `http://localhost:5000`
   - `accessToken`: (set after login)

3. **Authentication Setup:**
   - In collection settings, add authorization
   - Type: Bearer Token
   - Token: `{{accessToken}}`

## 🔍 Testing Scenarios

### Scenario 1: User Registration & Book Access
1. Register new user
2. Login with new user
3. Browse books by language
4. Search for specific books
5. View book details
6. Access book content

### Scenario 2: Admin Book Management
1. Login as admin
2. Upload new book
3. Update book metadata
4. View all books
5. Delete book (soft delete)

### Scenario 3: User Profile Management
1. Login as user
2. View profile
3. Update preferences
4. Change password
5. Refresh token

## 🐛 Troubleshooting

### Common Issues

#### 1. "MongoDB connection failed"
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify database permissions

#### 2. "Authentication required"
- Ensure you've set the Bearer token in Swagger
- Check token hasn't expired
- Re-login if needed

#### 3. "File upload failed"
- Check file size (max 50MB)
- Verify file type (PDF, DOCX, EPUB only)
- Ensure admin access for uploads

#### 4. "Book content not found"
- Book might not have been properly uploaded
- GridFS file might be missing
- Check book metadata

### Debugging Tips

1. **Check Server Logs:** Watch the terminal where you ran `npm run dev`
2. **Verify Database:** Use MongoDB Compass to check data
3. **Test Health Endpoint:** Always start with `/api/health`
4. **Check Network Tab:** In browser dev tools for request details

## 📊 Expected Response Formats

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

### Authentication Response
```json
{
  "success": true,
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

## 🎯 Performance Testing

For load testing, you can use tools like:
- **Artillery.io** for API load testing
- **Apache Bench (ab)** for simple tests
- **Postman** collection runner for automated tests

Example Artillery config:
```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Get Books"
    flow:
      - get:
          url: "/api/books"
```

---

**Happy Testing! 🚀** 

The Swagger UI provides the most convenient way to test all endpoints with proper authentication and file uploads. Make sure to explore all the available endpoints and test different scenarios!