import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface UserAvatarProps {
  onAccountClick?: () => void;
  onSettingsClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  onAccountClick, 
  onSettingsClick 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsDropdownOpen(false);
  };

  if (!user) return null;

  const initials = getInitials(user.email || '');
  const avatarColor = getAvatarColor(user.email || '');

  return (
    <div className="user-avatar-container" ref={dropdownRef}>
      <button
        className="avatar-button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </button>
      
      {isDropdownOpen && (
        <div className="avatar-dropdown">
          <div className="dropdown-header">
            <div className="user-info">
              <div className="user-email">{user.email}</div>
            </div>
          </div>
          
          <div className="dropdown-menu">
            <button 
              className="dropdown-item"
              onClick={() => handleMenuItemClick(onAccountClick || (() => {}))}
            >
              <span className="dropdown-icon">👤</span>
              Account
            </button>
            
            <button 
              className="dropdown-item"
              onClick={() => handleMenuItemClick(onSettingsClick || (() => {}))}
            >
              <span className="dropdown-icon">⚙️</span>
              Settings
            </button>
            
            <div className="dropdown-divider"></div>
            
            <button 
              className="dropdown-item logout-item"
              onClick={() => handleMenuItemClick(signOut)}
            >
              <span className="dropdown-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};