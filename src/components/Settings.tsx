"use client";
import React, { useState, useEffect } from 'react';
import { useTheme, ThemeMode } from '../contexts/ThemeProvider';
import ISKCONLogo from './ISKCONLogo';

interface SettingsProps {
  onClose: () => void;
}

function applyFontSize(value: string) {
  const px = value === 'small' ? '14px' : value === 'large' ? '18px' : '16px';
  document.documentElement.style.fontSize = px;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();

  const [fontSize, setFontSizeState] = useState<string>('medium');

  useEffect(() => {
    const stored = localStorage.getItem('vedic_font_size') || 'medium';
    setFontSizeState(stored);
    applyFontSize(stored);
  }, []);

  const handleThemeChange = (value: string) => {
    setTheme(value as ThemeMode);
  };

  const handleFontSizeChange = (value: string) => {
    setFontSizeState(value);
    applyFontSize(value);
    localStorage.setItem('vedic_font_size', value);
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--input-text)',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.875rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const focusStyle = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--input-focus)';
    e.target.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.2)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--input-border)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--modal-overlay)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="vb-modal w-full relative" style={{ maxWidth: 420, padding: '2rem' }}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-lg font-bold"
          style={{ color: 'var(--text-muted)', lineHeight: 1 }}
          title="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <ISKCONLogo size={40} />
          <h2
            className="text-xl font-bold text-center"
            style={{ color: 'var(--modal-text)', fontFamily: '"Noto Serif Devanagari", Georgia, serif' }}
          >
            Preferences
          </h2>
          <div className="lotus-divider" style={{ width: '100%' }}>
            <span>✦</span>
          </div>
        </div>

        {/* Theme */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--modal-label)' }}>
            Theme
          </label>
          <select
            style={selectStyle}
            value={theme}
            onChange={e => handleThemeChange(e.target.value)}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            <option value="light">🌅 Light — Parchment</option>
            <option value="dark">🌙 Dark — Sandalwood Night</option>
            <option value="krishna">🌊 Midnight Teal</option>
            <option value="system">💻 System — Follow OS</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--modal-label)' }}>
            Text Size
          </label>
          <select
            style={selectStyle}
            value={fontSize}
            onChange={e => handleFontSizeChange(e.target.value)}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            <option value="small">Small</option>
            <option value="medium">Medium (Recommended)</option>
            <option value="large">Large</option>
          </select>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Changes apply instantly · 🙏 Hare Krishna
        </p>
      </div>
    </div>
  );
};

export default Settings;
