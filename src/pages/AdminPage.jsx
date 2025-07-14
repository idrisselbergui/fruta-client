import React from 'react';
import RegisterForm from '../RegisterForm';

const AdminPage = () => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Create a new user below.</p>
      <RegisterForm />
    </div>
  );
};

export default AdminPage;