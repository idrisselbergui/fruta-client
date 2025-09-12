import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Outlet } from 'react-router-dom';
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
        <Route path="/daily-program" element={<DailyProgramPage />} /> 
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/programs" element={<ProgramListPage />} />
        <Route path="/program/new" element={<DailyProgramPage />} />
        <Route path="/program/edit/:id" element={<DailyProgramPage />} />
        {/* --- 2. ADD THE ROUTE FOR THE NEW PAGE --- */}
        <Route path="/traits" element={<TraitPage />} />
        <Route path="/traitements" element={<TraitementPage />} />
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
