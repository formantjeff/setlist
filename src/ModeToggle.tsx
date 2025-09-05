import React from 'react';
import { useMode } from './ModeContext';

export const ModeToggle: React.FC = () => {
  const { mode, toggleMode } = useMode();

  return (
    <div className="mode-toggle-container">
      <button 
        className={`mode-toggle ${mode}`}
        onClick={toggleMode}
        title={`Switch to ${mode === 'performance' ? 'Edit' : 'Performance'} Mode`}
      >
        <div className="mode-toggle-track">
          <div className="mode-toggle-thumb">
            <span className="mode-icon">
              {mode === 'performance' ? '🎤' : '✏️'}
            </span>
          </div>
        </div>
        <span className="mode-label">
          {mode === 'performance' ? 'Performance' : 'Edit'} Mode
        </span>
      </button>
    </div>
  );
};