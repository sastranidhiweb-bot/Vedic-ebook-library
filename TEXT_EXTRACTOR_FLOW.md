# Backend Utility: textExtractor.js – Code Flow & Optimization

## Overview
This document explains the code flow and main functions in `textExtractor.js` (backend utility for text extraction and pagination), and provides optimization suggestions for better performance.

---

## 1. Main Functions & Flow

### extractTextContent(filePath, mimeType)
- **Purpose:** Extracts plain text from a file (DOCX or PDF).
- **How it works:**
  - Checks if the file exists.
  - For `.docx` or Word files: Uses `mammoth.extractRawText` to get the text.
  - For `.pdf` files: Uses `pdf-parse` to extract text.
  - Throws an error for unsupported formats.
- **Returns:** The full text content as a string.

---

### extractHtmlContent(filePath)
- **Purpose:** Extracts HTML (with formatting) from a DOCX file.
- **How it works:**
  - Checks if the file exists.
  - Uses `mammoth.convertToHtml` to get HTML content.
- **Returns:** The HTML string.

---

### getPaginatedContent(filePath, mimeType, page, wordsPerPage)
- **Purpose:** Returns a specific page of the book, split by word count.
- **How it works:**
  - Calls `extractTextContent` to get the full text.
  - Splits the text into words.
  - Calculates total pages and the range for the requested page.
  - Returns an object with:
    - `content`: The text for the requested page.
    - `currentPage`, `totalPages`, `totalWords`, `wordsOnPage`, `hasNextPage`, `hasPrevPage`.

---

## 2. Typical Call Flow

```
Controller (books.js)
   └── getPaginatedContent(filePath, mimeType, page, wordsPerPage)
         └── extractTextContent(filePath, mimeType)
               └── (mammoth/pdf-parse library)
         └── (splits text, returns page)
```

---

## 3. Optimization Suggestions

- **extractTextContent:**
  - This reads and parses the entire file every time. For large books, this is slow.
  - **Optimization:** Cache the extracted text for each file (in memory or Redis).
- **Pagination:**
  - Currently, pagination is done in-memory after reading the whole file.
  - **Optimization:** Pre-process and store page splits, or cache the result of common pages (like page 1).
- **File Access:**
  - Minimize repeated disk reads by caching file buffers or using streams for very large files.

---

## 4. Summary Table

| Function                | Purpose                        | Key Steps / Libraries Used         |
|-------------------------|--------------------------------|------------------------------------|
| extractTextContent      | Extracts plain text            | mammoth, pdf-parse, fs             |
| extractHtmlContent      | Extracts HTML from DOCX         | mammoth, fs                        |
| getPaginatedContent     | Returns paginated content      | Calls extractTextContent, splits    |

---

## 5. Notes
- For further optimization, focus on caching and avoiding repeated full-file reads.
- Use profiling tools to identify bottlenecks in text extraction and file access.
- Consider asynchronous processing for very large files.
