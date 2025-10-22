import React from 'react';
import { Navigate } from 'react-router-dom';

// Admin only (permission === 1)
const ProtectedRoute = ({ user, children }) => {
  if (!user || user.permission !== 1) {
    // If user is not logged in or is not an admin, redirect to login page
    return <Navigate to="/" replace />;
  }

  // If user is an admin, show the page
  return children;
};

// Regular users (permission === 0) - access to all except admin page
const UserProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.permission === 1) {
    // Admins can access everything
    return children;
  }

  if (user.permission === 0) {
    // Regular users can access everything except admin
    return children;
  }

  // Read-only users (permission === 2) should be redirected to dashboard
  return <Navigate to="/dashboard" replace />;
};

// Read-only users (permission === 2) - dashboard only
const ReadOnlyProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.permission === 2) {
    // Read-only users can only access dashboard
    return children;
  }

  // Other users should be redirected appropriately
  if (user.permission === 1) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export { ProtectedRoute, UserProtectedRoute, ReadOnlyProtectedRoute };
export default ProtectedRoute;
