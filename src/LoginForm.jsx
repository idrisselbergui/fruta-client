import React, { useState } from 'react';
import { apiPost, postSessionStart, postSessionFailed } from './apiService';
import './LoginForm.css';

const LoginForm = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      // Login API call
      const data = await apiPost('/api/users/login', {
        database,
        username,
        password,
        permission: 0
      });

      // --- Store machine fingerprint FIRST (needed for session start) ---
      const platform = navigator.platform || navigator.userAgentData?.platform || 'Unknown';
      const resolution = `${screen.width}x${screen.height}`;
      const lang = navigator.language || 'unknown';
      sessionStorage.setItem('machineName', `${platform}-${resolution}-${lang}`);

      // --- Parse browser and OS from userAgent ---
      const ua = navigator.userAgent || '';
      let browser = 'Other';
      if (ua.includes('Edg/')) browser = 'Edge';
      else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
      else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
      else if (ua.includes('Firefox/')) browser = 'Firefox';
      else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

      let os = 'Other';
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      // --- Start session BEFORE onLoginSuccess (sessionId must exist before /home redirect) ---
      try {
        const sessionResult = await postSessionStart({
          userId: data.userId,
          username,
          tenantDatabase: database,
          machineName: `${platform}-${resolution}-${lang}`,
          browser,
          os
        });
        if (sessionResult?.sessionId) {
          sessionStorage.setItem('sessionId', String(sessionResult.sessionId));
        }
      } catch {
        // Silent — session tracking failure should never block login
      }

      // --- NOW trigger the React router redirect ---
      onLoginSuccess({ ...data, username });

    } catch (error) {
      // Record failed attempt (fire-and-forget, no await)
      postSessionFailed({ username, tenantDatabase: database });
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-logo">
          <img src="/frutaaaaa.png" alt="Frutaaaaa Logo" />
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Welcome Back</h2>

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <div className="input-with-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="database">Database</label>
            <div className="input-with-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              <input
                type="text"
                id="database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                required
                placeholder="e.g., frutaaaaa_db"
              />
            </div>
          </div>

          <button type="submit">Login</button>
          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
