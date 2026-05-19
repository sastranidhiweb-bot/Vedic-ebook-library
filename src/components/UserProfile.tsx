'use client';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, User } from 'lucide-react';
import ISKCONLogo from './ISKCONLogo';
import { BACKEND_API_URL } from '../lib/config';

interface UserProfileProps {
  user: {
    name?: string;
    username: string;
    email?: string;
    dob?: string;
    contactNo?: string;
    role?: string;
  };
  onClose: () => void;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onClose, onChangePassword }) => {
  const { login, token } = useAuth();
  const [showChangePw, setShowChangePw]     = useState(false);
  const [oldPw, setOldPw]                   = useState('');
  const [newPw, setNewPw]                   = useState('');
  const [confirmPw, setConfirmPw]           = useState('');
  const [showOld, setShowOld]               = useState(false);
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [loading, setLoading]               = useState(false);
  const [editMode, setEditMode]             = useState(false);
  const [dob, setDob]                       = useState(user.dob ? user.dob.slice(0, 10) : '');
  const [contactNo, setContactNo]           = useState(user.contactNo || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await onChangePassword(oldPw, newPw);
      setSuccess('Password changed successfully');
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setShowChangePw(false);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setError(''); setSuccess('');
    try {
      const tkn =
        token ||
        localStorage.getItem('vedic_auth_token') ||
        sessionStorage.getItem('vedic_auth_token');
      const res = await fetch(`${BACKEND_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tkn}` },
        body: JSON.stringify({ dob, contactNo }),
      });
      const updated = await res.json();
      if (res.ok && updated?.data?.user) {
        login(updated.data.user, tkn || '');
        setSuccess('Profile updated!');
        setEditMode(false);
      } else {
        setError(updated.message || 'Failed to update profile');
      }
    } catch {
      setError('Failed to update profile');
    }
    setProfileLoading(false);
  };

  /* ── Shared input style ─────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--input-text)',
    borderRadius: '0.5rem',
    padding: '0.6rem 0.875rem',
    width: '100%',
    fontSize: '0.9rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--modal-label)',
    marginBottom: '0.3rem',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(251,191,36,0.15)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--modal-overlay)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="vb-modal w-full relative overflow-y-auto"
        style={{ maxWidth: 440, padding: '2rem', maxHeight: '92vh' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-lg font-bold"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 64, height: 64,
              background: 'linear-gradient(135deg, var(--btn-primary-from), var(--btn-primary-to))',
              boxShadow: '0 4px 20px rgba(251,191,36,0.4)',
            }}
          >
            {user.role === 'admin'
              ? <ISKCONLogo size={44} />
              : <User className="w-7 h-7" style={{ color: 'var(--btn-primary-text)' }} />}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold" style={{ color: 'var(--modal-text)' }}>
              {user.name || user.username}
            </h2>
            {user.role && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: user.role === 'admin'
                    ? 'linear-gradient(135deg,#d97706,#fbbf24)'
                    : 'rgba(251,191,36,0.15)',
                  color: user.role === 'admin' ? '#1a0c00' : 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
              >
                {user.role === 'admin' ? '👑 Admin' : '📖 Devotee'}
              </span>
            )}
          </div>
        </div>

        <div className="lotus-divider"><span>✦</span></div>

        {/* Info rows */}
        <div className="mb-5" style={{ fontSize: '0.88rem' }}>
          {[
            { label: 'Username', val: user.username },
            { label: 'Email',    val: user.email || '—' },
          ].map(({ label, val }) => (
            <div key={label} style={rowStyle}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
              <span style={{ color: 'var(--modal-text)' }}>{val}</span>
            </div>
          ))}

          {/* Editable: DOB */}
          <div style={rowStyle}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Date of Birth</span>
            {editMode
              ? <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem' }} />
              : <span style={{ color: 'var(--modal-text)' }}>{dob || '—'}</span>
            }
          </div>

          {/* Editable: Contact */}
          <div style={rowStyle}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Contact</span>
            {editMode
              ? <input type="text" value={contactNo} onChange={e => setContactNo(e.target.value)}
                  style={{ ...inputStyle, width: 140, padding: '0.3rem 0.5rem' }}
                  placeholder="Phone number" />
              : <span style={{ color: 'var(--modal-text)' }}>{contactNo || '—'}</span>
            }
          </div>
        </div>

        {/* Edit / Save profile row */}
        <div className="flex gap-2 mb-5">
          {editMode ? (
            <>
              <button
                onClick={handleSaveProfile}
                disabled={profileLoading}
                className="vb-btn-primary flex-1"
                style={{ padding: '0.5rem', fontSize: '0.875rem' }}
              >
                {profileLoading ? 'Saving…' : 'Save Profile'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="vb-btn-dark flex-1"
                style={{ padding: '0.5rem', fontSize: '0.875rem', background: 'rgba(251,191,36,0.12)', color: 'var(--modal-text)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="vb-btn-dark w-full"
              style={{ padding: '0.5rem', fontSize: '0.875rem', background: 'rgba(251,191,36,0.1)', color: 'var(--modal-text)', border: '1px solid var(--border)' }}
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* Change password toggle */}
        <button
          onClick={() => setShowChangePw(v => !v)}
          className="w-full text-sm font-semibold mb-3"
          style={{ color: 'var(--accent-deep)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showChangePw ? '▲ Hide' : '▼ Change Password'}
        </button>

        {showChangePw && (
          <form onSubmit={handlePasswordChange} className="space-y-3 mb-4">
            {[
              { id: 'old',     val: oldPw,     set: setOldPw,     show: showOld,    setShow: setShowOld,    placeholder: 'Current password' },
              { id: 'new',     val: newPw,     set: setNewPw,     show: showNew,    setShow: setShowNew,    placeholder: 'New password' },
              { id: 'confirm', val: confirmPw, set: setConfirmPw, show: showConfirm, setShow: setShowConfirm, placeholder: 'Confirm new password' },
            ].map(f => (
              <div key={f.id} className="relative">
                <input
                  type={f.show ? 'text' : 'password'}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  placeholder={f.placeholder}
                  required
                />
                <button
                  type="button"
                  onClick={() => f.setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="vb-btn-dark w-full"
              style={{ padding: '0.6rem', fontSize: '0.875rem' }}
            >
              {loading ? 'Changing…' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Feedback */}
        {success && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(21,128,61,0.1)', color: 'var(--modal-success)' }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--modal-error)' }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          🙏 Hare Krishna • Hare Rama 🙏
        </p>
      </div>
    </div>
  );
};

export default UserProfile;
