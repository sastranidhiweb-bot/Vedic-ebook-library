import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Login from '../../components/Login';

const LoginPageContent = () => {
  const { isAuthenticated, login, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/homePage', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--cream)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--deep-blue)' }}>Loading Vedic Library...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // redirect in progress
  }

  return (
    <Login
      onLoginSuccess={(user, token) => {
        login(user, token);
        navigate('/homePage', { replace: true });
      }}
    />
  );
};

export default function LoginPage() {
  return <LoginPageContent />;
}
