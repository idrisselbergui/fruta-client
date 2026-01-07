import React, { useState } from 'react';
import { createDailyCheck } from '../apiService';

const DailyCheckModal = ({ isOpen, onClose, onSave, sample, destinations = [], varieties = [] }) => {
  const [defects, setDefects] = useState({
    Rot: 0,
    Mold: 0,
    Soft: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !sample) return null;

  const handleInputChange = (defectType, value) => {
    const numValue = parseInt(value) || 0;
    setDefects(prev => ({
      ...prev,
      [defectType]: numValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare defects array (only non-zero values)
      const defectsArray = Object.entries(defects)
        .filter(([_, quantity]) => quantity > 0)
        .map(([type, quantity]) => ({
          type: type.toLowerCase(), // API expects lowercase: 'rot', 'mold', 'soft'
          quantity
        }));

      const checkData = {
        checkDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        defects: defectsArray
      };

      await createDailyCheck(sample.id, checkData);
      
      // Refresh the samples list
      onSave();
      
      // Close modal
      onClose();
      
      // Reset form
      setDefects({ Rot: 0, Mold: 0, Soft: 0 });
    } catch (err) {
      setError(err.message || 'Failed to save daily check');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDefects({ Rot: 0, Mold: 0, Soft: 0 });
    setError(null);
    onClose();
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

            <div className="defects-input">
              <div className="defect-input">
                <label htmlFor="rot">Rot</label>
                <input
                  id="rot"
                  type="number"
                  min="0"
                  value={defects.Rot}
                  onChange={(e) => handleInputChange('Rot', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="defect-input">
                <label htmlFor="mold">Mold</label>
                <input
                  id="mold"
                  type="number"
                  min="0"
                  value={defects.Mold}
                  onChange={(e) => handleInputChange('Mold', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="defect-input">
                <label htmlFor="soft">Soft</label>
                <input
                  id="soft"
                  type="number"
                  min="0"
                  value={defects.Soft}
                  onChange={(e) => handleInputChange('Soft', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

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
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Daily Check'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DailyCheckModal;
