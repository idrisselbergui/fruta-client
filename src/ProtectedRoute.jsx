import React from 'react';
import { Navigate } from 'react-router-dom';

// REMOVED: Admin-only route based on permission number (now use PageProtectedRoute for admin page)

// REMOVED: UserProtectedRoute - now using PageProtectedRoute everywhere

// Check if user has permission for specific page
const hasPagePermission = (user, pageName) => {
  // Check user's page permissions list only
  if (user?.permissions && Array.isArray(user.permissions)) {
    const permission = user.permissions.find(p => p.page_name === pageName);
    return permission && permission.allowed === 1;
  }

  return false;
};

// Page-specific protection (new system)
const PageProtectedRoute = ({ user, pageName, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!hasPagePermission(user, pageName)) {
    // If user doesn't have permission for this page, redirect to home
    return <Navigate to="/home" replace />;
  }

  return children;
};

// REMOVED: ReadOnlyProtectedRoute - obsolete with permissionless system
// REMOVED: ProtectedRoute - obsolete with permissionless system
// REMOVED: UserProtectedRoute - obsolete with permissionless system

export { PageProtectedRoute, hasPagePermission };
export default PageProtectedRoute;
