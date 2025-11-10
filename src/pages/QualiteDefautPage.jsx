import React, { useState, useEffect, useCallback } from 'react';
import { getDefauts, createDefaut, updateDefaut, deleteDefaut } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './QualiteDefautPage.css';

// Main Page Component
const QualiteDefautPage = () => {
    const [defauts, setDefauts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingDefaut, setEditingDefaut] = useState(null);
    const [formData, setFormData] = useState({ intdef: '', famdef: 'DEFAUT MINEUR' });

    const fetchDefauts = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getDefauts();
            setDefauts(data);
        } catch (err) {
            setError('Failed to fetch quality defaut.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDefauts();
    }, [fetchDefauts]);

    const handleShowForm = (defaut = null) => {
        setError(null); // Clear previous errors
        setEditingDefaut(defaut);
        if (defaut) {
            setFormData({
                coddef: defaut.coddef,
                intdef: defaut.intdef || '',
                famdef: defaut.famdef || 'DEFAUT MINEUR'
            });
        } else {
            setFormData({ intdef: '', famdef: 'DEFAUT MINEUR' });
        }
        setShowForm(true);
    };

    const handleHideForm = () => {
        setShowForm(false);
        setEditingDefaut(null);
        setFormData({ intdef: '', famdef: 'DEFAUT MINEUR' });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveDefaut = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous errors
        try {
            if (editingDefaut) {
                await updateDefaut(editingDefaut.coddef, formData);
            } else {
                await createDefaut(formData);
            }
            handleHideForm();
            fetchDefauts();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteDefaut = async (coddef) => {
        if (window.confirm('Are you sure you want to delete this quality defaut?')) {
            setError(null); // Clear previous errors
            try {
                await deleteDefaut(coddef);
                fetchDefauts();
            } catch (err) {
                setError(err.message);
            }
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Manage Quality defaut</h1>
                <button className="add-btn" onClick={() => handleShowForm()}>+ Add New defaut</button>
            </div>

            {/* Error display */}
            {error && <p className="error-message">{error}</p>}

            {/* Inline Form */}
            {showForm && (
                <div className="form-container">
                    <h3>{editingDefaut ? 'Edit Quality defaut' : 'Add New Quality defaut'}</h3>
                    <form onSubmit={handleSaveDefaut} className="defaut-form">
                        <div className="form-row">
                            <div className="input-group">
                                <label>Labelle</label>
                                <input
                                    type="text"
                                    name="intdef"
                                    value={formData.intdef}
                                    onChange={handleFormChange}
                                    required
                                    placeholder="Enter defaut labelle"
                                />
                            </div>
                            <div className="input-group">
                                <label>Type</label>
                                <select name="famdef" value={formData.famdef} onChange={handleFormChange} required>
                                    <option value="DEFAUT MINEUR">DEFAUT MINEUR</option>
                                    <option value="DEFAUT MAJEUR">DEFAUT MAJEUR</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="clear-btn" onClick={handleHideForm}>Cancel</button>
                                <button type="submit" className="save-btn">Save</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Labelle</th>
                            <th>Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {defauts.map(defaut => (
                            <tr key={defaut.coddef}>
                                <td>{defaut.coddef}</td>
                                <td>{defaut.intdef}</td>
                                <td>{defaut.famdef}</td>
                                <td className="action-buttons">
                                    <button className="edit-btn" onClick={() => handleShowForm(defaut)}>Edit</button>
                                    <button className="delete-btn" onClick={() => handleDeleteDefaut(defaut.coddef)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QualiteDefautPage;
