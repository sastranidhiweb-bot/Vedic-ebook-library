"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { user, token: contextToken, login } = useAuth();
  // Fallback to token from storage if context is empty (handles refresh edge cases)
  const token = contextToken ||
    (typeof window !== 'undefined' && (localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token')));
  const [theme, setTheme] = useState(user?.profile?.preferences?.theme || 'dark');
  const [fontSize, setFontSize] = useState(user?.profile?.preferences?.fontSize || 'medium');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { BACKEND_API_URL } = await import('../lib/config');
      const res = await fetch(`${BACKEND_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          'profile.preferences.theme': theme,
          'profile.preferences.fontSize': fontSize
        }),
      });
      const updated = await res.json();
      if (res.ok && updated && updated.data && updated.data.user) {
        login(updated.data.user, token || "");
        // Apply theme and font size immediately
        if (typeof window !== 'undefined') {
          document.body.setAttribute('data-theme', theme);
          document.body.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
        }
        setSuccess('Preferences saved!');
      } else {
        setError(updated.message || 'Failed to save preferences');
      }
    } catch (err) {
      setError('Failed to save preferences');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="rounded-xl p-8 w-full max-w-md relative"
        style={{
          background: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'light' ? 'var(--bg)' : 'var(--modal-bg)',
          color: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'light' ? 'var(--color-vb-normal-text)' : 'var(--modal-text)',
          border: '1px solid var(--color-vb-input-border)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3"
          style={{
            color:
              typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'dark'
                ? 'var(--button-orange-bg)'
                : 'var(--color-vb-input-border)'
          }}
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'light' ? 'var(--color-vb-normal-text)' : 'var(--color-vb-header-bottom, #eebd89)' }}>Settings</h2>
        <div className="mb-4">
          <label className="block font-semibold mb-1" style={{ color: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'light' ? 'var(--color-vb-normal-text)' : 'var(--modal-label)' }}>Theme</label>
          <select
            className="rounded px-2 py-1 w-full focus:outline-none focus:ring-2"
            style={{
              background: 'var(--modal-input-bg)',
              border: '1px solid var(--color-vb-input-border) !important',
              color: 'var(--modal-input-text)',
              boxShadow: '0 0 0 2px var(--modal-input-ring, transparent)',
            }}
            value={theme}
            onChange={e => setTheme(e.target.value)}
          >
            <option value="light">Light (Default)</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1" style={{ color: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'light' ? 'var(--color-vb-normal-text)' : 'var(--modal-label)' }}>Font Size</label>
          <select
            className="rounded px-2 py-1 w-full focus:outline-none focus:ring-2"
            style={{
              background: 'var(--modal-input-bg)',
              border: '1px solid var(--color-vb-input-border) !important',
              color: 'var(--modal-input-text)',
              boxShadow: '0 0 0 2px var(--modal-input-ring, transparent)',
            }}
            value={fontSize}
            onChange={e => setFontSize(e.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium (Default)</option>
            <option value="large">Large</option>
          </select>
        </div>
        {success && <div style={{ color: 'var(--modal-success)' }} className="mb-2">{success}</div>}
        {error && <div style={{ color: 'var(--modal-error)' }} className="mb-2">{error}</div>}
        <button
          className="font-bold py-2 px-4 rounded w-full"
          style={{
            background: 'var(--color-vb-action-bg)',
            color: 'var(--color-vb-action-text)',
            transition: 'background 0.2s, color 0.2s',
          }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
