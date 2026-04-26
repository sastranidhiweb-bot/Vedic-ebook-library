import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Pre-import PDF parser to avoid runtime issues
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.warn('⚠️ PDF parser not available:', error.message);
}

/**
 * Extract readable text content from various file formats
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} - Extracted text content
 */
export const extractTextContent = async (filePath, mimeType) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension === '.docx' || mimeType.includes('wordprocessingml')) {
      // Extract text from DOCX files
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (fileExtension === '.pdf' || mimeType.includes('pdf')) {
      // Extract text from PDF files
      if (!pdfParse) {
        throw new Error('PDF parser not available. Please ensure pdf-parse is installed.');
      }
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buffer);
      return pdfData.text || '';
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  } catch (error) {
    console.error('Error extracting text content:', error);
    throw error;
  }
};

/**
 * Extract HTML content from DOCX files (preserves formatting)
 * @param {string} filePath - Path to the DOCX file
 * @returns {Promise<string>} - Extracted HTML content
 */
export const extractHtmlContent = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting HTML content:', error);
    throw error;
  }
};

/**
 * Get file content with pagination support
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @param {number} page - Page number (for pagination)
 * @param {number} wordsPerPage - Number of words per page
 * @returns {Promise<object>} - Paginated content object
 */
export const getPaginatedContent = async (filePath, mimeType, page = 1, wordsPerPage = 500) => {
  try {
    const fullText = await extractTextContent(filePath, mimeType);
    
    // Split text into words
    const words = fullText.split(/\s+/).filter(word => word.trim().length > 0);
    const totalWords = words.length;
    const totalPages = Math.ceil(totalWords / wordsPerPage);
    
    // Calculate start and end indices for the requested page
    const startIndex = (page - 1) * wordsPerPage;
    const endIndex = Math.min(startIndex + wordsPerPage, totalWords);
    
    // Get words for the current page
    const pageWords = words.slice(startIndex, endIndex);
    const pageContent = pageWords.join(' ');
    
    return {
      content: pageContent,
      currentPage: page,
      totalPages,
      totalWords,
      wordsOnPage: pageWords.length,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  } catch (error) {
    console.error('Error getting paginated content:', error);
    throw error;
  }
};