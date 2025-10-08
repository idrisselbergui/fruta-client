import React from 'react';
import { NavLink } from 'react-router-dom';
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
         {user && user.permission === 1 && (
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Dashboard
        </NavLink>
         )}
        <NavLink 
          to="/programs" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Programs
        </NavLink>
        <NavLink 
          to="/traits" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Products
        </NavLink>
        <NavLink 
          to="/traitements" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Treatments
        </NavLink>
        {user && user.permission === 1 && (
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