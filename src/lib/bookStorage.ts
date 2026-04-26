import { BACKEND_API_URL } from './config';
export interface Book {
  _id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  // category removed
  tags: string[];
  fileInfo: {
    gridfsId: string;
    originalName: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    fileExtension: string;
  };
  metadata: {
    totalPages?: number;
    isbn?: string;
    publishedDate?: string;
    publisher?: string;
    edition?: string;
  };
  uploadInfo: {
    uploadedBy: string;
    uploadDate: string;
    lastModified: string;
  };
  accessControl: {
    isPublic: boolean;
    accessLevel: string;
  };
  statistics: {
    viewCount: number;
    downloadCount: number;
    lastAccessed?: string;
  };
  isActive: boolean;
  type: 'normal' | 'special' | 'private';
  contentLength?: number;
}

export interface BookMetadata {
  books: Book[];
}

export interface HierarchyBookNode {
  _id: string;
  title: string;
  author: string;
  type: string;
  language: string;
}

export interface HierarchySubSubcategoryNode {
  name: string;
  books: HierarchyBookNode[];
}

export interface HierarchySubcategoryNode {
  name: string;
  books: HierarchyBookNode[];
  // subSubcategories removed
}

export interface HierarchyCategoryNode {
  name: string;
  // subcategories removed if not needed
}

// API functions for backend integration
export const fetchBooks = async (language?: string, page = 1, limit = 20): Promise<Book[]> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (language) {
      params.append('language', language);
    }
    
    const response = await fetch(`${BACKEND_API_URL}/books?${params}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data.books || [];
    } else {
      console.error('Failed to fetch books:', data.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    return [];
  }
};

export const getBookDetails = async (bookId: string): Promise<Book | null> => {
  try {
    console.log('Fetching book details for:', bookId);
    const response = await fetch(`${BACKEND_API_URL}/books/${bookId}`);
    
    console.log('Book details response status:', response.status);
    
    if (!response.ok) {
      console.error('Failed to get book details, status:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('Book details response data:', data);
    
    if (data.success) {
      // Backend returns { success: true, data: { book, readingProgress } }
      // We need to extract the book from data.book
      return data.data.book;
    } else {
      console.error('Failed to get book details:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error getting book details:', error);
    return null;
  }
};

export const fetchBookContent = async (bookId: string, page: number = 1, format: string = 'html'): Promise<{ content: string; metadata: Book; chapterswithPageNo?: any[]; pagination?: any } | null> => {
  try {
    // Get auth token from storage
    const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
    
    console.log('Getting book text content for ID:', bookId, 'page:', page, 'format:', format);
    
    // Build the request URL with pagination and format
    const params = new URLSearchParams({
      page: page.toString(),
      format: format // 'html' for formatted content, 'text' for plain text
    });
    
    const url = `${BACKEND_API_URL}/books/${bookId}/text?${params}`;
    console.log('Fetching book text from:', url);
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Fetch the readable text content
    const response = await fetch(url, { headers });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('Failed to fetch book content, status:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return null;
    }
    
    const data = await response.json();
    console.log('Book text response:', data);
    
    if (data.success) {
      const contentData = data.data;
      return {
        content: contentData.content,
        metadata: contentData.book as Book,
        chapterswithPageNo: contentData.chapterswithPageNo || [],
        pagination: {
          currentPage: contentData.currentPage,
          totalPages: contentData.totalPages,
          hasNextPage: contentData.hasNextPage,
          hasPrevPage: contentData.hasPrevPage,
          totalWords: contentData.totalWords,
          format: contentData.format
        }
      };
    } else {
      console.error('API returned error:', data.message);
      return null;
    }
    
  } catch (error) {
    console.error('Error fetching book content:', error);
    return null;
  }
};

export const uploadBook = async (file: File, metadata: { title: string; author: string; language: string; description?: string; tags?: string[]; type?: string }): Promise<Book | null> => {
  try {
    const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const formData = new FormData();
    formData.append('book', file);
    formData.append('title', metadata.title);
    formData.append('author', metadata.author);
    // category, subcategory and subSubcategory removed
    formData.append('language', metadata.language);
    
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    if (metadata.type) {
      formData.append('type', metadata.type);
    }
    if (metadata.tags && Array.isArray(metadata.tags)) {
      metadata.tags.forEach(tag => formData.append('tags', tag));
    }

    const response = await fetch(`${BACKEND_API_URL}/books`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Upload failed');
    }

    return result.data;
  } catch (error) {
    console.error('Error uploading book:', error);
    throw error;
  }
};

export const deleteBookFile = async (bookId: string): Promise<boolean> => {
  try {
    const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
    
    if (!token) {
      console.error('Authentication required');
      return false;
    }
    
    const response = await fetch(`${BACKEND_API_URL}/books/${bookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    return response.ok && result.success;
  } catch (error) {
    console.error('Error deleting book:', error);
    return false;
  }
};

// Reading progress (stored locally for user-specific data)
export const updateBookProgress = (bookId: string, currentPage: number, totalPages: number): void => {
  if (typeof window !== 'undefined') {
    const progress = { bookId, currentPage, totalPages, lastRead: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('book-progress') || '[]');
    const index = existing.findIndex((p: any) => p.bookId === bookId);
    
    if (index >= 0) {
      existing[index] = progress;
    } else {
      existing.push(progress);
    }
    
    localStorage.setItem('book-progress', JSON.stringify(existing));
  }
};

export const getBookProgress = (bookId: string): { currentPage: number; totalPages: number; lastRead?: string } | null => {
  if (typeof window !== 'undefined') {
    const progress = JSON.parse(localStorage.getItem('book-progress') || '[]');
    return progress.find((p: any) => p.bookId === bookId) || null;
  }
  return null;
};

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const fetchBooksHierarchyTree = async (language?: string): Promise<HierarchyCategoryNode[]> => {
  try {
    const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
    const params = new URLSearchParams();

    if (language) {
      params.append('language', language);
    }

    const query = params.toString();
    const url = `${BACKEND_API_URL}/books/tree${query ? `?${query}` : ''}`;
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok || !data.success) {
      return [];
    }

    return data.data?.tree || [];
  } catch (error) {
    console.error('Error fetching hierarchy tree:', error);
    return [];
  }
};