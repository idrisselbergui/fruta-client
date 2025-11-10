import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Outlet, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginForm from './LoginForm';
import { PageProtectedRoute } from './ProtectedRoute';
import Layout from './components/Layout';
import DailyProgramPage from './pages/DailyProgramPage';
import ProgramListPage from './pages/ProgramListPage';
import DashboardPage from './pages/DashboardPage';
import TraitPage from './pages/TraitPage'; // --- 1. IMPORT THE NEW PAGE ---
import TraitementPage from './pages/TraitementPage'; // --- 1. IMPORT THE NEW PAGE ---
import EcartDirectPage from './pages/EcartDirectPage';
import QualiteDefautPage from './pages/QualiteDefautPage';




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

        {/* Routes protected by page-specific permissions */}
        <Route path="/programs" element={
          <PageProtectedRoute user={user} pageName="programs">
            <ProgramListPage />
          </PageProtectedRoute>
        } />
        <Route path="/program/new" element={
          <PageProtectedRoute user={user} pageName="program-new">
            <DailyProgramPage />
          </PageProtectedRoute>
        } />
        <Route path="/program/edit/:id" element={
          <PageProtectedRoute user={user} pageName="program-edit">
            <DailyProgramPage />
          </PageProtectedRoute>
        } />
        <Route path="/traits" element={
          <PageProtectedRoute user={user} pageName="traits">
            <TraitPage />
          </PageProtectedRoute>
        } />
        <Route path="/traitements" element={
          <PageProtectedRoute user={user} pageName="traitements">
            <TraitementPage />
          </PageProtectedRoute>
        } />
        <Route path="/ecart-direct" element={
          <PageProtectedRoute user={user} pageName="ecart-direct">
            <EcartDirectPage />
          </PageProtectedRoute>
        } />
        <Route path="/qualite-defaut" element={
          <PageProtectedRoute user={user} pageName="qualite-defaut">
            <QualiteDefautPage />
          </PageProtectedRoute>
        } />

        {/* Admin route (protected by permissions) */}
        <Route
          path="/admin"
          element={
            <PageProtectedRoute user={user} pageName="admin">
              <AdminPage />
            </PageProtectedRoute>
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
