import React, { useState, useEffect } from 'react';
import { apiPost, apiPut } from './apiService';
import './LoginForm.css';

const RegisterForm = ({ editingUser, onUserUpdated, onCancelEdit, databaseName = 'frutaaaaa_db' }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permission, setPermission] = useState('user');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingUser) {
      setUsername(editingUser.username || '');
      setPassword(editingUser.password || '');
      setPermission(editingUser.permission || 'user');
    } else {
      setUsername('');
      setPassword('');
      setPermission('user');
    }
  }, [editingUser]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      let data;
      if (editingUser) {
        // Update existing user
        data = await apiPut(`/api/users/${editingUser.id}`, {
          username,
          password,
          permission: permission === 'admin' ? 1 : permission === 'user' ? 0 : 2,
          database: databaseName
        }, databaseName);
        setMessage('User updated successfully!');
        if (onUserUpdated) onUserUpdated();
        if (onCancelEdit) onCancelEdit();
      } else {
        // Create new user
        data = await apiPost('/api/users/register', {
          username,
          password,
          permission: permission === 'admin' ? 1 : permission === 'user' ? 0 : 2,
          database: databaseName
        }, databaseName);
        setMessage(data.message);
        // Clear form on success
        setUsername('');
        setPassword('');
        setPermission('user');
        if (onUserUpdated) onUserUpdated();
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container" style={{ height: 'auto', paddingTop: '2rem' }}>
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>

        <div className="input-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="permission">Permission Level</label>
          <select
            id="permission"
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="read-only">Read Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: editingUser ? '#007bff' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Processing...' : (editingUser ? 'Update User' : 'Add User')}
          </button>

          {editingUser && (
            <button
              type="button"
              onClick={onCancelEdit}
              style={{
                padding: '12px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {message && (
          <p style={{
            marginTop: '15px',
            padding: '10px',
            borderRadius: '4px',
            backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
            color: message.includes('Error') ? '#721c24' : '#155724',
            border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
          }}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default RegisterForm;
