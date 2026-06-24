import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HomeLanding from '../components/HomeLanding';
import { usePageMeta } from '../lib/usePageMeta';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  usePageMeta(
    'Online E-Books Reader',
    'Read Vedic scriptures, spiritual texts, and sacred literature online with a beautiful reading experience and Sanskrit support.'
  );

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate('/homePage', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--cream)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--deep-blue)' }}>Loading Vedic Library...</p>
        </div>
      </div>
    );
  }

  return <HomeLanding onLoginClick={() => navigate('/login')} />;
}
