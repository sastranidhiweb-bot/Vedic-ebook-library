'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import HomeLanding from '../components/HomeLanding';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/homePage');
    }
  }, [isAuthenticated, isLoading, router]);

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

  return <HomeLanding onLoginClick={() => router.push('/login')} />;
}
