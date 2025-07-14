import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DailyProgram.css'; // Uses the new CSS we just created

const ProgramListPage = () => {
  const [programs, setPrograms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPrograms = async () => {
      const apiUrl = 'https://localhost:44374/api/dailyprogram';
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch programs');
        const data = await response.json();
        setPrograms(data);
      } catch (error) {
        console.error(error);
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
        if (!response.ok) throw new Error('Failed to delete program');
        setPrograms(programs.filter(p => p.id !== id));
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <div className="program-page-container">
      <div className="page-header">
        <h1>Daily Programs</h1>
        <button className="abtndd-" onClick={() => navigate('/program/new')}>
          + Add New Program
        </button>
      </div>

      <div className="program-list-grid">
        {programs.map((prog) => (
          <div className="program-card" key={prog.id}>
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
    </div>
  );
};

export default ProgramListPage;