import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import './Layout.css';

const Layout = ({ children, user, onLogout }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    return stored ? JSON.parse(stored) : false;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);

    // Update localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
    const width = newCollapsed ? 72 : 240;
    localStorage.setItem('sidebarWidth', width.toString());

    // Dispatch event for potential other listeners
    window.dispatchEvent(new CustomEvent('sidebarWidthChange', { detail: { width } }));
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = sidebarCollapsed ? 72 : 240;

  return (
    <div className="layout-container">
      <Header
        user={user}
        onLogout={onLogout}
        isCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        isMobileOpen={isMobileOpen}
        toggleMobileMenu={toggleMobileMenu}
        closeMobileMenu={closeMobileMenu}
      />
      <Sidebar
        user={user}
        onLogout={onLogout}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        isMobileOpen={isMobileOpen}
        closeMobileMenu={closeMobileMenu}
      />
      <main
        className={`main-content ${isMobile ? 'mobile' : 'desktop'}`}
        role="main"
        style={!isMobile ? { marginLeft: `${sidebarWidth}px` } : {}}
      >
        <div className="content-wrapper">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
