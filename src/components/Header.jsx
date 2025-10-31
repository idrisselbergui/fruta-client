import React from 'react';
import './Header.css';

const Header = ({ onLogout, isCollapsed, onToggleSidebar }) => {
  return (
    <header className={`app-header ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="header-left">
        <button
          className="header-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
        </button>
      </div>

      <div className="header-right">
        <button
          className="header-logout-btn"
          onClick={onLogout}
          aria-label="Logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="logout-icon">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16,17 21,12 16,7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
