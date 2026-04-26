"use client";
import React, { useEffect } from "react";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const applyTheme = () => {
      let theme = 'dark';
      let fontSize = '16px';
      if (typeof window !== 'undefined') {
        // Always set zoom to 100% on load
        document.body.style.zoom = '100%';
        const storedUser = localStorage.getItem('vedic_user') || sessionStorage.getItem('vedic_user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            theme = user?.profile?.preferences?.theme || 'dark';
            const fs = user?.profile?.preferences?.fontSize;
            fontSize = fs === 'small' ? '14px' : fs === 'large' ? '18px' : '16px';
          } catch {}
        }
        document.body.setAttribute('data-theme', theme);
        document.body.style.fontSize = fontSize;
      }
    };
    applyTheme();
    // Listen for changes in localStorage/sessionStorage (settings or login)
    const storageListener = () => applyTheme();
    window.addEventListener('storage', storageListener);
    return () => window.removeEventListener('storage', storageListener);
  }, []);
  return <>{children}</>;
};
