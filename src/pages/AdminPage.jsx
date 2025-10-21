import React, { useState, useEffect } from 'react';
import RegisterForm from '../RegisterForm';
import { getUsers, updateUser, deleteUser, getUserSession } from '../apiService';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', permission: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formEditingUser, setFormEditingUser] = useState(null);


  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const data = await getUsers(null);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle edit user
  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      username: user.username,
      password: user.password,
      permission: user.permission
    });
  };

  // Handle update user
  const handleUpdate = async (userId) => {
    try {
      await updateUser(userId, {
        username: editForm.username,
        password: editForm.password,
        permission: editForm.permission === 'admin' ? 1 : editForm.permission === 'user' ? 0 : 2,
        database: getUserSession()?.database || 'frutaaaaa_db'
      }, null);
      setEditingUser(null);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // Handle delete user
  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId, null);
        fetchUsers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Error deleting user: ${error.message}`);
      }
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0', color: '#333' }}>Admin Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Manage your application users</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {showAddForm ? '✕ Close' : '+ Add User'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #e0e0e0'
        }}>
          <RegisterForm
            editingUser={formEditingUser}
            onUserUpdated={fetchUsers}
            onCancelEdit={() => {
              setFormEditingUser(null);
              setShowAddForm(false);
            }}
          />
        </div>
      )}

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <h2 style={{
          margin: '0',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          color: '#333',
          borderBottom: '1px solid #e9ecef'
        }}>
          Existing Users ({users.length})
        </h2>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div>Loading users...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            <div>No users found. Add your first user using the form above.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    Username
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    Password
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    Permission
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} style={{
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <td style={{ padding: '16px' }}>
                      {editingUser === user.id ? (
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                          style={{
                            padding: '10px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            width: '100%',
                            fontSize: '14px'
                          }}
                          placeholder="Enter username"
                        />
                      ) : (
                        <span style={{ fontWeight: '500' }}>{user.username}</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {editingUser === user.id ? (
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                          style={{
                            padding: '10px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            width: '100%',
                            fontSize: '14px'
                          }}
                          placeholder="Enter password"
                        />
                      ) : (
                        <span style={{ color: '#6c757d' }}>••••••••</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {editingUser === user.id ? (
                        <select
                          value={editForm.permission}
                          onChange={(e) => setEditForm({...editForm, permission: e.target.value})}
                          style={{
                            padding: '10px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            width: '100%',
                            fontSize: '14px',
                            backgroundColor: '#fff'
                          }}
                        >
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                          <option value="read-only">Read Only</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor:
                            user.permission === 'admin' ? '#d4edda' :
                            user.permission === 'user' ? '#cce7ff' : '#fff3cd',
                          color:
                            user.permission === 'admin' ? '#155724' :
                            user.permission === 'user' ? '#004085' : '#856404'
                        }}>
                          {user.permission}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {editingUser === user.id ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleUpdate(user.id)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            💾 Save
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEdit(user)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            ✏️ Quick Edit
                          </button>
                          <button
                            onClick={() => {
                              setFormEditingUser(user);
                              setShowAddForm(true);
                            }}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#ffc107',
                              color: '#212529',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            📝 Edit in Form
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
