import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import Select from 'react-select'; // Using react-select for better UX
import './TraitementPage.css'; // New CSS file

// Re-using the TraitModal from TraitPage, but it could be moved to a components folder
const TraitModal = ({ onClose, onSave, grpVarOptions }) => {
    const [formData, setFormData] = useState({ nomcom: '', matieractive: '', dar: 0, codgrp: null });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Add New Trait Product</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Commercial Name</label>
                        <input type="text" name="nomcom" value={formData.nomcom || ''} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>Active Ingredient</label>
                        <input type="text" name="matieractive" value={formData.matieractive || ''} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>DAR (Days)</label>
                        <input type="number" name="dar" value={formData.dar || 0} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>Variety Group</label>
                        <select name="codgrp" value={formData.codgrp || ''} onChange={handleChange}>
                            <option value="">Select a Group</option>
                            {grpVarOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="clear-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="save-btn">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const TraitementPage = () => {
    const [traitements, setTraitements] = useState([]);
    const [newTraitement, setNewTraitement] = useState({ refver: null, ref: null, dateappli: '' });
    const [datePrecolte, setDatePrecolte] = useState('');

    // Dropdown options
    const [vergerOptions, setVergerOptions] = useState([]);
    const [traitOptions, setTraitOptions] = useState([]);
    const [grpVarOptions, setGrpVarOptions] = useState([]);
    
    // Page state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTraitements = useCallback(async () => {
        try {
            const data = await apiGet('/api/traitement');
            // Join with lookup data for display
            const vergers = await apiGet('/api/lookup/vergers');
            const traits = await apiGet('/api/trait');
            const enrichedData = data.map(t => ({
                ...t,
                vergerName: vergers.find(v => v.refver === t.refver)?.nomver || 'N/A',
                traitName: traits.find(p => p.ref === t.ref)?.nomcom || 'N/A'
            }));
            setTraitements(enrichedData);
        } catch (err) {
            setError('Failed to fetch treatments.');
        }
    }, []);
    
    const fetchLookups = useCallback(async () => {
        try {
             const [vergerData, traitData, grpVarData] = await Promise.all([
                apiGet('/api/lookup/vergers'),
                apiGet('/api/trait'),
                apiGet('/api/lookup/grpvars')
            ]);
            setVergerOptions(vergerData.map(v => ({ value: v.refver, label: v.nomver })));
            setTraitOptions(traitData.map(t => ({ value: t.ref, label: t.nomcom, dar: t.dar })));
            setGrpVarOptions(grpVarData.map(g => ({ value: g.codgrv, label: g.nomgrv })));
        } catch(err) {
            setError('Failed to load form data.');
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            await Promise.all([fetchTraitements(), fetchLookups()]);
            setIsLoading(false);
        };
        loadInitialData();
    }, [fetchTraitements, fetchLookups]);

    // --- Automatic Date Calculation ---
    useEffect(() => {
        if (newTraitement.dateappli && newTraitement.ref) {
            const selectedTrait = traitOptions.find(t => t.value === newTraitement.ref);
            if (selectedTrait && selectedTrait.dar) {
                const appliDate = new Date(newTraitement.dateappli);
                appliDate.setDate(appliDate.getDate() + selectedTrait.dar);
                setDatePrecolte(appliDate.toISOString().split('T')[0]);
            }
        } else {
            setDatePrecolte('');
        }
    }, [newTraitement.dateappli, newTraitement.ref, traitOptions]);

    const handleFormChange = (name, value) => {
        setNewTraitement(prev => ({ ...prev, [name]: value }));
    };

    const handleAddTraitement = async (e) => {
        e.preventDefault();
        try {
            await apiPost('/api/traitement', newTraitement);
            setNewTraitement({ refver: null, ref: null, dateappli: '' }); // Reset form
            fetchTraitements(); // Refresh list
        } catch (err) {
            setError('Failed to add treatment.');
        }
    };

    const handleDeleteTraitement = async (id) => {
        if (window.confirm('Are you sure you want to delete this treatment application?')) {
            try {
                await apiDelete(`/api/traitement/${id}`);
                fetchTraitements(); // Refresh list
            } catch (err) {
                setError('Failed to delete treatment.');
            }
        }
    };
    
    const handleSaveNewTrait = async (traitData) => {
        try {
            await apiPost('/api/trait', traitData);
            setIsModalOpen(false);
            fetchLookups(); // This will refresh the trait options dropdown
        } catch(err) {
            setError('Failed to save new trait product.');
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            {error && <p className="error-message">{error}</p>}

            <div className="form-card">
                <h2>Add New Treatment Application</h2>
                <form onSubmit={handleAddTraitement} className="traitement-form">
                    <div className="input-group">
                        <label>Orchard</label>
                        <Select
                            options={vergerOptions}
                            onChange={option => handleFormChange('refver', option ? option.value : null)}
                            isClearable
                        />
                    </div>
                    <div className="input-group">
                        <label>Treatment Product</label>
                        <div className="input-with-button">
                            <Select
                                options={traitOptions}
                                onChange={option => handleFormChange('ref', option ? option.value : null)}
                                isClearable
                            />
                            <button type="button" className="add-btn-inline" onClick={() => setIsModalOpen(true)}>+</button>
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Application Date</label>
                        <input type="date" value={newTraitement.dateappli} onChange={e => handleFormChange('dateappli', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Pre-Harvest Date (Auto-calculated)</label>
                        <input type="date" value={datePrecolte} disabled readOnly />
                    </div>
                    <button type="submit" className="save-btn">Save Treatment</button>
                </form>
            </div>

            <div className="table-container">
                <h2>Applied Treatments</h2>
                <table className="data-table">
                     <thead>
                        <tr>
                            <th>Orchard</th>
                            <th>Product</th>
                            <th>Application Date</th>
                            <th>Pre-Harvest Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {traitements.map(t => (
                            <tr key={t.numtrait}>
                                <td>{t.vergerName}</td>
                                <td>{t.traitName}</td>
                                <td>{new Date(t.dateappli).toLocaleDateString()}</td>
                                <td>{new Date(t.dateprecolte).toLocaleDateString()}</td>
                                <td>
                                    <button className="delete-btn" onClick={() => handleDeleteTraitement(t.numtrait)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <TraitModal 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSaveNewTrait} 
                    grpVarOptions={grpVarOptions}
                />
            )}
        </div>
    );
};

export default TraitementPage;
