'use client';

import { User, PanelLeftOpen, PanelLeftClose, Settings as SettingsIcon, ZoomIn, ZoomOut } from 'lucide-react';
import Settings from './Settings';
import { useState } from 'react';
import UserProfile from './UserProfile';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SideNavProps {
  selectedLanguage: string;
  languageConfig: {
    [key: string]: {
      label: string;
      code: string;
      icon: string;
      count: number;
    };
  };
  isCategoryPanelVisible: boolean;
  onLanguageToggle: (language: string) => void;
  onCategoryPanelToggle: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

const SideNav: React.FC<SideNavProps> = ({ 
  selectedLanguage, 
  languageConfig, 
  isCategoryPanelVisible,
  onLanguageToggle,
  onCategoryPanelToggle,
  onZoomIn,
  onZoomOut
}) => {
  const { user: authUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();

  // Change password handler
  const handleChangePassword = async (oldPassword: string, newPassword: string, confirmPassword: string) => {
    const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
    const { BACKEND_API_URL } = await import('../lib/config');
    const res = await fetch(`${BACKEND_API_URL}/api/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword: oldPassword, newPassword, confirmPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to change password');
    }
  };

  return (
    <div
      className="w-16 flex flex-col items-center py-4 space-y-4"
      style={{
        background: 'var(--card)',
        color: 'var(--text)',
        borderRight: '1px solid var(--color-vb-header-bottom, var(--border))',
      }}
    >
      {/* Panel Toggle Button */}
      <button
        onClick={onCategoryPanelToggle}
        className="p-2 transition-colors"
        style={{ color: 'var(--color-vb-action-bg, var(--icon))' }}
        title={isCategoryPanelVisible ? 'Hide Categories Panel' : 'Show Categories Panel'}
      >
        {isCategoryPanelVisible ? (
          <PanelLeftClose className="w-5 h-5" style={{ color: 'var(--color-vb-action-bg, var(--icon))' }} />
        ) : (
          <PanelLeftOpen className="w-5 h-5" style={{ color: 'var(--color-vb-action-bg, var(--icon))' }} />
        )}
      </button>

      {/* Separator */}
      <div className="w-8 border-t" style={{ borderColor: 'var(--color-vb-header-bottom, var(--border))' }}></div>
      
      {Object.entries(languageConfig).map(([langKey, config]) => (
        <button
          key={langKey}
          onClick={() => onLanguageToggle(langKey)}
          className="w-10 h-10 rounded flex items-center justify-center text-sm font-bold transition-colors"
          style={
            selectedLanguage === langKey
              ? (typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'dark'
                  ? {
                      background: 'var(--button-orange-bg)',
                      color: 'var(--button-orange-text)',
                      border: '2px solid var(--button-orange-bg)'
                    }
                  : {
                      background: 'var(--color-vb-header-bottom, var(--accent))',
                      color: 'var(--color-vb-header-bottom-text, var(--icon))',
                      border: '2px solid var(--color-vb-header-bottom-text, var(--icon))'
                    })
              : (typeof window !== 'undefined' && document.body.getAttribute('data-theme') === 'dark'
                  ? {
                      background: 'var(--card)',
                      color: '#eaeae7',
                      opacity: 0.7
                    }
                  : {
                      background: 'var(--card)',
                      color: 'var(--color-vb-header-bottom-text, var(--icon))',
                      opacity: 0.7
                    })
          }
          title={config.label}
        >
          {config.icon}
        </button>
      ))}
      
      {/* Navigation Icons - original only, unified style */}
      <div className="flex flex-col space-y-4 pt-6 border-t" style={{ borderColor: 'var(--color-vb-header-bottom, var(--border))' }}>
        <button
          className="p-2 rounded-lg shadow-md backdrop-blur-md bg-white/90 hover:bg-white transition-all"
          style={{ color: 'var(--color-vb-header-top-text, #1e293b)' }}
          title="Settings"
          onClick={() => setShowSettings(true)}
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} />
        )}
        <button
          className="p-2 rounded-lg shadow-md backdrop-blur-md bg-white/90 hover:bg-white transition-all"
          style={{ color: 'var(--color-vb-header-top-text, #1e293b)' }}
          title="Profile"
          onClick={() => setShowProfile(true)}
        >
          <User className="w-5 h-5" />
        </button>
        {showProfile && authUser && (
          <UserProfile
            user={authUser}
            onClose={() => setShowProfile(false)}
            onChangePassword={(oldPassword, newPassword) => handleChangePassword(oldPassword, newPassword, newPassword)}
          />
        )}
      </div>

      {/* Zoom Controls */}
      <div className="flex flex-col space-y-3 pt-4 mt-2 border-t" style={{ borderColor: 'var(--color-vb-header-bottom, var(--border))' }}>
        <button
          className="p-2"
          style={{ color: 'var(--color-vb-action-bg, var(--icon))' }}
          title="Zoom In (Ctrl +)"
          onClick={onZoomIn}
        >
          <ZoomIn className="w-5 h-5" style={{ color: 'var(--color-vb-action-bg, var(--icon))' }} />
        </button>
        <button
          className="p-2"
          style={{ color: 'var(--color-vb-action-bg, var(--icon))' }}
          title="Zoom Out (Ctrl -)"
          onClick={onZoomOut}
        >
          <ZoomOut className="w-5 h-5" style={{ color: 'var(--color-vb-action-bg, var(--icon))' }} />
        </button>
      </div>
    </div>
  );
};

export default SideNav;