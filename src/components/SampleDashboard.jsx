import React, { useState, useEffect } from 'react';
import { getActiveSamples, getDestinations, getVarietes } from '../apiService';
import DailyCheckModal from './DailyCheckModal';
import './SampleDashboard.css';
import './DailyCheckModal.css';

const SampleDashboard = () => {
  const [samples, setSamples] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      const [samplesData, destinationsData, varietiesData] = await Promise.all([
        getActiveSamples(),
        getDestinations(),
        getVarietes()
      ]);
      setSamples(samplesData || []);
      setDestinations(destinationsData || []);
      setVarieties(varietiesData || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (sample) => {
    setSelectedSample(sample);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSample(null);
  };

  const handleSave = async () => {
    await fetchSamples(); // Refresh the samples list
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  const calculateDays = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getDestinationName = (coddes) => {
    if (!coddes) return 'Unknown';
    const destination = destinations.find(d => 
      d.value === coddes || d.coddes === coddes
    );
    return destination ? (destination.label || destination.vildes || `Client ${coddes}`) : `Client ${coddes}`;
  };

  const getVarietyName = (codvar) => {
    if (!codvar) return 'Unknown';
    const variety = varieties.find(v => 
      v.value === codvar || v.codvar === codvar
    );
    return variety ? (variety.label || variety.nomvar || `Variety ${codvar}`) : `Variety ${codvar}`;
  };

  if (loading) {
    return <div className="loading">Loading samples...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="sample-dashboard">
      <h2>Quality Control Dashboard</h2>
      
      {samples.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Active Samples</h3>
          <p>There are currently no active samples to monitor.</p>
          <p>Create sample tests to start quality monitoring.</p>
        </div>
      ) : (
        <div className="samples-grid">
          {samples.map((sample) => (
            <div key={sample.id} className="sample-card">
              <div className="card-header">
                <h3>Reception {sample.numrec}</h3>
                <span className={`status-badge ${sample.status === 0 ? 'active' : 'closed'}`}>
                  {sample.status === 0 ? 'Active' : 'Closed'}
                </span>
              </div>
              <div className="card-body">
                <p><strong>Client:</strong> {getDestinationName(sample.coddes)}</p>
                <p><strong>Variety:</strong> {getVarietyName(sample.codvar)}</p>
                <p><strong>Day {calculateDays(sample.startDate)}</strong></p>
                <p><strong>Fruits:</strong> {sample.initialFruitCount}</p>
              </div>
              <div className="card-footer">
                <button
                  className={`check-button ${sample.isCheckedToday ? 'done' : 'active'}`}
                  disabled={sample.isCheckedToday}
                  onClick={() => openModal(sample)}
                >
                  {sample.isCheckedToday ? 'Done ✅' : 'Add Daily Check'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DailyCheckModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        sample={selectedSample}
        destinations={destinations}
        varieties={varieties}
      />
    </div>
  );
};

export default SampleDashboard;
