import ForgotPasswordModal from './ForgotPasswordModal';
import VerifyOtpModal from './VerifyOtpModal';
import ResetPasswordModal from './ResetPasswordModal';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BACKEND_API_URL } from '../lib/config';
import { Eye, EyeOff, User, Lock, BookOpen, Mail, Phone, Calendar, AtSign } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
  noticeMessage?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, noticeMessage }) => {
  const [searchParams] = useSearchParams();
  const noticeFromQuery = searchParams?.get('notice') || undefined;
  const effectiveNotice = noticeMessage || noticeFromQuery;
  const [email, setEmail] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  // Sign up state
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [signupContact, setSignupContact] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showVerifyOtpModal, setShowVerifyOtpModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetFlowEmail, setResetFlowEmail] = useState('');
  const [resetFlowOtp, setResetFlowOtp] = useState('');
  // Handle sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          username: signupUsername,
          password: signupPassword,
          dob: signupDob,
          contactNo: signupContact
        }),
      });
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error('Server returned invalid response format: ' + text);
      }
      const data = await response.json();
      if (!response.ok) {
        let errorMsg = 'Sign up failed';
        if (data.message) {
          errorMsg = data.message;
        } else if (data.error) {
          if (typeof data.error === 'string') {
            errorMsg = data.error;
          } else if (typeof data.error === 'object') {
            errorMsg = JSON.stringify(data.error);
          }
        }
        throw new Error(errorMsg);
      }
      // Store token and user
      localStorage.setItem('vedic_auth_token', data.data.tokens.accessToken);
      localStorage.setItem('vedic_user', JSON.stringify(data.data.user));
      onLoginSuccess(data.data.user, data.data.tokens.accessToken);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = 'Login failed';
        if (data.message) {
          errorMsg = data.message;
        } else if (data.error) {
          if (typeof data.error === 'string') {
            errorMsg = data.error;
          } else if (typeof data.error === 'object') {
            errorMsg = JSON.stringify(data.error);
          }
        }
        throw new Error(errorMsg);
      }

      // Store token based on remember me preference
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('vedic_auth_token', data.data.tokens.accessToken);
      storage.setItem('vedic_user', JSON.stringify(data.data.user));

      // Call the success callback
      onLoginSuccess(data.data.user, data.data.tokens.accessToken);

    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── shared input class helper ── */
  const inputBase = `w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200
    bg-yellow-50/90 border border-yellow-300 text-yellow-900 placeholder-yellow-600/60
    focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400`;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fdf3dc 0%, #fef0c4 35%, #fde8a0 65%, #fdf3dc 100%)' }}
    >
      {/* ── Animated glow orbs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left large amber orb */}
        <div style={{
          position: 'absolute', top: '-120px', left: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,119,6,0.22) 0%, rgba(251,191,36,0.10) 45%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite',
        }} />
        {/* Bottom-right deep saffron orb */}
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-60px',
          width: '460px', height: '460px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(180,83,9,0.20) 0%, rgba(217,119,6,0.08) 50%, transparent 70%)',
          animation: 'pulse 10s ease-in-out infinite 2s',
        }} />
        {/* Centre-top soft gold shimmer */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, transparent 65%)',
          animation: 'pulse 12s ease-in-out infinite 4s',
        }} />
      </div>

      {/* ── Vedic stamps grid (background decoration) ── */}
      {[
        { text: 'ŚRUTI',      top: '7%',  left: '4%',  rot: '-8deg',  size: '1.7rem' },
        { text: 'SMṚTI',      top: '5%',  left: '48%', rot: '4deg',   size: '1.6rem' },
        { text: 'PURĀṆAS',    top: '8%',  right: '4%', rot: '6deg',   size: '1.5rem' },
        { text: 'VEDAS',      top: '35%', left: '2%',  rot: '-5deg',  size: '2rem'   },
        { text: 'TANTRAS',    top: '34%', right: '2%', rot: '7deg',   size: '1.8rem' },
        { text: 'ĀGAMAS',     top: '60%', left: '3%',  rot: '-6deg',  size: '1.6rem' },
        { text: 'UPANIṢADS',  top: '62%', right: '2%', rot: '5deg',   size: '1.4rem' },
        { text: 'UPAVEDAS',   bottom: '10%', left: '4%', rot: '6deg', size: '1.5rem' },
        { text: 'CLASSICAL',  bottom: '9%',  right: '3%',rot: '-5deg',size: '1.6rem' },
        { text: 'ITIHĀSA',    bottom: '8%',  left: '42%',rot: '3deg', size: '1.5rem' },
        { text: 'DARŚANA',    top: '20%', left: '1%',  rot: '4deg',  size: '1.3rem' },
        { text: 'VAIṢṆAVA',   top: '78%', left: '22%', rot: '-4deg', size: '1.4rem' },
      ].map(({ text, rot, size, ...pos }, i) => (
        <div
          key={text}
          className="absolute select-none pointer-events-none"
          style={{
            ...pos,
            transform: `rotate(${rot})`,
            fontFamily: 'serif',
            fontSize: size,
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'transparent',
            WebkitTextStroke: `1.5px rgba(180,83,9,${0.13 + (i % 3) * 0.04})`,
            textTransform: 'uppercase',
            padding: '0.35em 0.7em',
            border: `1.5px solid rgba(180,83,9,${0.10 + (i % 4) * 0.03})`,
            borderRadius: '6px',
            background: `rgba(253,230,138,${0.12 + (i % 3) * 0.04})`,
            backdropFilter: 'blur(1px)',
          }}
        >
          {text}
        </div>
      ))}

      {/* ── Decorative mandala rings (pure CSS) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {[320, 520, 720].map((size, i) => (
          <div
            key={size}
            style={{
              position: 'absolute',
              width: `${size}px`, height: `${size}px`,
              borderRadius: '50%',
              border: `1px solid rgba(180,83,9,${0.06 - i * 0.015})`,
              boxShadow: `inset 0 0 ${20 + i * 20}px rgba(217,119,6,${0.04 - i * 0.01})`,
            }}
          />
        ))}
      </div>

      {/* ── Floating Sanskrit characters ── */}
      {[
        { ch: 'ॐ',  top: '15%', left: '14%',  size: '3.5rem', op: 0.10 },
        { ch: '॥',  top: '70%', left: '16%',  size: '2.5rem', op: 0.08 },
        { ch: 'ॐ',  top: '20%', right: '14%', size: '3rem',   op: 0.09 },
        { ch: 'स्व', bottom:'18%', right:'16%', size:'2.5rem', op: 0.08 },
        { ch: '卐',  bottom: '20%', left: '48%', size: '2rem', op: 0.07 },
      ].map(({ ch, size, op, ...pos }, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{ ...pos, fontSize: size, color: `rgba(120,53,15,${op})`, fontFamily: 'serif', lineHeight: 1 }}
        >
          {ch}
        </div>
      ))}

      {/* Pulse keyframe injected inline */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.75; }
        }
      `}</style>

      {/* ── Notice banner ── */}
      {effectiveNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl bg-yellow-100/95 border-2 border-yellow-400">
          <p className="text-yellow-950 text-sm font-semibold text-center">{effectiveNotice}</p>
        </div>
      )}

      {/* ── Main card ── */}
      <div
        className="w-full flex flex-col md:flex-row overflow-hidden"
        style={{
          maxWidth: isSignUp ? '860px' : '820px',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(120,53,15,0.35), 0 8px 24px rgba(120,53,15,0.2)',
        }}
      >
        {/* ══ LEFT: Branding panel ══ */}
        <div
          className="md:w-5/12 flex flex-row md:flex-col items-center justify-center md:justify-center px-4 py-3 md:p-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(155deg, #5c2a08 0%, #78350f 40%, #92400e 80%, #7c3210 100%)',
          }}
        >
          {/* Decorative glow blobs — desktop only */}
          <div
            className="hidden md:block absolute pointer-events-none"
            style={{
              width: '260px', height: '260px', borderRadius: '50%',
              top: '-60px', right: '-60px',
              background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)',
            }}
          />
          <div
            className="hidden md:block absolute pointer-events-none"
            style={{
              width: '200px', height: '200px', borderRadius: '50%',
              bottom: '-50px', left: '-50px',
              background: 'radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)',
            }}
          />

          {/* OM symbol watermark */}
          <div
            className="absolute top-2 right-3 md:top-5 md:right-6 select-none pointer-events-none"
            style={{ fontSize: '2.5rem', color: 'rgba(251,191,36,0.12)', fontFamily: 'serif', lineHeight: 1 }}
          >ॐ</div>

          {/* Thin top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(to right, transparent, #fbbf24, #d97706, #fbbf24, transparent)' }}
          />

          {/* Logo circle */}
          <div
            className="relative flex-shrink-0 flex items-center justify-center mr-3 md:mr-0 md:mb-6"
            style={{
              width: '48px', height: '48px',
              borderRadius: '50%',
              background: 'rgba(251,191,36,0.12)',
              border: '2px solid rgba(251,191,36,0.35)',
              boxShadow: '0 0 20px rgba(251,191,36,0.15)',
            }}
          >
            <BookOpen className="w-5 h-5 md:w-9 md:h-9" style={{ color: '#fde68a' }} />
          </div>

          {/* Mobile: title + subtitle stacked inline; Desktop: centred column */}
          <div className="flex flex-col md:items-center">
            {/* Title */}
            <h1
              className="text-xl md:text-3xl font-bold tracking-wide md:text-center leading-tight"
              style={{ color: '#fef3c7', letterSpacing: '0.04em', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
            >
              Śāstra Nidhi
            </h1>
            <p className="text-xs md:text-sm font-medium md:mb-0.5" style={{ color: '#fcd34d' }}>Vedic E-Books Library</p>

            {/* Hidden on mobile */}
            <p className="hidden md:block text-xs mb-8" style={{ color: 'rgba(253,230,138,0.6)' }}>Digital Repository of Vedic Knowledge</p>
          </div>

          {/* Gold divider — desktop only */}
          <div className="hidden md:block" style={{ width: '48px', height: '1.5px', background: 'linear-gradient(to right, transparent, #fbbf24, transparent)', marginBottom: '1.5rem' }} />

          {/* Sanskrit quote — desktop only */}
          <div className="hidden md:block text-center px-4">
            <p
              className="text-sm leading-relaxed italic mb-1"
              style={{ color: 'rgba(253,230,138,0.85)', fontFamily: 'serif' }}
            >
              "विद्या ददाति विनयं"
            </p>
            <p className="text-xs" style={{ color: 'rgba(251,191,36,0.5)' }}>
              Knowledge bestows humility
            </p>
          </div>

          {/* Bottom label — desktop only */}
          <p
            className="hidden md:block absolute bottom-5 text-xs tracking-widest select-none"
            style={{ color: 'rgba(251,191,36,0.25)', letterSpacing: '0.2em' }}
          >
            SACRED TEXTS
          </p>
        </div>

        {/* ══ RIGHT: Form panel ══ */}
        <div
          className="md:w-7/12 flex flex-col justify-center px-5 py-6 md:px-8 md:py-10"
          style={{
            background: 'rgba(255,248,224,0.97)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {isSignUp ? (
            /* ── Sign-up form ── */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="mb-5">
                <h2 className="text-2xl font-bold" style={{ color: '#78350f' }}>Create Account</h2>
                <p className="text-sm mt-0.5" style={{ color: '#92400e' }}>Join the treasury of Vedic wisdom</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                  <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)}
                    className={inputBase} placeholder="Your full name" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                    <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                      className={inputBase} placeholder="your@email.com" required />
                  </div>
                </div>
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                    <input type="text" value={signupUsername} onChange={e => setSignupUsername(e.target.value)}
                      className={inputBase} placeholder="username" required />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                    className={`${inputBase} pr-10`} placeholder="Create a strong password" required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#b45309' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* DOB */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                    <input type="date" value={signupDob} onChange={e => setSignupDob(e.target.value)}
                      className={inputBase} required />
                  </div>
                </div>
                {/* Contact */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>Contact No.</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                    <input type="text" value={signupContact} onChange={e => setSignupContact(e.target.value)}
                      className={inputBase} placeholder="Phone number" required />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={isLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 mt-1"
                style={{
                  background: isLoading ? '#d1d5db' : 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
                  color: isLoading ? '#9ca3af' : '#fef3c7',
                  boxShadow: isLoading ? 'none' : '0 4px 16px rgba(120,53,15,0.3)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transform: isLoading ? 'none' : undefined,
                }}
              >
                {isLoading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                      Creating account…
                    </span>
                  : 'Create Account'}
              </button>

              <p className="text-center text-sm" style={{ color: '#92400e' }}>
                Already have an account?{' '}
                <button type="button" className="font-bold hover:underline" style={{ color: '#78350f' }}
                  onClick={() => { setIsSignUp(false); setError(''); }}>
                  Sign In
                </button>
              </p>
            </form>

          ) : (
            /* ── Sign-in form ── */
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="mb-2">
                <h2 className="text-2xl font-bold" style={{ color: '#78350f' }}>Welcome Back</h2>
                <p className="text-sm mt-0.5" style={{ color: '#92400e' }}>Sign in to continue your sacred journey</p>
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>
                  Email or Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                  <input
                    type="text" value={email} onChange={e => setEmail(e.target.value)}
                    className={inputBase} placeholder="Enter your email or username"
                    required autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#92400e' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b45309' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    className={`${inputBase} pr-10`} placeholder="Enter your password"
                    required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#b45309' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className="relative w-4 h-4 rounded"
                    style={{ border: `2px solid ${rememberMe ? '#d97706' : '#fcd34d'}`, background: rememberMe ? '#d97706' : 'transparent', transition: 'all 0.15s' }}
                    onClick={() => setRememberMe(v => !v)}
                  >
                    {rememberMe && (
                      <svg className="absolute inset-0 w-3 h-3 m-auto" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: '#78350f' }}>Remember me</span>
                </label>
                <button type="button" onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs font-medium hover:underline transition-colors"
                  style={{ color: '#b45309' }}>
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={isLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  background: isLoading ? '#d1d5db' : 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
                  color: isLoading ? '#9ca3af' : '#78350f',
                  boxShadow: isLoading ? 'none' : '0 4px 20px rgba(217,119,6,0.4)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                      Signing in…
                    </span>
                  : 'Sign In'}
              </button>

              <p className="text-center text-sm" style={{ color: '#92400e' }}>
                Don't have an account?{' '}
                <button type="button" className="font-bold hover:underline" style={{ color: '#78350f' }}
                  onClick={() => { setIsSignUp(true); setError(''); }}>
                  Sign Up
                </button>
              </p>

              {/* Modals */}
              <ForgotPasswordModal
                open={showForgotPasswordModal}
                onClose={() => setShowForgotPasswordModal(false)}
                onSuccess={(email) => {
                  setShowForgotPasswordModal(false);
                  setResetFlowEmail(email);
                  setShowVerifyOtpModal(true);
                }}
              />
              <VerifyOtpModal
                open={showVerifyOtpModal}
                email={resetFlowEmail}
                onClose={() => setShowVerifyOtpModal(false)}
                onSuccess={(otp) => {
                  setResetFlowOtp(otp);
                  setShowVerifyOtpModal(false);
                  setShowResetPasswordModal(true);
                }}
              />
              <ResetPasswordModal
                open={showResetPasswordModal}
                email={resetFlowEmail}
                otp={resetFlowOtp}
                onClose={() => setShowResetPasswordModal(false)}
                onSuccess={() => {
                  setShowResetPasswordModal(false);
                  setResetFlowEmail('');
                  setResetFlowOtp('');
                }}
              />
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 text-center" style={{ borderTop: '1px solid rgba(217,119,6,0.2)' }}>
            <p className="text-xs" style={{ color: 'rgba(146,64,14,0.5)' }}>
              Accessing the treasury of Vedic wisdom
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;