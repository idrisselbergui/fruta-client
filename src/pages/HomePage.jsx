import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './HomePage.css';

// Accept user and onLogout as props
const HomePage = ({ user, onLogout }) => {
  return (
    <div className="home-container">
      <h1 hidden>Welcome to the Home Page!</h1>
      <p hidden>You have successfully logged in.</p>

      {/* If the user is an admin, show a link to the admin page*/}
      {user && user.permission === 1 && (
        <Link to="/admin" className="admin-link">
          Go to Admin Page
        </Link>
      )}

      {/* Add a logout button */}
      <button onClick={onLogout} className="logout-button" hidden> 
        Logout
      </button>
    </div>
  );
};

export default HomePage;