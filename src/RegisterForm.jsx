import React, { useState } from 'react';
import './LoginForm.css'; // We can reuse the same styles

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permission, setPermission] = useState(0);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    const apiUrl = 'https://localhost:44374/api/users/register'; // Your correct port

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, permission: parseInt(permission) }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Error: Registration failed.');
    }
  };

  return (
    <div className="login-container" style={{ height: 'auto', paddingTop: '5rem' }}>
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Register New User</h2>
        {/* Username and Password Inputs */}
        <div className="input-group">
          <label htmlFor="username">Username</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {/* Permission Input */}
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