import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  // Editable fields
  const [editMode, setEditMode] = useState(false);
  const [dob, setDob] = useState(user.dob ? user.dob.slice(0, 10) : '');
  const [contactNo, setContactNo] = useState(user.contactNo || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await onChangePassword(oldPassword, newPassword);
      setSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'light' ? 'var(--color-vb-normal-text)' : 'var(--color-vb-header-bottom, #eebd89)' }}>User Profile</h2>
        <div className="space-y-2 mb-6" style={{ color: typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'light' ? 'var(--color-vb-normal-text)' : 'var(--modal-text)' }}>
          <div><span className="font-semibold">Name:</span> {user.name || '-'}</div>
          <div><span className="font-semibold">Username:</span> {user.username}</div>
          <div><span className="font-semibold">Email:</span> {user.email || '-'}</div>
          <div>
            <span className="font-semibold">DOB:</span>{' '}
            {editMode ? (
              <input
                type="date"
                className="rounded px-2 py-1"
                style={{
                  background: 'var(--modal-input-bg)',
                  border: '1px solid var(--color-vb-input-border) !important',
                  color: 'var(--modal-input-text)',
                  boxShadow: '0 0 0 2px var(--modal-input-ring, transparent)',
                }}
                value={dob}
                onChange={e => setDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            ) : (
              user.dob ? new Date(user.dob).toLocaleDateString() : '-'
            )}
          </div>
          <div>
            <span className="font-semibold">Contact No:</span>{' '}
            {editMode ? (
              <input
                type="text"
                className="rounded px-2 py-1"
                style={{
                  background: 'var(--modal-input-bg)',
                  border: '1px solid var(--color-vb-input-border) !important',
                  color: 'var(--modal-input-text)',
                  boxShadow: '0 0 0 2px var(--modal-input-ring, transparent)',
                }}
                value={contactNo}
                onChange={e => setContactNo(e.target.value)}
                maxLength={20}
              />
            ) : (
              user.contactNo || '-'
            )}
          </div>
          <div><span className="font-semibold">Role:</span> {user.role || 'user'}</div>
        </div>
        {!editMode && (
          <button
            className="w-full py-2 px-4 rounded-lg font-medium mb-2"
            style={{
              background: 'var(--color-vb-action-bg)',
              color: 'var(--color-vb-action-text)',
              transition: 'background 0.2s, color 0.2s',
            }}
            onClick={() => setEditMode(true)}
          >
            Edit Profile
          </button>
        )}
        {editMode && (
          <form
            className="space-y-4 mb-2"
            onSubmit={async e => {
              e.preventDefault();
              setProfileLoading(true);
              setError('');
              setSuccess('');
              try {
                const authToken = token || localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
                const { BACKEND_API_URL } = await import('../lib/config');
                const res = await fetch(`${BACKEND_API_URL}/api/auth/profile`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                  },
                  body: JSON.stringify({ dob, contactNo }),
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.message || 'Failed to update profile');
                }
                const updated = await res.json();
                setSuccess('Profile updated successfully');
                setEditMode(false);
                // Update user in AuthContext so UI reflects changes
                if (updated && updated.data && updated.data.user) {
                  login(updated.data.user, authToken || "");
                }
              } catch (err: any) {
                setError(err.message || 'Failed to update profile');
              } finally {
                setProfileLoading(false);
              }
            }}
          >
            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-yellow-500 text-gray-900 font-semibold hover:bg-yellow-600 transition-all"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-200 font-semibold hover:bg-gray-600 transition-all"
                onClick={() => { setEditMode(false); setDob(user.dob ? user.dob.slice(0, 10) : ''); setContactNo(user.contactNo || ''); }}
                disabled={profileLoading}
              >
                Cancel
              </button>
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {success && <div className="text-green-400 text-sm">{success}</div>}
          </form>
        )}
        {!showChangePassword ? (
          <button
            className="w-full py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-600 transition-all mb-2"
            onClick={() => setShowChangePassword(true)}
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4 mb-2">
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 pr-10"
                placeholder="Current Password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
                tabIndex={-1}
                onClick={() => setShowOld(v => !v)}
              >
                {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 pr-10"
                placeholder="New Password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
                tabIndex={-1}
                onClick={() => setShowNew(v => !v)}
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 pr-10"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
                tabIndex={-1}
                onClick={() => setShowConfirm(v => !v)}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {success && <div className="text-green-400 text-sm">{success}</div>}
            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-yellow-500 text-gray-900 font-semibold hover:bg-yellow-600 transition-all"
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-200 font-semibold hover:bg-gray-600 transition-all"
                onClick={() => setShowChangePassword(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
