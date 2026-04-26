'use client';

import { BookOpen, Upload, List as ListIcon, Users, Link2 } from 'lucide-react';
import React, { useState } from 'react';
import BookListModal from './BookListModal';
import UnifiedBookUploadModal from './UnifiedBookUploadModal';
import { fetchBooks } from '../lib/bookStorage';
import UserManagementModal from './UserManagementModal';
import LinkBookModal from './LinkBookModal';

interface HeaderProps {
  user?: { role: string; username: string; name?: string } | null;
  authUser?: { role: string; username: string; name?: string } | null;
  onLogout?: () => void;
  onViewChange?: (view: 'reading' | 'upload' | 'debug') => void;
  onNavigate?: (section: 'vedic' | 'vaisnava' | 'classical') => void;
  showNavigation?: boolean;
}



const Header: React.FC<HeaderProps> = ({ user, authUser, onLogout, onViewChange, onNavigate, showNavigation = false }) => {
  const [showBooksModal, setShowBooksModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLinkBookModal, setShowLinkBookModal] = useState(false);
  const [categoryPanelRefreshKey, setCategoryPanelRefreshKey] = useState(0);

  // Handler to trigger category panel refresh
  const handleBookLinked = () => {
    setCategoryPanelRefreshKey(prev => prev + 1);
  };

  const handleShowBooks = async () => {
    setShowBooksModal(true);
    setLoadingBooks(true);
    try {
      const fetchedBooks = await fetchBooks(undefined, 1, 50);
      setBooks(fetchedBooks);
    } catch (e) {
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  // Dynamically set header background and text for light/dark theme
  let headerBg = 'var(--bg)';
  let headerTopText = 'var(--text)';
  let headerUserText = 'var(--text)';
  let headerButtonBg = 'var(--accent)';
  let headerButtonText = 'var(--deep-blue)';
  if (typeof window !== 'undefined') {
    const theme = document.body.getAttribute('data-theme');
    if (!theme || theme === 'light') {
      headerBg = 'var(--color-vb-header-top)';
      headerTopText = 'var(--color-vb-header-top-text)';
      headerUserText = 'var(--color-vb-normal-text)';
      headerButtonBg = 'var(--color-vb-action-bg)';
      headerButtonText = 'var(--color-vb-action-text)';
    } else if (theme === 'dark') {
      headerButtonBg = 'var(--button-orange-bg)';
      headerButtonText = 'var(--button-orange-text)';
    }
  }

  

  return (
    <>
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{
          background: headerBg,
          color: headerTopText,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6" style={{ color: headerTopText }} />
            <h1 className="text-xl font-bold" style={{ color: headerTopText }}>Vaisnava-Manjusha</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user?.name && (
              <span className="font-semibold user-badge" style={{ color: headerUserText }}>{user.name}</span>
            )}
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="icon-btn"
                  title="Upload Books"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowLinkBookModal(true)}
                  className="icon-btn"
                  title="Link a Book to Category"
                >
                  <Link2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShowBooks}
                  className="icon-btn"
                  title="Show All Books"
                >
                  <ListIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="icon-btn"
                  title="Manage Users"
                >
                  <Users className="w-5 h-5" />
                </button>
                    <style>{`
                      .icon-btn {
                        padding: 0.5rem;
                        border-radius: 0.75rem;
                        background: rgba(255,255,255,0.08);
                        color: var(--icon, #b97b2c);
                        transition: background 0.15s, color 0.15s;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                      }
                      .icon-btn:hover, .icon-btn:focus {
                        background: #fde68a;
                        color: #a16207;
                      }
                      .user-badge {
                        background: rgba(255,255,255,0.08);
                        border-radius: 0.75rem;
                        padding: 0.5rem 1.25rem;
                        margin-right: 0.25rem;
                        font-weight: 600;
                        font-size: 1.08rem;
                        transition: background 0.15s, color 0.15s;
                        display: inline-block;
                      }
                      .user-badge:hover, .user-badge:focus {
                        background: #fde68a;
                        color: #783f04 !important;
                      }
                    `}</style>
              </>
            )}
            {/* Profile icon removed, handled in SideNav */}
            {onLogout && (
              <button
                onClick={onLogout}
                className={`px-4 py-2 rounded-lg font-medium transition-colors${typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'dark' ? ' bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-600' : ''}`}
                style={{ background: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'dark' ? undefined : headerButtonBg, color: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'dark' ? undefined : headerButtonText }}
                title="Logout"
              >
                Logout
              </button>
            )}
          </div>
        </div>
        {/* Profile modal removed, handled in SideNav */}
      </div>
      <BookListModal
        open={showBooksModal}
        onClose={() => setShowBooksModal(false)}
        books={books}
      />
      {showUploadModal && (
        <UnifiedBookUploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => setShowUploadModal(false)}
        />
      )}
      {showBooksModal && loadingBooks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg px-8 py-6 flex flex-col items-center">
            <span className="text-lg font-semibold mb-2">Loading books...</span>
            <div className="loader border-4 border-yellow-400 border-t-transparent rounded-full w-8 h-8 animate-spin"></div>
          </div>
        </div>
      )}
      <UserManagementModal open={showUserModal} onClose={() => setShowUserModal(false)} />
      <LinkBookModal open={showLinkBookModal} onClose={() => setShowLinkBookModal(false)} onBookLinked={handleBookLinked} />
    </>
  );
};

export default Header;