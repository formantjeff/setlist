import React from 'react';
import { useTheme } from './ThemeContext';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="App">
      <header className="header">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <h1>Settings</h1>
        <div style={{ width: '40px' }}></div> {/* Spacer for centering */}
      </header>
      
      <div className="settings-container">
        <div className="settings-section">
          <h2>Appearance</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Theme</label>
              <p className="setting-description">
                Choose between light and dark mode
              </p>
            </div>
            
            <div className="theme-toggle-container">
              <button 
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => theme === 'dark' && toggleTheme()}
              >
                <span className="theme-icon">☀️</span>
                Light
              </button>
              
              <button 
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => theme === 'light' && toggleTheme()}
              >
                <span className="theme-icon">🌙</span>
                Dark
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>About</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Setlist Manager</label>
              <p className="setting-description">
                Manage your band's setlist with lyrics and chords
              </p>
            </div>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Version</label>
              <p className="setting-description">
                1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};