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
    <NavLink to="/home">Home</NavLink>
    <NavLink to="/dashboard">Dashboard</NavLink>
    <NavLink to="/programs">Programs</NavLink>
    <NavLink to="/traits">Products</NavLink> 
    {/* --- ADD THIS NEW LINK --- */}
    <NavLink to="/traitements">Treatments</NavLink>
    {user && user.permission === 1 && (
      <NavLink to="/admin">Admin</NavLink>
    )}
    <button onClick={onLogout} className="logout-button-header">Logout</button>
</nav>
    </header>
  );
};

export default Header;

