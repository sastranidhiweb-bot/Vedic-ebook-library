'use client';
import ForgotPasswordModal from './ForgotPasswordModal';
import VerifyOtpModal from './VerifyOtpModal';
import ResetPasswordModal from './ResetPasswordModal';
import { useState, useEffect } from 'react';
import { BACKEND_API_URL } from '../lib/config';
import { Eye, EyeOff, User, Lock, BookOpen } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
  noticeMessage?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, noticeMessage }) => {
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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-md w-full">
        {noticeMessage && (
          <div className="mb-5 p-4 rounded-xl bg-yellow-200/95 border-2 border-yellow-500 shadow-lg relative z-20">
            <p className="text-yellow-950 text-base font-semibold text-center">{noticeMessage}</p>
          </div>
        )}

        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-400 bg-opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-yellow-400 bg-opacity-3 rounded-full blur-3xl"></div>
        </div>

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 mx-auto w-full h-full flex items-center justify-center">
                    <div
                      className="backdrop-blur-lg bg-yellow-100/50 rounded-2xl border border-yellow-300 shadow-2xl w-full max-w-md mx-auto"
                  style={{ height: '210px', boxShadow: '0 8px 32px 0 rgba(255, 193, 7, 0.15)' }}
              ></div>
            </div>
            <div className="relative z-10 mt-6">
              <div className="flex flex-col items-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-yellow-900/80 flex items-center justify-center mb-4 shadow-2xl shadow-yellow-900/40 border-2 border-yellow-700">
                  <BookOpen className="w-8 h-8 text-yellow-100 drop-shadow-lg" />
                </div>
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-yellow-900 tracking-wide drop-shadow-lg">Śāstra Nidhi</h1>
                  <p className="text-yellow-900/90 text-sm font-medium drop-shadow-lg">Vedic E-Books Library</p>
                  <p className="text-yellow-900/80 text-xs drop-shadow-lg">Vedic Literature</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="bg-yellow-100/90 rounded-2xl shadow-2xl p-8 border border-yellow-300 relative z-10">
          {isSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-yellow-900 mb-2">Sign Up</h3>
                <p className="text-yellow-900/80 text-sm">Create your account to access the sacred library</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Name</label>
                <input
                  type="text"
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  className="w-full px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Email</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Username</label>
                <input
                  type="text"
                  value={signupUsername}
                  onChange={e => setSignupUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                  placeholder="Choose a username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                  placeholder="Create a password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Date of Birth</label>
                <input
                  type="date"
                  value={signupDob}
                  onChange={e => setSignupDob(e.target.value)}
                  className="w-full px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Contact Number</label>
                <input
                  type="text"
                  value={signupContact}
                  onChange={e => setSignupContact(e.target.value)}
                  className="w-full px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                  placeholder="Enter your contact number"
                  required
                />
              </div>
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-100 border border-red-400">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 transform ${
                  isLoading 
                    ? 'opacity-50 cursor-not-allowed bg-gray-600' 
                    : 'bg-yellow-900 text-yellow-100 hover:bg-yellow-800 hover:text-yellow-50 hover:shadow-lg hover:shadow-yellow-900/25 hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing up...</span>
                  </div>
                ) : (
                  'Sign Up'
                )}
              </button>
              <div className="text-center mt-4">
                <span className="text-yellow-900/80 text-sm">Already have an account?</span>
                <button type="button" className="ml-2 text-yellow-900 hover:underline text-sm font-bold" onClick={() => setIsSignUp(false)}>Sign In</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-yellow-900 mb-2">Sign In</h3>
                <p className="text-yellow-900/80 text-sm">Enter your credentials to access the sacred library</p>
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Email or Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                    placeholder="Enter your email or username"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-3 text-yellow-900">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-yellow-900 placeholder-yellow-700 transition-all duration-300"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 focus:ring-yellow-400 focus:ring-2 text-yellow-400"
                />
                <label htmlFor="remember" className="ml-3 text-sm text-yellow-900">Remember me</label>
              </div>
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-100 border border-red-400">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 transform ${
                  isLoading 
                    ? 'opacity-50 cursor-not-allowed bg-gray-600' 
                    : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 hover:shadow-lg hover:shadow-yellow-400/25 hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
              <div className="text-center mt-4">
                <span className="text-yellow-900/80 text-sm">Don't have an account?</span>
                <button type="button" className="ml-2 text-yellow-900 hover:underline text-sm font-bold" onClick={() => setIsSignUp(true)}>Sign Up</button>
                <div className="mt-2">
                  <button type="button" className="text-blue-700 hover:underline text-xs" onClick={() => setShowForgotPasswordModal(true)}>
                    Forgot your Password?
                  </button>
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
                </div>
              </div>
            </form>
          )}
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-yellow-300 text-center">
            <p className="text-yellow-900/80 text-xs">Accessing the treasury of Vedic wisdom</p>
            <p className="text-yellow-900/60 text-xs mt-1">🙏 Hare Krishna 🙏</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;