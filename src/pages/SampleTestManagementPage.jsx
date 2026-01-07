import React, { useState, useEffect } from 'react';
import { getReceptions, createSampleTest, getActiveSamples, getDestinations, getVarietes } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './SampleTestManagementPage.css';

const SampleTestManagementPage = () => {
  const [receptions, setReceptions] = useState([]);
  const [activeSamples, setActiveSamples] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    numrec: '',
    selectedDestination: null,
    selectedVariety: null,
    startDate: new Date().toISOString().split('T')[0],
    initialFruitCount: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [receptionsData, samplesData, destinationsData, varietiesData] = await Promise.all([
        getReceptions(),
        getActiveSamples(),
        getDestinations(),
        getVarietes()
      ]);
      setReceptions(receptionsData || []);
      setActiveSamples(samplesData || []);
      setDestinations(destinationsData || []);
      setVarieties(varietiesData || []);
      setError(null);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReceptionSelect = (e) => {
    const selectedNumrec = parseInt(e.target.value);
    setFormData(prev => ({
      ...prev,
      numrec: selectedNumrec
    }));

    // Auto-fill other fields from selected reception
    const selectedReception = receptions.find(r => r.numrec === selectedNumrec);
    if (selectedReception) {
      // Find matching variety from dropdown options
      const matchingVariety = varieties.find(v => v.codvar === selectedReception.codvar);
      setFormData(prev => ({
        ...prev,
        selectedVariety: matchingVariety || null,
        initialFruitCount: selectedReception.nbrfru || 1
      }));
    }
  };

  const handleDropdownChange = (fieldName, selectedOption) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: selectedOption
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Send data with proper types matching backend expectations
      const sampleData = {
        numrec: parseInt(formData.numrec),
        startDate: formData.startDate, // Keep as string - backend will parse
        initialFruitCount: parseInt(formData.initialFruitCount),
        status: 0 // 0 = Active (enum value)
      };

      // Only add optional fields if they exist and are valid short integers
      if (formData.selectedDestination) {
        const coddesValue = formData.selectedDestination?.value || formData.selectedDestination?.coddes;
        if (coddesValue && Math.abs(coddesValue) <= 32767) { // short range check
          sampleData.coddes = coddesValue;
        }
      }
      if (formData.selectedVariety) {
        const codvarValue = formData.selectedVariety?.value || formData.selectedVariety?.codvar;
        if (codvarValue && Math.abs(codvarValue) <= 32767) { // short range check
          sampleData.codvar = codvarValue;
        }
      }

      console.log('Sending sample data:', sampleData);
      await createSampleTest(sampleData);
      
      // Reset form and refresh data
      setFormData({
        numrec: '',
        selectedDestination: null,
        selectedVariety: null,
        startDate: new Date().toISOString().split('T')[0],
        initialFruitCount: 1
      });
      setShowForm(false);
      
      // Refresh the lists
      await fetchData();
      
      alert('Sample test created successfully!');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to create sample test: ' + err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      numrec: '',
      selectedDestination: null,
      selectedVariety: null,
      startDate: new Date().toISOString().split('T')[0],
      initialFruitCount: 1
    });
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="sample-test-management">
      <h1>Sample Test Management</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="content-grid">
        {/* Left Column: Create New Sample Test */}
        <div className="create-section">
          <h2>Create New Sample Test</h2>
          <p>Select a reception to create a sample test for quality monitoring.</p>

          {!showForm ? (
            <button className="create-btn" onClick={() => setShowForm(true)}>
              + Create Sample Test
            </button>
          ) : (
            <div className="form-container">
              <h3>New Sample Test</h3>
              <form onSubmit={handleSubmit} className="sample-test-form">
                <div className="form-row">
                  <div className="input-group">
                    <label>Reception Number *</label>
                    <select
                      name="numrec"
                      value={formData.numrec}
                      onChange={handleReceptionSelect}
                      required
                    >
                      <option value="">Select Reception...</option>
                      {receptions.map(reception => (
                        <option key={reception.numrec} value={reception.numrec}>
                          #{reception.numrec} - {reception.dterec ? new Date(reception.dterec).toLocaleDateString() : 'No Date'} 
                          {reception.nbrfru ? ` (${reception.nbrfru} fruits)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Client Code</label>
                    <select
                      value={formData.selectedDestination ? formData.selectedDestination.value || formData.selectedDestination.coddes : ''}
                      onChange={(e) => {
                        const selectedDest = destinations.find(d => 
                          d.value === parseInt(e.target.value) || d.coddes === parseInt(e.target.value)
                        );
                        handleDropdownChange('selectedDestination', selectedDest);
                      }}
                    >
                      <option value="">Select Client...</option>
                      {destinations.map(dest => (
                        <option key={dest.value || dest.coddes} value={dest.value || dest.coddes}>
                          {dest.label || dest.vildes || `Client ${dest.coddes}`} (#{dest.value || dest.coddes})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Variety Code</label>
                    <select
                      value={formData.selectedVariety ? formData.selectedVariety.value || formData.selectedVariety.codvar : ''}
                      onChange={(e) => {
                        const selectedVar = varieties.find(v => 
                          v.value === parseInt(e.target.value) || v.codvar === parseInt(e.target.value)
                        );
                        handleDropdownChange('selectedVariety', selectedVar);
                      }}
                    >
                      <option value="">Select Variety...</option>
                      {varieties.map(variety => (
                        <option key={variety.value || variety.codvar} value={variety.value || variety.codvar}>
                          {variety.label || variety.nomvar || `Variety ${variety.codvar}`} (#{variety.value || variety.codvar})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Initial Fruit Count *</label>
                    <input
                      type="number"
                      name="initialFruitCount"
                      value={formData.initialFruitCount}
                      onChange={handleFormChange}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    Create Sample Test
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Existing Sample Tests */}
        <div className="samples-section">
          <h2>Active Sample Tests</h2>
          
          {activeSamples.length === 0 ? (
            <div className="empty-state">
              <p>No active sample tests found.</p>
              <p>Create a sample test to start monitoring.</p>
            </div>
          ) : (
            <div className="samples-list">
              {activeSamples.map(sample => (
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
    </div>
  );
};

export default SampleTestManagementPage;
