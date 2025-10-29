import React from 'react';
import { NavLink } from 'react-router-dom';
import { hasPagePermission } from '../ProtectedRoute';
import './Header.css';

const Header = ({ user, onLogout }) => {
  return (
    <header className="header-container">
      <div className="logo">
        <NavLink to="/home">
          <img src="/frutaaaaa.png" alt="Frutaaaaa Logo" />
        </NavLink>
      </div>
      <nav className="navigation-menu">
        <NavLink
          to="/home"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Home
        </NavLink>

         {user && hasPagePermission(user, "dashboard") && (
        <NavLink
          to="/dashboard"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Dashboard
        </NavLink>
   )}   
        {/* Page-specific navigation based on user permissions */}
        {user && hasPagePermission(user, "programs") && (
          <NavLink
            to="/programs"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Programs
          </NavLink>
        )}
        {user && hasPagePermission(user, "traits") && (
          <NavLink
            to="/traits"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Products
          </NavLink>
        )}
        {user && hasPagePermission(user, "traitements") && (
          <NavLink
            to="/traitements"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Treatments
          </NavLink>
        )}
        {user && hasPagePermission(user, "ecart-direct") && (
          <NavLink
            to="/ecart-direct"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Ecart Direct
          </NavLink>
        )}

        {/* Admin page access based on permissions */}
        {user && hasPagePermission(user, "admin") && (
          <NavLink
            to="/admin"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Admin
          </NavLink>
        )}

        {user && (
          <button onClick={onLogout} className="logout-button-header" aria-label="Logout">
            Logout
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
