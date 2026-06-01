import React, { useState } from 'react';
import { BACKEND_API_URL } from '../lib/config';

interface VerifyOtpModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
  onSuccess: (otp: string) => void;
}

const VerifyOtpModal: React.FC<VerifyOtpModalProps> = ({ open, email, onClose, onSuccess }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(otp);
      } else {
        setError(data.message || 'Invalid or expired OTP.');
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
        <h2 className="text-2xl font-bold mb-4 text-yellow-400 tracking-wide text-center">Verify OTP</h2>
        <p className="mb-6 text-gray-400 text-center">Enter the 6-digit code sent to your email.</p>
        <input
          type="text"
          className="w-full px-4 py-3 mb-4 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-100 placeholder-gray-400 transition-all duration-300"
          placeholder="Enter OTP"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
          maxLength={6}
          required
        />
        {error && <div className="text-red-500 text-center mb-2">{error}</div>}
        <button
          className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-lg hover:shadow-yellow-400/25 hover:-translate-y-0.5 transition-all duration-300"
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </div>
    </div>
  );
};

export default VerifyOtpModal;
