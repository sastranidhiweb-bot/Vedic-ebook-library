# Vedic Ebook Library: Book Selection Request Flow

## Overview
This document describes the workflow and request flow when a user clicks on a book title in the Vedic Ebook Library application. It includes a step-by-step breakdown, a diagram, and optimization points.

---

## 1. Request Flow Diagram

```
[User Clicks Book Title]
        |
        v
[CategoryPanel.tsx]
  onBookSelection(book)
        |
        v
[EBookReader.tsx]
  handleBookSelection(book)
        |
        v
[bookStorage.ts]
  fetchBookContent(bookId, page, format)
        |
        v
[Backend API]
  /api/books/:id/text?page=1&format=html
        |
        v
[Express Controller: books.js]
        |
        v
[Utils: textExtractor.js]
        |
        v
[Database/GridFS]
        |
        v
[Backend Response]
        |
        v
[Frontend Receives Data]
        |
        v
[UI Updates Content & Chapters]
```

---

## 2. Step-by-Step Workflow

### Frontend

1. **User Action**
   - User clicks a book title in the sidebar (`CategoryPanel.tsx`).

2. **CategoryPanel.tsx**
   - Calls `onBookSelection(book)` prop.
   - Expands/collapses chapter list for the book.

3. **EBookReader.tsx**
   - `handleBookSelection(book)` is called.
   - Resets chapters, sets current page to 1, resets page input.
   - Calls `fetchBookContent(book._id, 1, 'html')`.
   - Updates state with chapters and book content.

4. **bookStorage.ts**
   - `fetchBookContent(bookId, page, format)` builds the API URL and fetches data from the backend.

### Backend

5. **API Route**
   - `GET /api/books/:id/text?page=1&format=html`
   - Handled by Express route in `backend/routes/books.js`.

6. **Controller**
   - Controller function in `backend/controllers/books.js` processes the request.
   - Calls utility functions for text extraction and pagination.

7. **Utility: textExtractor.js**
   - Extracts book text, paginates, finds chapters, etc.
   - Reads book file/content from MongoDB/GridFS or local storage.

8. **Database**
   - Book content is read from the database or file system.

9. **Response**
   - Backend returns JSON with content, chapters, and pagination info.
   - Frontend receives data and updates the UI.

---

## 3. Optimization Points

- **Backend (textExtractor.js):**
  - Profile and optimize text extraction and pagination logic.
  - Cache results for repeated requests (e.g., first page).
- **Database/File Access:**
  - Use efficient queries, avoid reading the whole file if only a part is needed.
  - Consider caching book metadata and first-page content in memory (Redis, etc).
- **Frontend:**
  - Debounce rapid clicks to avoid duplicate requests.
  - Show loading indicator immediately for better UX.
- **API:**
  - Reduce payload size: Only send what’s needed for the first render.
  - Enable compression (gzip) on responses.

---

## 4. Summary Table

| Step | File/Class                | Function/Method         | Purpose/Action                        |
|------|---------------------------|-------------------------|---------------------------------------|
| 1    | CategoryPanel.tsx         | onBookSelection         | User clicks book, triggers selection  |
| 2    | EBookReader.tsx           | handleBookSelection     | Resets state, fetches book content    |
| 3    | bookStorage.ts            | fetchBookContent        | Calls backend API for book content    |
| 4    | backend/routes/books.js   | /api/books/:id/text     | Express route for book text           |
| 5    | backend/controllers/books.js | controller function  | Handles request, calls utils          |
| 6    | backend/utils/textExtractor.js | extractText         | Extracts/paginates book content       |
| 7    | MongoDB/GridFS            | -                       | Reads book file/content               |

---

## 5. Notes
- For further optimization, focus on the backend utility and database access.
- Use profiling tools to identify bottlenecks in `textExtractor.js` and database queries.
- Consider caching and asynchronous processing for large files.
