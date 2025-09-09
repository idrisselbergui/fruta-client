import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiGet, apiDelete } from '../apiService'; // --- 1. IMPORT THE NEW API SERVICE ---
import './DailyProgram.css';

const ProgramListPage = () => {
  const [programs, setPrograms] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- 2. REFACTOR ALL FETCH LOGIC TO USE THE API SERVICE ---
  useEffect(() => {
    const fetchDates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dates = await apiGet('/api/dailyprogram/dates');
        setAvailableDates(dates);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDates();
  }, []);

  useEffect(() => {
    if (availableDates.length === 0) return;

    const fetchProgramsForDate = async () => {
      setIsLoading(true);
      setError(null);
      const selectedDate = availableDates[currentDateIndex];
      try {
        // Pass the date as a query parameter
        const data = await apiGet('/api/dailyprogram', { date: selectedDate });
        setPrograms(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgramsForDate();
  }, [currentDateIndex, availableDates]);

  const handlePrevDay = () => {
    if (currentDateIndex < availableDates.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
    }
  };

  const handleNextDay = () => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
    }
  };
  
  const handleEdit = (id) => navigate(`/program/edit/${id}`);
  
  const handleDelete = async (id) => {
    // A simple confirmation dialog
    if (window.confirm('Are you sure you want to delete this program?')) {
        try {
            await apiDelete(`/api/dailyprogram/${id}`);
            // Refetch the programs for the current date to update the list
            const selectedDate = availableDates[currentDateIndex];
            const data = await apiGet('/api/dailyprogram', { date: selectedDate });
            setPrograms(data);
        } catch(err) {
            console.error("Failed to delete program:", err);
            setError("Could not delete the program.");
        }
    }
  };

  // The JSX remains the same
  if (isLoading && availableDates.length === 0) return <LoadingSpinner />;
  if (error) return <div className="program-page-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  const current_date = availableDates[currentDateIndex];

  return (
    <div className="program-page-container">
      <div className="page-header">
        <h1>Daily Programs</h1>
        <button className="add-btn" onClick={() => navigate('/program/new')}>
          + Add New Program
        </button>
      </div>
     
      {isLoading ? <LoadingSpinner /> : (
        programs.length === 0 && current_date ? (
          <p>No programs found for this date.</p>
        ) : (
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
        )
      )}
      <div className="pagination-controls">
        <button onClick={handleNextDay} disabled={currentDateIndex === 0}>
          &larr; Newer Day
        </button>
        <span className="pagination-date">
          {current_date ? new Date(current_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "No Date Selected"}
        </span>
        <button onClick={handlePrevDay} disabled={currentDateIndex >= availableDates.length - 1}>
          Older Day &rarr;
        </button>
      </div>
    </div>
  );
};

export default ProgramListPage;

