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
// This component will be the parent for all routes that need the layout
const AppLayout = ({ user, onLogout }) => (
  <Layout user={user} onLogout={onLogout}>
    <Outlet /> {/* Child routes will render here */}
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
      {/* Route for the login page - no layout */}
      <Route path="/" element={<LoginForm onLoginSuccess={handleLoginSuccess} />} />

      {/* Routes that use the main layout */}
      <Route element={<AppLayout user={user} onLogout={handleLogout} />}>
        <Route path="/home" element={<HomePage user={user} />} />
          <Route path="/daily-program" element={<DailyProgramPage />} /> 
<Route path="/dashboard" element={<DashboardPage />} />
         <Route path="/programs" element={<ProgramListPage />} />
<Route path="/program/new" element={<DailyProgramPage />} />
<Route path="/program/edit/:id" element={<DailyProgramPage />} />

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

// AppWrapper remains the same
function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export default AppWrapper;