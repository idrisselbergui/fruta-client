import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './DailyProgram.css';

const ProgramListPage = () => {
  const [programs, setPrograms] = useState([]);
  const navigate = useNavigate();

  // State for loading and errors
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      // Reset states before fetching
      setIsLoading(true);
      setError(null);

      const apiUrl = 'https://localhost:44374/api/dailyprogram';
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data = await response.json();
        setPrograms(data);
      } catch (err) {
        setError(err.message); // Set the error message if something goes wrong
      } finally {
        setIsLoading(false); // Stop loading, whether it succeeded or failed
      }
    };
    fetchPrograms();
  }, []);

  const handleEdit = (id) => navigate(`/program/edit/${id}`);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      const apiUrl = `https://localhost:44374/api/dailyprogram/${id}`;
      try {
        const response = await fetch(apiUrl, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error('Failed to delete program');
        }
        // If delete is successful, remove the program from the list in the UI
        setPrograms(programs.filter(p => p.id !== id));
      } catch (err) {
        // You could set an error state here as well for feedback
        console.error('Delete error:', err);
        setError(err.message);
      }
    }
  };

  // Conditional Rendering
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="program-page-container"><p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p></div>;
  }

  return (
    <div className="program-page-container">
      <div className="page-header">
        <h1>Daily Programs</h1>
        <button className="add-btn" onClick={() => navigate('/program/new')}>
          + Add New Program
        </button>
      </div>

      {/* Show a message if there are no programs */}
      {programs.length === 0 ? (
        <p>No programs found. Click "Add New Program" to get started.</p>
      ) : (
        <div className="program-list-grid">
          {programs.map((prog) => (
            <div className={`program-card status-${prog.status}`} key={prog.id}>
              <div className="card-header">
                <h3>Prog # {prog.numProg}</h3>
                <span className="card-lot-badge">{prog.lot}</span>
              </div>
              <div className="card-body">
                <div className="card-info-grid">
                  <div className="card-info-item">
                    <strong>PO Number:</strong>
                    <span>{prog.po}</span>
                  </div>
                  <div className="card-info-item">
                    <strong>Program Date:</strong>
                    <span>{new Date(prog.dteprog).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button className="edit-btn" onClick={() => handleEdit(prog.id)}>Edit</button>
                <button className="delete-btn" onClick={() => handleDelete(prog.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramListPage;