import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './DailyProgram.css';

const ProgramListPage = () => {
  const [programs, setPrograms] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = 'https://fruta-dkd7h0e6bggjfqav.canadacentral-01.azurewebsites.net/api/dailyprogram';

  // 1. First, fetch the list of all available dates
  useEffect(() => {
    const fetchDates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/dates`);
        if (!response.ok) throw new Error('Failed to fetch dates.');
        const dates = await response.json();
        setAvailableDates(dates);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDates();
  }, []);

  // 2. Then, fetch programs for the currently selected date
  useEffect(() => {
    // Don't run if there are no dates yet
    if (availableDates.length === 0) return;

    const fetchProgramsForDate = async () => {
      setIsLoading(true);
      setError(null);
      const selectedDate = availableDates[currentDateIndex];
      try {
        const response = await fetch(`${apiUrl}?date=${selectedDate}`);
        if (!response.ok) throw new Error(`Failed to fetch programs for ${selectedDate}.`);
        const data = await response.json();
        setPrograms(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgramsForDate();
  }, [currentDateIndex, availableDates]); // This runs whenever the date index changes

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
    // ... delete logic remains the same
  };

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
       {/* Pagination Controls */}
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