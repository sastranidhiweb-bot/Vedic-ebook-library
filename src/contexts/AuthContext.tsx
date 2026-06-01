'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
    preferences: {
      defaultLanguage: string;
      theme: string;
      fontSize?: string;
    };
  };
  isActive: boolean;
  emailVerified: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored authentication on mount
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        // Check both localStorage and sessionStorage
        const storedToken = localStorage.getItem('vedic_auth_token') || 
                          sessionStorage.getItem('vedic_auth_token');
        const storedUser = localStorage.getItem('vedic_user') || 
                         sessionStorage.getItem('vedic_user');

        if (storedToken && storedUser) {
          // Optimistically trust the stored token so the UI shows immediately on refresh.
          // Background verification will clear the session only if the server explicitly
          // rejects the token (401/403). Network errors / server unavailability are ignored
          // so a temporary backend outage doesn't log the user out.
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);
          setIsAuthenticated(true);
          setIsLoading(false); // release the loading gate immediately

          // Verify in background — only invalidate on an explicit rejection
          try {
            const { BACKEND_API_URL } = await import('../lib/config');
            const response = await fetch(`${BACKEND_API_URL}/auth/verify`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedToken}`,
              },
            });

            if (response.status === 401 || response.status === 403) {
              // Token is explicitly invalid — clear session
              setIsAuthenticated(false);
              setUser(null);
              setToken(null);
              localStorage.removeItem('vedic_auth_token');
              localStorage.removeItem('vedic_user');
              sessionStorage.removeItem('vedic_auth_token');
              sessionStorage.removeItem('vedic_user');
            }
            // Any other status (200, 5xx, network error) → keep the session alive
          } catch {
            // Network/server error during background verify — stay logged in
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, []);

  const login = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    setIsAuthenticated(true);
    // Theme is managed by ThemeProvider via vedic_theme localStorage.
    // Avoid overriding data-theme here, otherwise selected UI theme and applied colors can drift.
    if (typeof window !== 'undefined') {
      const fontSizePref = userData?.profile?.preferences?.fontSize;
      const storedFontSize = localStorage.getItem('vedic_font_size');
      const fontSize = fontSizePref === 'small' ? '14px' : fontSizePref === 'large' ? '18px' : '16px';
      document.documentElement.style.fontSize = storedFontSize === 'small'
        ? '14px'
        : storedFontSize === 'large'
          ? '18px'
          : fontSize;

      // Backfill theme storage from server preference only if no local theme exists yet.
      if (!localStorage.getItem('vedic_theme')) {
        const serverTheme = userData?.profile?.preferences?.theme;
        if (serverTheme === 'light' || serverTheme === 'dark' || serverTheme === 'krishna' || serverTheme === 'system') {
          localStorage.setItem('vedic_theme', serverTheme);
        }
      }
    }
  };

  const logout = () => {
    // Clear storage
    localStorage.removeItem('vedic_auth_token');
    localStorage.removeItem('vedic_user');
    sessionStorage.removeItem('vedic_auth_token');
    sessionStorage.removeItem('vedic_user');

    // Keep chosen theme/font size persistent across sessions.
    if (typeof window !== 'undefined') {
      const storedFontSize = localStorage.getItem('vedic_font_size') || 'medium';
      document.documentElement.style.fontSize = storedFontSize === 'small'
        ? '14px'
        : storedFontSize === 'large'
          ? '18px'
          : '16px';
    }

    // Reset state
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};