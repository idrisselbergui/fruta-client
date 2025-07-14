import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ user, children }) => {
  if (!user || user.permission !== 1) {
    // If user is not logged in or is not an admin, redirect to login page
    return <Navigate to="/" replace />;
  }

  // If user is an admin, show the page
  return children;
};

export default ProtectedRoute;