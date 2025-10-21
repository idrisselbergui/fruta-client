import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Outlet, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginForm from './LoginForm';
import ProtectedRoute from './ProtectedRoute';
import Layout from './components/Layout';
import DailyProgramPage from './pages/DailyProgramPage';
import ProgramListPage from './pages/ProgramListPage';
import DashboardPage from './pages/DashboardPage';
import TraitPage from './pages/TraitPage'; // --- 1. IMPORT THE NEW PAGE ---
import TraitementPage from './pages/TraitementPage'; // --- 1. IMPORT THE NEW PAGE ---

// Component to protect routes that require admin permissions (permission === 1)
const AdminProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.permission !== 1) {
    // If user is not an admin, redirect to dashboard (which is accessible to all)
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
const AppLayout = ({ user, onLogout }) => (
  <Layout user={user} onLogout={onLogout}>
    <Outlet />
  </Layout>
);

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
    navigate('/home');
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/" element={<LoginForm onLoginSuccess={handleLoginSuccess} />} />

      <Route element={<AppLayout user={user} onLogout={handleLogout} />}>
        <Route path="/home" element={<HomePage user={user} />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Admin-only routes (permission === 1) */}
        <Route path="/programs" element={
          <AdminProtectedRoute user={user}>
            <ProgramListPage />
          </AdminProtectedRoute>
        } />
        <Route path="/program/new" element={
          <AdminProtectedRoute user={user}>
            <DailyProgramPage />
          </AdminProtectedRoute>
        } />
        <Route path="/program/edit/:id" element={
          <AdminProtectedRoute user={user}>
            <DailyProgramPage />
          </AdminProtectedRoute>
        } />
        <Route path="/traits" element={
          <AdminProtectedRoute user={user}>
            <TraitPage />
          </AdminProtectedRoute>
        } />
        <Route path="/traitements" element={
          <AdminProtectedRoute user={user}>
            <TraitementPage />
          </AdminProtectedRoute>
        } />
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export default AppWrapper;
