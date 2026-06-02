import React, { useState } from 'react';

interface ResetPasswordModalProps {
  open: boolean;
  email: string;
  otp: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ open, email, otp, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const handleReset = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Password reset successful!');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.35)'}}>
      <div
        className="relative w-full max-w-md p-8 rounded-2xl shadow-2xl border border-gray-700"
        style={{
          background: 'var(--card, rgba(30,32,40,0.95))',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-yellow-400 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
          style={{background: 'none', border: 'none'}}>
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-yellow-400 tracking-wide text-center">Reset Password</h2>
        <p className="mb-6 text-gray-400 text-center">Enter your new password below.</p>
        <input
          type="password"
          className="w-full px-4 py-3 mb-4 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-100 placeholder-gray-400 transition-all duration-300"
          placeholder="New password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full px-4 py-3 mb-4 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-100 placeholder-gray-400 transition-all duration-300"
          placeholder="Retype new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500 text-center mb-2">{error}</div>}
        {success && <div className="text-green-500 text-center mb-2">{success}</div>}
        <button
          className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-lg hover:shadow-yellow-400/25 hover:-translate-y-0.5 transition-all duration-300"
          onClick={handleReset}
          disabled={loading || !newPassword || !confirmPassword}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
