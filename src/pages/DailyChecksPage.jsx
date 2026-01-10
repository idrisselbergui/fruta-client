import React, { useState, useEffect } from 'react';
import { createDailyCheck, getDefauts, getActiveSamples, getDestinations, getVarietes } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './DailyChecksPage.css';

const DailyChecksPage = () => {
  const [samples, setSamples] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [availableDefects, setAvailableDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defectsLoading, setDefectsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [selectedDefect, setSelectedDefect] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [defectRecords, setDefectRecords] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [samplesData, destinationsData, varietiesData, defectsData] = await Promise.all([
        getActiveSamples(),
        getDestinations(),
        getVarietes(),
        getDefauts()
      ]);
      setSamples(samplesData || []);
      setDestinations(destinationsData || []);
      setVarieties(varietiesData || []);
      setAvailableDefects(defectsData || []);
      setError(null);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingDefects = (sampleId) => {
    try {
      setDefectsLoading(true);
      setError(null);

      // Load from localStorage
      const stored = localStorage.getItem(`dailyCheck_${sampleId}`);
      const defects = stored ? JSON.parse(stored) : [];

      setDefectRecords(defects);
    } catch (err) {
      console.error('Failed to load existing defects:', err);
      setError('Failed to load existing defects: ' + err.message);
      setDefectRecords([]);
    } finally {
      setDefectsLoading(false);
    }
  };

  const handleSampleSelect = async (e) => {
    const sampleId = parseInt(e.target.value);
    const sample = samples.find(s => s.id === sampleId);
    setSelectedSample(sample);

    if (sample) {
      await loadExistingDefects(sample.id);
    } else {
      setDefectRecords([]);
    }

    // Reset form inputs
    setSelectedDefect('');
    setQuantity(0);
    setError(null);
  };

  const addDefectRecord = async () => {
    if (!selectedSample || !selectedDefect || quantity <= 0) {
      setError('Please select a sample, defect and enter a valid quantity');
      return;
    }

    const selectedDefectData = availableDefects.find(d => d.coddef.toString() === selectedDefect);
    if (!selectedDefectData) {
      setError('Invalid defect selected');
      return;
    }

    try {
      setError(null);

      // Prepare defect data for API
      const defectData = {
        checkDate: new Date().toISOString().split('T')[0],
        defects: [{
          defectId: selectedDefect,
          quantity: quantity
        }]
      };

      console.log('Submitting defect data:', defectData);
      await createDailyCheck(selectedSample.id, defectData);

      // Create new defect record for display
      const newRecord = {
        id: `saved-${Date.now()}-${Math.random()}`,
        defectId: selectedDefect,
        defectName: selectedDefectData.intdef,
        defectFamily: selectedDefectData.famdef,
        quantity: quantity,
        checkDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Add to local state
      const updatedRecords = [...defectRecords, newRecord];
      setDefectRecords(updatedRecords);

      // Save to localStorage for persistence
      localStorage.setItem(`dailyCheck_${selectedSample.id}`, JSON.stringify(updatedRecords));

      // Reset form
      setSelectedDefect('');
      setQuantity(0);

      // Refresh the samples list to update status
      await fetchData();

    } catch (err) {
      console.error('Failed to add defect:', err);
      setError('Failed to add defect: ' + err.message);
    }
  };

  const removeDefectRecord = (id) => {
    if (!selectedSample) return;

    // Remove from local state
    const updatedRecords = defectRecords.filter(record => record.id !== id);
    setDefectRecords(updatedRecords);

    // Update localStorage
    localStorage.setItem(`dailyCheck_${selectedSample.id}`, JSON.stringify(updatedRecords));
  };





  const handleCancel = () => {
    // Clear localStorage for current sample if canceling
    if (selectedSample) {
      localStorage.removeItem(`dailyCheck_${selectedSample.id}`);
    }

    setSelectedSample(null);
    setSelectedDefect('');
    setQuantity(0);
    setDefectRecords([]);
    setShowForm(false);
    setError(null);
  };

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

  // Sort samples by reception number (descending - highest first)
  const sortedSamples = [...samples].sort((a, b) =>
    b.numrec - a.numrec
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="daily-checks-page">
      <h1>Daily Quality Checks</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Outer Container: Record Daily Check - Always on Top */}
      <div className="create-section-outer">
        <div className="create-section">
          <h2>Record Daily Check</h2>
          <p>Select a sample test to record daily quality defects.</p>

          {!showForm ? (
            <button className="create-btn" onClick={() => setShowForm(true)}>
              + Record Daily Check
            </button>
          ) : (
            <div className="form-container">
              <h3>Daily Check - Sample #{selectedSample?.numrec}</h3>
              <div className="daily-check-form">
                <div className="form-row">
                  <div className="input-group">
                    <label>Select Sample Test *</label>
                    <select
                      value={selectedSample?.id || ''}
                      onChange={handleSampleSelect}
                      required
                    >
                      <option value="">Select a sample...</option>
                      {sortedSamples.map(sample => (
                        <option key={sample.id} value={sample.id}>
                          #{sample.numrec} - {getDestinationName(sample.coddes)} - {getVarietyName(sample.codvar)} (Day {calculateDays(sample.startDate)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSample && (
                    <>
                      <div className="input-group">
                        <label>Select Defect</label>
                        <select
                          value={selectedDefect}
                          onChange={(e) => setSelectedDefect(e.target.value)}
                        >
                          <option value="">Choose a defect...</option>
                          {availableDefects.map(defect => (
                            <option key={defect.coddef} value={defect.coddef}>
                              {defect.intdef} ({defect.famdef})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="input-group">
                        <label>Number of Fruits</label>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                          placeholder="Enter quantity"
                        />
                      </div>

                      <div className="input-group">
                        <label>&nbsp;</label>
                        <button
                          type="button"
                          onClick={addDefectRecord}
                          className="add-btn"
                          disabled={!selectedDefect || quantity <= 0}
                        >
                          Add Defect
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Defect Records Table */}
                {(defectRecords.length > 0 || defectsLoading) && (
                  <div className="defect-records-table">
                    <h4>Defects for Sample #{selectedSample?.numrec} ({defectRecords.length})</h4>
                    {defectsLoading ? (
                      <div className="loading-defects">Loading existing defects...</div>
                    ) : (
                      <table className="records-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Defect</th>
                            <th>Type</th>
                            <th>Quantity</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {defectRecords.map(record => (
                            <tr key={record.id}>
                              <td>{record.checkDate ? new Date(record.checkDate).toLocaleDateString() : 'Today'}</td>
                              <td>{record.defectName}</td>
                              <td>{record.defectFamily}</td>
                              <td>{record.quantity}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => removeDefectRecord(record.id)}
                                  className="remove-btn"
                                  title="Remove this defect"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={handleCancel}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Samples Section */}
      <div className="samples-section">
        <h2>Active Sample Tests</h2>

        {sortedSamples.length === 0 ? (
          <div className="empty-state">
            <p>No active sample tests found.</p>
            <p>Create sample tests to start daily quality monitoring.</p>
          </div>
        ) : (
          <div className="samples-list">
            {sortedSamples.map(sample => (
              <div key={sample.id} className="sample-item">
                <div className="sample-header">
                  <h4>Reception #{sample.numrec}</h4>
                  <span className={`status-badge ${sample.status === 0 ? 'active' : 'closed'}`}>
                    {sample.status === 0 ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div className="sample-details">
                  <p><strong>Day:</strong> {calculateDays(sample.startDate)}</p>
                  <p><strong>Client:</strong> {getDestinationName(sample.coddes)}</p>
                  <p><strong>Variety:</strong> {getVarietyName(sample.codvar)}</p>
                  <p><strong>Fruits:</strong> {sample.initialFruitCount}</p>
                  <p><strong>Status:</strong> {sample.isCheckedToday ? 'Checked Today ✅' : 'Pending Check'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyChecksPage;
