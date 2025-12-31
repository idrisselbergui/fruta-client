import React from 'react';
import { NavLink } from 'react-router-dom';
import { hasPagePermission } from '../ProtectedRoute';
import './Sidebar.css';

const Sidebar = ({ user, onLogout, isCollapsed, isMobileOpen, closeMobileMenu }) => {

  const handleLogout = () => {
    onLogout();
    closeMobileMenu();
  };

  const renderNavItem = (to, label, icon) => {
    // Permission check would be added here based on the specific page
    let hasPermission = true;
    if (label === 'Dashboard' && !hasPagePermission(user, "dashboard")) hasPermission = false;
    if (label === 'Programs' && !hasPagePermission(user, "programs")) hasPermission = false;
    if (label === 'Products' && !hasPagePermission(user, "traits")) hasPermission = false;
    if (label === 'Treatments' && !hasPagePermission(user, "traitements")) hasPermission = false;
    if (label === 'Ecart Direct' && !hasPagePermission(user, "ecart-direct")) hasPermission = false;
    if (label === 'Quality Defects' && !hasPagePermission(user, "qualite-defaut")) hasPermission = false;
    if (label === 'Vente Ecart' && !hasPagePermission(user, "vente-ecart")) hasPermission = false;
    if (label === 'Marque Management' && !hasPagePermission(user, "marque-management")) hasPermission = false;
    if (label === 'Admin' && !hasPagePermission(user, "admin")) hasPermission = false;

    if (!hasPermission) return null;

    return (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `sidebar-nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`
        }
        onClick={closeMobileMenu}
      >
        <span className="sidebar-nav-icon">{icon}</span>
        {!isCollapsed && (
          <span className="sidebar-nav-label">{label}</span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Sidebar */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobileMenu}></div>
      )}
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
 
        {/* Brand section */}
        <div className="sidebar-header">
          {!isCollapsed && (
            <NavLink to="/home">
              <img src="/frutaaaaa.png" alt="Frutaaaaa Logo" className="sidebar-logo" />
            </NavLink>
          )}
          {!isCollapsed && (
            <span className="sidebar-brand">Frutaaaaa</span>
          )}
          {isCollapsed && (
            <NavLink to="/home">
              <img src="/frutaaaaa.png" alt="Frutaaaaa Logo" className="sidebar-logo-collapsed" />
            </NavLink>
          )}

        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Main Navigation */}
          {renderNavItem(
            '/home',
            'Home',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
          )}
          {renderNavItem(
            '/dashboard',
            'Dashboard',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          )}
          {renderNavItem(
            '/programs',
            'Programs',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          )}
          {renderNavItem(
            '/traits',
            'Products',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          )}
          {renderNavItem(
            '/traitements',
            'Treatments',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          )}
          {renderNavItem(
            '/ecart-direct',
            'Ecart Direct',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          )}
          {renderNavItem(
            '/vente-ecart',
            'Vente Ecart',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          )}
          {renderNavItem(
            '/qualite-defaut',
            'Quality Defects',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          )}
          {renderNavItem(
            '/marque-management',
            'Marque Management',
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          )}

          {/* Admin section */}
          {user && hasPagePermission(user, "admin") && (
            <>
              <div className={`sidebar-section-title ${isCollapsed ? 'collapsed' : ''}`}>
                {!isCollapsed && <span>ADMIN</span>}
              </div>
              {renderNavItem(
                '/admin',
                'Admin',
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1l8 4v6c0 5.55-3.84 10.74-8.5 12L12 23l-1.5-.5C5.84 19.74 2 14.55 2 9V5l10-4z"></path>
                  <polyline points="9,12 11,14 15,10"></polyline>
                </svg>
              )}
            </>
          )}
        </nav>

        {/* User panel at bottom */}
        {user && (
          <div className="sidebar-user-panel">
            <div className="user-info">
              <div className="user-avatar">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              {!isCollapsed && (
                <span className="user-name">{user.username || 'User'}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
