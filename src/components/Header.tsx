'use client';

import { Upload, List as ListIcon, Users, Link2, ZoomIn, ZoomOut, Settings as SettingsIcon, User, Menu, LogOut, X } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import BookListModal from './BookListModal';
import UnifiedBookUploadModal from './UnifiedBookUploadModal';
import { fetchBooks } from '../lib/bookStorage';
import UserManagementModal from './UserManagementModal';
import LinkBookModal from './LinkBookModal';
import ISKCONLogo from './ISKCONLogo';
import Settings from './Settings';
import UserProfile from './UserProfile';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  user?: { role: string; username: string; name?: string } | null;
  authUser?: { role: string; username: string; name?: string } | null;
  onLogout?: () => void;
  onViewChange?: (view: 'reading' | 'upload' | 'debug') => void;
  selectedLanguage?: string;
  languageConfig?: { [key: string]: { label: string; code: string; icon: string; count: number } };
  onLanguageToggle?: (lang: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  selectedLanguage,
  languageConfig,
  onLanguageToggle,
  onZoomIn,
  onZoomOut,
}) => {
  const { user: authUser } = useAuth();
  const [showBooksModal, setShowBooksModal]       = useState(false);
  const [showUploadModal, setShowUploadModal]     = useState(false);
  const [books, setBooks]                         = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks]           = useState(false);
  const [showUserModal, setShowUserModal]         = useState(false);
  const [showLinkBookModal, setShowLinkBookModal] = useState(false);
  const [showSettings, setShowSettings]           = useState(false);
  const [showProfile, setShowProfile]             = useState(false);
  const [showMobileMenu, setShowMobileMenu]       = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMobileMenu]);

  const handleShowBooks = async () => {
    setShowBooksModal(true);
    setLoadingBooks(true);
    try {
      const fetched = await fetchBooks(undefined, 1, 50);
      setBooks(fetched);
    } catch {
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    const token =
      localStorage.getItem('vedic_auth_token') ||
      sessionStorage.getItem('vedic_auth_token');
    const { BACKEND_API_URL } = await import('../lib/config');
    const res = await fetch(`${BACKEND_API_URL}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: oldPassword, newPassword, confirmPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to change password');
    }
  };

  const pillStyle = (isActive: boolean) => ({
    padding: '0.2rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: isActive ? 700 : 500,
    border: `1.5px solid ${isActive ? 'var(--lang-pill-active-border)' : 'var(--header-badge-border)'}`,
    background: isActive ? 'var(--lang-pill-active-bg)' : 'var(--header-badge-bg)',
    color: isActive ? 'var(--lang-pill-active-text)' : 'var(--icon)',
    boxShadow: isActive ? '0 0 0 2px var(--lang-pill-active-border)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    lineHeight: 1.5,
  });

  return (
    <>
      {/* ── Top decorative stripe ───────────────────────────────── */}
      <div style={{
        height: '3px',
        background: 'var(--stripe-gradient)',
      }} />

      {/* ── Main header bar ─────────────────────────────────── */}
      <header
        ref={headerRef}
        className="px-3 flex-shrink-0 relative overflow-x-clip"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--header-border)',
          boxShadow: 'var(--header-shadow)',
        }}
      >
        <div
          className="max-w-screen-2xl mx-auto flex items-center gap-2 min-w-0"
          style={{ minHeight: '52px' }}
        >
          {/* ── Brand ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex items-center justify-center rounded-full border flex-shrink-0"
              style={{
                borderColor: 'var(--header-badge-border)',
                background: 'var(--header-badge-bg)',
                width: 36,
                height: 36,
              }}
            >
              <ISKCONLogo size={26} />
            </div>
            <div className="min-w-0">
              <h1
                className="font-bold leading-tight tracking-wide truncate max-w-[9.75rem] sm:max-w-none"
                style={{
                  color: 'var(--header-text)',
                  fontSize: '0.95rem',
                  fontFamily: '"Noto Serif Devanagari", Georgia, serif',
                }}
              >
                Vaiṣṇava-Mañjūṣā
              </h1>
              <p
                className="hidden sm:block"
                style={{
                  color: 'var(--text-light)',
                  fontSize: '0.55rem',
                  letterSpacing: '0.08em',
                  lineHeight: 1.2,
                }}
              >
                वैष्णव मञ्जूषा · Vedic Digital Library
              </p>
            </div>
          </div>

          {/* ── Spacer ──────────────────────────────────────── */}
          <div style={{ flex: 1 }} />

          {/* ── Language pills — desktop only ───────────────── */}
          {languageConfig && onLanguageToggle && (
            <div className="hidden md:flex items-center gap-1">
              {Object.entries(languageConfig).map(([langKey, cfg]) => (
                <button
                  key={langKey}
                  onClick={() => onLanguageToggle(langKey)}
                  style={pillStyle(selectedLanguage === langKey)}
                  title={cfg.label}
                >
                  {cfg.code}
                </button>
              ))}
            </div>
          )}

          {/* ── Right controls ───────────────────────────────── */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Zoom controls — desktop only */}
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="hidden md:inline-flex icon-btn"
                title="Zoom In"
                style={{ width: 32, height: 32 }}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            )}
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="hidden md:inline-flex icon-btn"
                title="Zoom Out"
                style={{ width: 32, height: 32 }}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Admin actions — desktop only */}
            {user?.role === 'admin' && (
              <div className="hidden md:flex items-center gap-1">
                <button onClick={() => setShowUploadModal(true)} className="icon-btn" title="Upload Books" style={{ width: 32, height: 32 }}>
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowLinkBookModal(true)} className="icon-btn" title="Link Book to Category" style={{ width: 32, height: 32 }}>
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleShowBooks} className="icon-btn" title="All Books" style={{ width: 32, height: 32 }}>
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowUserModal(true)} className="icon-btn" title="Manage Users" style={{ width: 32, height: 32 }}>
                  <Users className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Settings */}
            <button onClick={() => setShowSettings(true)} className="icon-btn" title="Settings" style={{ width: 32, height: 32 }}>
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>

            {/* User name pill / profile */}
            {user?.name && (
              <button
                onClick={() => setShowProfile(true)}
                title="My Profile"
                className="hidden sm:flex"
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1.5px solid var(--header-badge-border)',
                  background: 'var(--header-badge-bg)',
                  color: 'var(--icon)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s',
                  maxWidth: '120px',
                  overflow: 'hidden',
                }}
              >
                <User className="w-3 h-3 flex-shrink-0" style={{ opacity: 0.7 }} />
                <span className="hidden sm:inline truncate">{user.name}</span>
              </button>
            )}

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  padding: '0.25rem 0.7rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: 'var(--logout-bg)',
                  color: 'var(--logout-color)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--logout-bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--logout-bg)')}
                title="Logout"
              >
                <span className="hidden sm:inline">Logout</span>
                <LogOut className="w-3.5 h-3.5 sm:hidden" />
              </button>
            )}

            {/* Mobile hamburger — shows extra controls */}
            <button
              className="md:hidden icon-btn header-mobile-menu-btn"
              onClick={() => setShowMobileMenu(v => !v)}
              title="More options"
              style={{ width: 32, height: 32 }}
            >
              {showMobileMenu ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ─────────────────────────── */}
        {showMobileMenu && (
          <div
            className="md:hidden absolute left-0 right-0 z-50 px-4 py-3"
            style={{
              top: '100%',
              background: 'var(--header-bg)',
              borderTop: '1px solid var(--header-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            {/* Language selection */}
            {languageConfig && onLanguageToggle && (
              <div className="mb-3">
                <p style={{ color: 'rgba(254,243,199,0.55)', fontSize: '0.65rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Language</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(languageConfig).map(([langKey, cfg]) => (
                    <button
                      key={langKey}
                      onClick={() => { onLanguageToggle(langKey); setShowMobileMenu(false); }}
                      style={pillStyle(selectedLanguage === langKey)}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zoom controls */}
            <div className="mb-3">
              <p style={{ color: 'rgba(254,243,199,0.55)', fontSize: '0.65rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Text Zoom</p>
              <div className="flex gap-2">
                {onZoomIn && (
                  <button
                    onClick={() => { onZoomIn(); }}
                    className="icon-btn flex items-center gap-1.5"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--header-text)' }}
                  >
                    <ZoomIn className="w-4 h-4" /> Zoom In
                  </button>
                )}
                {onZoomOut && (
                  <button
                    onClick={() => { onZoomOut(); }}
                    className="icon-btn flex items-center gap-1.5"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--header-text)' }}
                  >
                    <ZoomOut className="w-4 h-4" /> Zoom Out
                  </button>
                )}
              </div>
            </div>

            {/* Admin actions */}
            {user?.role === 'admin' && (
              <div>
                <p style={{ color: 'rgba(254,243,199,0.55)', fontSize: '0.65rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Admin</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setShowUploadModal(true); setShowMobileMenu(false); }}
                    className="icon-btn flex items-center gap-1.5"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--header-text)' }}
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                  <button
                    onClick={() => { setShowLinkBookModal(true); setShowMobileMenu(false); }}
                    className="icon-btn flex items-center gap-1.5"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--header-text)' }}
                  >
                    <Link2 className="w-4 h-4" /> Link Book
                  </button>
                  <button
                    onClick={() => { handleShowBooks(); setShowMobileMenu(false); }}
                    className="icon-btn flex items-center gap-1.5"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--header-text)' }}
                  >
                    <ListIcon className="w-4 h-4" /> All Books
                  </button>
                  <button
                    onClick={() => { setShowUserModal(true); setShowMobileMenu(false); }}
                    className="icon-btn flex items-center gap-1.5"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--header-text)' }}
                  >
                    <Users className="w-4 h-4" /> Users
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Modals ──────────────────────────────────────────── */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--modal-overlay)' }}>
          <div className="vb-modal px-8 py-6 flex flex-col items-center gap-4">
            <div className="vb-spinner w-10 h-10" />
            <span style={{ color: 'var(--modal-text)', fontWeight: 600 }}>Loading books…</span>
          </div>
        </div>
      )}
      <UserManagementModal open={showUserModal} onClose={() => setShowUserModal(false)} />
      <LinkBookModal open={showLinkBookModal} onClose={() => setShowLinkBookModal(false)} onBookLinked={() => {}} />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showProfile && authUser && (
        <UserProfile
          user={authUser}
          onClose={() => setShowProfile(false)}
          onChangePassword={(old, newPw) => handleChangePassword(old, newPw, newPw)}
        />
      )}
    </>
  );
};

export default Header;
