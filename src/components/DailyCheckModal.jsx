import React, { useState, useEffect } from 'react';
import { createDailyCheck, getDefauts } from '../apiService';

const DailyCheckModal = ({ isOpen, onClose, onSave, sample, destinations = [], varieties = [] }) => {
  const [selectedDefect, setSelectedDefect] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [defectRecords, setDefectRecords] = useState([]);
  const [availableDefects, setAvailableDefects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available defects when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadDefects = async () => {
        try {
          const defects = await getDefauts();
          setAvailableDefects(defects || []);
        } catch (err) {
          console.error('Failed to load defects:', err);
          setAvailableDefects([]);
        }
      };
      loadDefects();
    }
  }, [isOpen]);

  if (!isOpen || !sample) return null;

  const addDefectRecord = () => {
    if (!selectedDefect || quantity <= 0) {
      setError('Please select a defect and enter a valid quantity');
      return;
    }

    const selectedDefectData = availableDefects.find(d => d.coddef.toString() === selectedDefect);
    if (!selectedDefectData) {
      setError('Invalid defect selected');
      return;
    }

    const newRecord = {
      id: Date.now(), // Simple ID for removal
      defectId: selectedDefect,
      defectName: selectedDefectData.intdef,
      defectFamily: selectedDefectData.famdef,
      quantity: quantity
    };

    setDefectRecords([...defectRecords, newRecord]);
    
    // Reset form
    setSelectedDefect('');
    setQuantity(0);
    setError(null);
  };

  const removeDefectRecord = (id) => {
    setDefectRecords(defectRecords.filter(record => record.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (defectRecords.length === 0) {
        throw new Error('Please add at least one defect record');
      }

      // Prepare defects array
      const defectsArray = defectRecords.map(record => ({
        defectId: record.defectId,
        quantity: record.quantity
      }));

      const checkData = {
        checkDate: new Date().toISOString().split('T')[0],
        defects: defectsArray
      };

      console.log('Submitting daily check data:', checkData);
      await createDailyCheck(sample.id, checkData);
      
      // Refresh the samples list
      onSave();
      
      // Close modal and reset
      onClose();
      resetForm();
    } catch (err) {
      console.error('Daily check submission error:', err);
      setError(err.message || 'Failed to save daily check');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedDefect('');
    setQuantity(0);
    setDefectRecords([]);
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

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Daily Check - Reception {sample.numrec}</h2>
          <button className="modal-close" onClick={handleCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="sample-info">
            <p><strong>Day:</strong> {calculateDays(sample.startDate)}</p>
            <p><strong>Client:</strong> {getDestinationName(sample.coddes)}</p>
            <p><strong>Variety:</strong> {getVarietyName(sample.codvar)}</p>
            <p><strong>Fruits:</strong> {sample.initialFruitCount}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <h3>Defects Found Today</h3>
            
            {error && (
              <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                {error}
              </div>
            )}

            {availableDefects.length === 0 ? (
              <div className="no-defects-message">
                <p>No defects configured. Please add defects in the Quality Defects page first.</p>
              </div>
            ) : (
              <>
                {/* Add Defect Section */}
                <div className="add-defect-section">
                  <div className="form-row">
                    <div className="input-group">
                      <label>Select Defect</label>
                      <select
                        value={selectedDefect}
                        onChange={(e) => setSelectedDefect(e.target.value)}
                        disabled={loading}
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
                        disabled={loading}
                        placeholder="Enter quantity"
                      />
                    </div>

                    <div className="input-group">
                      <label>&nbsp;</label>
                      <button
                        type="button"
                        onClick={addDefectRecord}
                        className="add-btn"
                        disabled={loading || !selectedDefect || quantity <= 0}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Defect Records Table */}
                {defectRecords.length > 0 && (
                  <div className="defect-records-table">
                    <h4>Added Defects ({defectRecords.length})</h4>
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Defect</th>
                          <th>Type</th>
                          <th>Quantity</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defectRecords.map(record => (
                          <tr key={record.id}>
                            <td>{record.defectName}</td>
                            <td>{record.defectFamily}</td>
                            <td>{record.quantity}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeDefectRecord(record.id)}
                                className="remove-btn"
                                disabled={loading}
                                title="Remove this record"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="cancel-btn"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="save-btn"
                    disabled={loading || defectRecords.length === 0}
                  >
                    {loading ? 'Saving...' : 'Save Daily Check'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default DailyCheckModal;
