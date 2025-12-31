import React, { useState, useEffect } from 'react';
import {
  getMarques,
  getAssignmentsByMarque,
  createMarqueAssignment,
  updateMarqueAssignment,
  deleteMarqueAssignment,
  getVergers,
  getVarietes
} from '../apiService';
import './MarqueManagementPage.css';

const MarqueManagementPage = () => {
  const [marques, setMarques] = useState([]);
  const [selectedMarque, setSelectedMarque] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [vergers, setVergers] = useState([]);
  const [varietes, setVarietes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Form data
  const [assignmentForm, setAssignmentForm] = useState({ codmar: '', refver: '', codvar: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [marquesData, vergersData, varietesData] = await Promise.all([
        getMarques(),
        getVergers(),
        getVarietes()
      ]);

      setMarques(marquesData || []);
      setVergers(vergersData || []);
      setVarietes(varietesData || []);
      setError(null);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarqueSelect = async (marque) => {
    setSelectedMarque(marque);
    try {
      const assignmentsData = await getAssignmentsByMarque(marque.codmar);
      setAssignments(assignmentsData || []);
    } catch (err) {
      setError('Failed to load assignments: ' + err.message);
      setAssignments([]);
    }
  };

  const handleAssignmentFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        codmar: parseInt(assignmentForm.codmar),
        refver: parseInt(assignmentForm.refver),
        codvar: parseInt(assignmentForm.codvar)
      };

      if (editingAssignment) {
        await updateMarqueAssignment(editingAssignment.id, formData);
      } else {
        await createMarqueAssignment(formData);
      }

      // Reload assignments for the selected marque
      if (selectedMarque) {
        const assignmentsData = await getAssignmentsByMarque(selectedMarque.codmar);
        setAssignments(assignmentsData || []);
      }

      setShowAssignmentForm(false);
      setEditingAssignment(null);
      setAssignmentForm({ codmar: '', refver: '', codvar: '' });
    } catch (err) {
      setError('Failed to save assignment: ' + err.message);
    }
  };

  const handleAssignmentEdit = (assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      codmar: assignment.codmar.toString(),
      refver: assignment.refver.toString(),
      codvar: assignment.codvar.toString()
    });
    setShowAssignmentForm(true);
  };

  const handleAssignmentDelete = async (assignment) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await deleteMarqueAssignment(assignment.id);
      // Reload assignments for the selected marque
      if (selectedMarque) {
        const assignmentsData = await getAssignmentsByMarque(selectedMarque.codmar);
        setAssignments(assignmentsData || []);
      }
    } catch (err) {
      setError('Failed to delete assignment: ' + err.message);
    }
  };

  const handleAddAssignment = () => {
    if (!selectedMarque) {
      setError('Please select a marque first');
      return;
    }
    setAssignmentForm({
      codmar: selectedMarque.codmar.toString(),
      refver: '',
      codvar: ''
    });
    setShowAssignmentForm(true);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="marque-management">
      <h1>Marque Management</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="marque-management-content">
        {/* Marques Section */}
        <div className="marques-section">
          <div className="section-header">
            <h2>Marques</h2>
          </div>

          <div className="marques-list">
            {marques.map(marque => (
              <div
                key={marque.codmar}
                className={`marque-item ${selectedMarque?.codmar === marque.codmar ? 'selected' : ''}`}
                onClick={() => handleMarqueSelect(marque)}
              >
                <div className="marque-info">
                  <span className="marque-code">#{marque.codmar}</span>
                  <span className="marque-name">{marque.desmar}</span>
                  <span className="marque-lier">({marque.lier})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments Section */}
        <div className="assignments-section">
          <div className="section-header">
            <h2>Assignments {selectedMarque && `- ${selectedMarque.desmar}`}</h2>
            <button
              className="btn btn-primary"
              onClick={handleAddAssignment}
              disabled={!selectedMarque}
            >
              Add Assignment
            </button>
          </div>

          {/* Inline Form */}
          {showAssignmentForm && selectedMarque && (
            <div className="form-container">
              <h3>{editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}</h3>
              <form onSubmit={handleAssignmentFormSubmit} className="assignment-form">
                <div className="form-row">
                  <div className="input-group">
                    <label>Verger</label>
                    <select
                      value={assignmentForm.refver}
                      onChange={(e) => setAssignmentForm({...assignmentForm, refver: e.target.value})}
                      required
                    >
                      <option value="">Select Verger</option>
                      {vergers.map(verger => (
                        <option key={verger.refver} value={verger.refver}>
                          {verger.nomver} (#{verger.refver})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Variete</label>
                    <select
                      value={assignmentForm.codvar}
                      onChange={(e) => setAssignmentForm({...assignmentForm, codvar: e.target.value})}
                      required
                    >
                      <option value="">Select Variete</option>
                      {varietes.map(variete => (
                        <option key={variete.codvar} value={variete.codvar}>
                          {variete.nomvar} (#{variete.codvar})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="clear-btn" onClick={() => setShowAssignmentForm(false)}>Cancel</button>
                    <button type="submit" className="save-btn">Save</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {selectedMarque ? (
            <div className="assignments-table">
              <table>
                <thead>
                  <tr>
                    <th>Verger</th>
                    <th>Variete</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(assignment => (
                    <tr key={assignment.id}>
                      <td>{assignment.vergerName || `ID: ${assignment.refver}`}</td>
                      <td>{assignment.varieteName || `ID: ${assignment.codvar}`}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleAssignmentEdit(assignment)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleAssignmentDelete(assignment)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan="3" className="no-data">No assignments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-selection">Select a marque to view assignments</div>
          )}
        </div>
      </div>


    </div>
  );
};

export default MarqueManagementPage;
