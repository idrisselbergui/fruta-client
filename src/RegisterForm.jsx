import React, { useState } from 'react';
import { apiPost } from './apiService'; // --- THIS LINE IS NOW CORRECTED ---
import './LoginForm.css';

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permission, setPermission] = useState(0);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      // The apiService will automatically add the admin's database header
      const data = await apiPost('/api/users/register', { 
        username, 
        password, 
        permission: parseInt(permission) 
      });
      setMessage(data.message);
      // Clear form on success
      setUsername('');
      setPassword('');
      setPermission(0);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="login-container" style={{ height: 'auto', paddingTop: '5rem' }}>
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Register New User</h2>
        <div className="input-group">
          <label htmlFor="username">Username</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="input-group">
          <label htmlFor="permission">Permission (0 for User, 1 for Admin)</label>
          <input type="number" id="permission" value={permission} onChange={(e) => setPermission(e.target.value)} required />
        </div>
        <button type="submit">Register User</button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default RegisterForm;

