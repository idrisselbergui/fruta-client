import React, { useState, useEffect } from 'react';
import RegisterForm from '../RegisterForm';
import { getUsers, updateUser, deleteUser, getUserPermissions, updateUserPermissions, getUserSession } from '../apiService';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', password: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formEditingUser, setFormEditingUser] = useState(null);

  // Page permissions management
  const [permissionsPanel, setPermissionsPanel] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Available pages for assignment
  const availablePages = [
    { id: 'home', name: 'Home' },
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'programs', name: 'Programs List' },
    { id: 'program-new', name: 'Create Program' },
    { id: 'program-edit', name: 'Edit Program' },
    { id: 'traits', name: 'Traits' },
    { id: 'traitements', name: 'Treatments' },
    { id: 'ecart-direct', name: 'Direct Deviation' },
    { id: 'qualite-defaut', name: 'Quality Defects' },
    { id: 'vente-ecart', name: 'Vente Ecart' },
    { id: 'admin', name: 'Admin Panel' }
  ];

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

  // Fetch permissions for a user
  const fetchUserPermissions = async (userId) => {
    try {
      const data = await getUserPermissions(userId, null);
      const permissionMap = {};
      data.forEach(perm => {
        permissionMap[perm.page_name] = perm.allowed;
      });
      setUserPermissions(prev => ({ ...prev, [userId]: permissionMap }));
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = (userId, pageId, currentValue) => {
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [pageId]: !currentValue
      }
    }));
  };

  // Save permissions
  const savePermissions = async (userId) => {
    setLoadingPermissions(true);
    try {
      const permissionsData = availablePages.map(page => ({
        PageName: page.id,
        Allowed: userPermissions[userId]?.[page.id] || false
      }));

      await updateUserPermissions(userId, permissionsData, null);
      alert('Permissions updated successfully!');
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert(`Error updating permissions: ${error.message}`);
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Handle edit user
  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      username: user.username,
      password: user.password
    });
  };

  // Handle update user (permissions are managed separately through the permissions panel)
  const handleUpdate = async (userId) => {
    try {
      await updateUser(userId, {
        username: editForm.username,
        password: editForm.password,
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Load permissions when opening permissions panel
  useEffect(() => {
    if (permissionsPanel) {
      fetchUserPermissions(permissionsPanel);
    }
  }, [permissionsPanel]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0', color: '#333' }}>Admin Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Manage your application users and permissions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                            onClick={() => setPermissionsPanel(permissionsPanel === user.id ? null : user.id)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            🔐 Permissions
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

        {/* Permissions Management Panel */}
        {permissionsPanel && (
          <PermissionsManagementPanel
            user={users.find(u => u.id === permissionsPanel)}
            permissions={userPermissions[permissionsPanel] || {}}
            availablePages={availablePages}
            loading={loadingPermissions}
            onPermissionToggle={(pageId, currentValue) => handlePermissionToggle(permissionsPanel, pageId, currentValue)}
            onSave={() => savePermissions(permissionsPanel)}
            onClose={() => setPermissionsPanel(null)}
          />
        )}
      </div>
    </div>
  );
};

// Separate component for permissions management
const PermissionsManagementPanel = ({ user, permissions, availablePages, loading, onPermissionToggle, onSave, onClose }) => (
  <div style={{
    backgroundColor: '#e9ecef',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #dee2e6'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3 style={{ margin: '0', color: '#495057' }}>
        Page Permissions for: {user?.username}
      </h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✕ Close
        </button>
      </div>
    </div>

    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '20px',
      border: '1px solid #dee2e6'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Page Access Control</h4>
        <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
          Check/uncheck the boxes below to control which pages this user can access.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
        {availablePages.map(page => (
          <div
            key={page.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa'
            }}
          >
            <input
              type="checkbox"
              id={`perm-${user?.id}-${page.id}`}
              checked={permissions[page.id] || false}
              onChange={() => onPermissionToggle(page.id, permissions[page.id] || false)}
              style={{
                marginRight: '10px',
                transform: 'scale(1.2)',
                cursor: 'pointer'
              }}
            />
            <label
              htmlFor={`perm-${user?.id}-${page.id}`}
              style={{
                cursor: 'pointer',
                fontSize: '14px',
                flex: 1
              }}
            >
              {page.name}
            </label>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={onSave}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Saving...' : '💾 Save Permissions'}
        </button>
      </div>
    </div>
  </div>
);

export default AdminPage;
