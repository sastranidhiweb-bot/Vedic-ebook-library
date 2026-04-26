'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Suspense } from 'react';
import Login from '../components/Login';
import EBookReader from '../components/EBookReader';
// import FileUpload from '../components/FileUpload';
import BookDebugInfo from '../components/BookDebugInfo';
import { Book } from '../lib/bookStorage';

const AppContent = () => {
  const { isAuthenticated, user, logout, login, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<'reading' | 'upload' | 'debug'>('reading');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isGuestSessionExpired, setIsGuestSessionExpired] = useState(false);
  const bookIdFromQuery = searchParams.get('bookId') || '';
  const selectedBookId = selectedBook?._id || '';
  const activeBookId = selectedBookId || bookIdFromQuery;
  const isGuestReading = !isAuthenticated && !!activeBookId;

  useEffect(() => {
    if (!isGuestReading) {
      setIsGuestSessionExpired(false);
      return;
    }

    const guestTimeout = setTimeout(() => {
      setIsGuestSessionExpired(true);
    }, 1 * 60 * 1000);

    return () => clearTimeout(guestTimeout);
  }, [isGuestReading, activeBookId]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: 'var(--cream)'}}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{color: 'var(--deep-blue)'}}>Loading Vedic Library...</p>
        </div>
      </div>
    );
  }

  // Show login if unauthenticated and no guest book session
  if (!isAuthenticated && (!activeBookId || isGuestSessionExpired)) {
    const guestTimeoutMessage = isGuestSessionExpired
      ? 'Your guest reading session has timed out. Please sign up or log in to continue reading.'
      : undefined;

    return <Login onLoginSuccess={(user, token) => {
      setIsGuestSessionExpired(false);
      login(user, token);
    }} noticeMessage={guestTimeoutMessage} />;
  }

  // Handle book selection
  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('reading');
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setSelectedBook(null);
    setCurrentView('reading');
  };

  return (
    <div className="min-h-screen" style={{background: '#e8d5b7'}}>
      <main>
        {currentView === 'reading' && (
          <EBookReader 
            bookId={activeBookId} 
            title={selectedBook?.title}
            user={user || null}
            onLogout={isAuthenticated ? handleLogout : undefined}
            onBookSelect={handleBookSelect}
            onViewChange={setCurrentView}
          />
        )}
        
        {/* Upload modal is now handled in Header, not here */}
        
        {currentView === 'debug' && user?.role === 'admin' && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-6">
              <button
                onClick={() => setCurrentView('reading')}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-800 text-amber-100 rounded-lg hover:bg-amber-900 transition-colors"
              >
                <span>← Back to Reading</span>
              </button>
            </div>
            <BookDebugInfo />
          </div>
        )}
      </main>
    </div>
  );
};

export default function Home() {
  return (
    <AuthProvider>
      <Suspense>
        <AppContent />
      </Suspense>
    </AuthProvider>
  );
}


