import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginForm from './LoginForm';
import { PageProtectedRoute } from './ProtectedRoute';
import Layout from './components/Layout';
import DailyProgramPage from './pages/DailyProgramPage';
import ProgramListPage from './pages/ProgramListPage';
import DashboardPage from './pages/DashboardPage';
import TraitPage from './pages/TraitPage';
import TraitementPage from './pages/TraitementPage';
import EcartDirectPage from './pages/EcartDirectPage';
import QualiteDefautPage from './pages/QualiteDefautPage';
import VenteEcartPage from './pages/VenteEcartPage';
import DailyChecksPage from './pages/DailyChecksPage';
import MarqueManagementPage from './pages/MarqueManagementPage';
import SampleDashboardPage from './pages/SampleDashboardPage';
import SampleTestManagementPage from './pages/SampleTestManagementPage';
import GestionAvancePage from './pages/GestionAvancePage';
import SaisieChargesPage from './pages/SaisieChargesPage';
import GestionAvanceYearlyPrint from './pages/GestionAvanceYearlyPrint';
import { postSessionPage, postSessionEnd, sendBeaconSessionEnd } from './apiService';

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
  const location = useLocation();

  // --- SESSION-008: Page tracking on every route change ---
  useEffect(() => {
    const sessionId = sessionStorage.getItem('sessionId');
    // Strict guard: skip silently if sessionId is null, undefined, or empty
    if (!sessionId) return;

    const userObj = sessionStorage.getItem('user');
    const parsed = userObj ? JSON.parse(userObj) : null;

    postSessionPage({
      sessionId: Number(sessionId),
      pagePath: location.pathname,
      userId: parsed?.userId ?? null,
      username: parsed?.username ?? null,
      tenantDatabase: parsed?.database ?? null,
    });
  }, [location.pathname]);

  // --- SESSION-009: Tab close detection via beforeunload ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) return;
      sendBeaconSessionEnd({ sessionId: Number(sessionId), status: 'TAB_CLOSED' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
    navigate('/home');
  };

  const handleLogout = async () => {
    // Close the active session via regular fetch
    const sessionId = sessionStorage.getItem('sessionId');
    if (sessionId) {
      await postSessionEnd({ sessionId: Number(sessionId), status: 'LOGGED_OUT' });
    }

    // Clean up all session storage keys
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('machineName');
    sessionStorage.removeItem('sessionId');

    setUser(null);
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
        <Route path="/vente-ecart" element={
          <PageProtectedRoute user={user} pageName="vente-ecart">
            <VenteEcartPage />
          </PageProtectedRoute>
        } />
        <Route path="/marque-management" element={
          <PageProtectedRoute user={user} pageName="marque-management">
            <MarqueManagementPage />
          </PageProtectedRoute>
        } />
        <Route path="/sample-dashboard" element={
          <PageProtectedRoute user={user} pageName="sample-dashboard">
            <SampleDashboardPage />
          </PageProtectedRoute>
        } />
        <Route path="/sample-management" element={
          <PageProtectedRoute user={user} pageName="sample-dashboard">
            <SampleTestManagementPage />
          </PageProtectedRoute>
        } />
        <Route path="/daily-checks" element={
          <PageProtectedRoute user={user} pageName="sample-dashboard">
            <DailyChecksPage />
          </PageProtectedRoute>
        } />
        <Route path="/gestion-avance" element={
          <PageProtectedRoute user={user} pageName="gestion-avance">
            <GestionAvancePage />
          </PageProtectedRoute>
        } />
        <Route path="/saisie-charges" element={
          <PageProtectedRoute user={user} pageName="gestion-avance">
            <SaisieChargesPage />
          </PageProtectedRoute>
        } />
        <Route path="/rapport-annuel" element={
          <PageProtectedRoute user={user} pageName="gestion-avance">
            <GestionAvanceYearlyPrint />
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
