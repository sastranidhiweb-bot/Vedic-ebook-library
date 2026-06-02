import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import EBookReader from '../../components/EBookReader';
import BookDebugInfo from '../../components/BookDebugInfo';
import { Book } from '../../lib/bookStorage';

const HomePageContent = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<'reading' | 'upload' | 'debug'>('reading');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isGuestSessionExpired, setIsGuestSessionExpired] = useState(false);

  const bookIdFromQuery = searchParams.get('bookId') || '';
  const categoryFromQuery = searchParams.get('category') || '';
  const selectedBookId = selectedBook?._id || '';
  const activeBookId = selectedBookId || bookIdFromQuery;
  const isGuestReading = !isAuthenticated && !!activeBookId;

  useEffect(() => {
    if (!isGuestReading) {
      setIsGuestSessionExpired(false);
      return;
    }
    const minutes = Number(import.meta.env.VITE_GUEST_SESSION_MINUTES) || 20;
    const guestTimeout = setTimeout(() => {
      setIsGuestSessionExpired(true);
    }, minutes * 60 * 1000);
    return () => clearTimeout(guestTimeout);
  }, [isGuestReading, activeBookId]);

  // Only redirect to /login when the guest reading session has explicitly
  // timed out. Unauthenticated users can browse /homePage freely (they arrive
  // here from the tree / landing page). The 20-min timer starts only when they
  // open a book (isGuestReading becomes true).
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && isGuestSessionExpired) {
      const msg = 'Your guest reading session has timed out. Please sign up or log in to continue reading.';
      navigate(`/login?notice=${encodeURIComponent(msg)}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, isGuestSessionExpired, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--cream)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--deep-blue)' }}>Loading Vedic Library...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && isGuestSessionExpired) {
    return null; // redirect handled by useEffect above
  }

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('reading');
    // Persist the selected book in the URL so refresh restores it
    navigate(`/homePage?bookId=${book._id}`, { replace: true });
  };

  const handleLogout = () => {
    logout();
    setSelectedBook(null);
    setCurrentView('reading');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen" style={{ background: '#e8d5b7' }}>
      <main>
        {currentView === 'reading' && (
          <EBookReader
            bookId={activeBookId}
            title={selectedBook?.title}
            user={user || null}
            onLogout={isAuthenticated ? handleLogout : undefined}
            onBookSelect={handleBookSelect}
            onViewChange={setCurrentView}
            highlightCategory={categoryFromQuery || undefined}
          />
        )}

        {currentView === 'debug' && user?.role === 'admin' && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-6">
              <button
                onClick={() => setCurrentView('reading')}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-800 text-amber-100 rounded-lg hover:bg-amber-900 transition-colors"
              >
                <span>&larr; Back to Reading</span>
              </button>
            </div>
            <BookDebugInfo />
          </div>
        )}
      </main>
    </div>
  );
};

export default function HomePage() {
  return <HomePageContent />;
}