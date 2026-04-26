'use client';

import { useState, useEffect } from 'react';
import { fetchBooks, Book } from '../lib/bookStorage';
import { FileText, Calendar, User, HardDrive } from 'lucide-react';

const BookDebugInfo: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const fetchedBooks = await fetchBooks();
        setBooks(fetchedBooks);
      } catch (error) {
        console.error('Error loading books:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBooks();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const totalStorage = books.reduce((total, book) => total + (book.contentLength || 0), 0);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="animate-pulse">
          <FileText className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--saffron)'}} />
          <p>Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 p-4 rounded-lg" style={{background: 'var(--cream)'}}>
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--deep-blue)'}}>
          📚 Your Uploaded Books Debug Info
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <FileText className="w-6 h-6 mx-auto mb-2" style={{color: 'var(--saffron)'}} />
            <div className="font-bold">{books.length}</div>
            <div className="text-sm opacity-75">Total Books</div>
          </div>
          
          <div className="text-center">
            <HardDrive className="w-6 h-6 mx-auto mb-2" style={{color: 'var(--saffron)'}} />
            <div className="font-bold">
              {totalStorage > 1024 * 1024 
                ? `${(totalStorage / 1024 / 1024).toFixed(1)}MB`
                : `${Math.round(totalStorage / 1024)}KB`
              }
            </div>
            <div className="text-sm opacity-75">Content Size</div>
          </div>
          
          <div className="text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2" style={{color: 'var(--saffron)'}} />
            <div className="font-bold">
              {books.length > 0 ? formatDate(books[books.length - 1].uploadInfo.uploadDate) : 'None'}
            </div>
            <div className="text-sm opacity-75">Last Upload</div>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-2 rounded-lg transition-colors"
          style={{
            background: 'var(--saffron)',
            color: 'var(--deep-blue)'
          }}
        >
          {showDetails ? 'Hide Details' : 'Show Book Details'}
        </button>
      </div>

      {showDetails && books.length > 0 && (
        <div className="space-y-4">
          {books.map((book, index) => (
            <div 
              key={book._id}
              className="p-4 rounded-lg border"
              style={{background: 'var(--cream)', borderColor: 'var(--saffron)'}}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold" style={{color: 'var(--deep-blue)'}}>
                  {index + 1}. {book.title}
                </h4>
                <span className="text-xs px-2 py-1 rounded" style={{background: 'var(--saffron)', color: 'var(--deep-blue)'}}>
                  {book.fileInfo?.fileSize}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" style={{color: 'var(--saffron)'}} />
                  <span>Author: {book.author || 'Not specified'}</span>
                </div>
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" style={{color: 'var(--saffron)'}} />
                  <span>File: {book.fileInfo?.originalName || book.fileInfo?.filename}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" style={{color: 'var(--saffron)'}} />
                  <span>Uploaded: {formatDate(book.uploadInfo?.uploadDate)}</span>
                </div>
                <div className="flex items-center">
                  <HardDrive className="w-4 h-4 mr-2" style={{color: 'var(--saffron)'}} />
                  <span>Content: {book.contentLength ? `${Math.round(book.contentLength / 1024)}KB` : 'Unknown'}</span>
                </div>
              </div>
              
              {book.description && (
                <div className="mt-2 text-sm opacity-75">
                  <strong>Description:</strong> {book.description}
                </div>
              )}
              
              {book.tags && book.tags.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {book.tags.map((tag, tagIndex) => (
                      <span 
                        key={tagIndex}
                        className="px-2 py-1 text-xs rounded"
                        style={{background: 'var(--deep-blue)', color: 'var(--cream)'}}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {book.metadata?.totalPages && (
                <div className="mt-2 text-sm">
                  <strong>Total Pages:</strong> {book.metadata.totalPages}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {books.length === 0 && (
        <div className="text-center py-8" style={{color: 'var(--deep-blue)'}}>
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No books uploaded yet</p>
          <p className="text-sm opacity-75">Upload a Word document to see it here</p>
        </div>
      )}
    </div>
  );
};

export default BookDebugInfo;