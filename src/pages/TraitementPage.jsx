import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet, apiPost, apiDelete } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import Select from 'react-select';
import './TraitementPage.css';

// This modal is for adding a NEW product directly from this page.
const TraitModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({ nomcom: '', matieractive: '', dar: 0, dos: 0, unite: '' });

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
                    <div className="input-group"><label>Commercial Name</label><input type="text" name="nomcom" value={formData.nomcom || ''} onChange={handleChange} required /></div>
                    <div className="input-group"><label>Active Ingredient</label><input type="text" name="matieractive" value={formData.matieractive || ''} onChange={handleChange} required /></div>
                    <div className="input-group"><label>DAR (Days)</label><input type="number" name="dar" value={formData.dar || 0} onChange={handleChange} required /></div>
                    <div className="input-group"><label>Dosage</label><input type="number" name="dos" value={formData.dos || 0} onChange={handleChange} /></div>
                    <div className="input-group"><label>Unit</label><input type="text" name="unite" value={formData.unite || ''} onChange={handleChange} /></div>
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
    const [newTraitement, setNewTraitement] = useState({ refver: null, codgrp: null, codvar: null, ref: null, dateappli: '' });
    const [datePrecolte, setDatePrecolte] = useState('');

    // Dropdown options
    const [vergerOptions, setVergerOptions] = useState([]);
    const [traitOptions, setTraitOptions] = useState([]);
    const [grpVarOptions, setGrpVarOptions] = useState([]);
    const [varieteOptions, setVarieteOptions] = useState([]);

    // Page state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTraitements = useCallback(async () => {
        try {
            const data = await apiGet('/api/traitement');
            const sortedData = data.sort((a, b) => b.numtrait - a.numtrait);
            setTraitements(sortedData);
        } catch (err) {
            setError('Failed to fetch treatments.');
        }
    }, []);

    const fetchLookups = useCallback(async () => {
        try {
             const [vergerData, traitData, grpVarData, varieteData] = await Promise.all([
                apiGet('/api/lookup/vergers'),
                apiGet('/api/trait'),
                apiGet('/api/lookup/grpvars'),
                apiGet('/api/lookup/varietes'),
            ]);
            setVergerOptions(vergerData.map(v => ({ value: v.refver, label: v.nomver })));
            setTraitOptions(traitData.map(t => ({ value: t.ref, label: t.nomcom, dar: t.dar })));
            setGrpVarOptions(grpVarData.map(g => ({ value: g.codgrv, label: g.nomgrv })));
            setVarieteOptions(varieteData.map(v => ({ value: v.codvar, label: v.nomvar, grpVarId: v.codgrv })));
        } catch(err) {
            setError('Failed to load form data.');
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            await Promise.all([fetchTraitements(), fetchLookups()]);
            setIsLoading(false);
        };
        loadInitialData();
    }, [fetchTraitements, fetchLookups]);

    useEffect(() => {
        if (newTraitement.dateappli && newTraitement.ref) {
            const selectedTrait = traitOptions.find(t => t.value === newTraitement.ref);
            if (selectedTrait && selectedTrait.dar) {
                const appliDate = new Date(newTraitement.dateappli);
                appliDate.setDate(appliDate.getDate() + selectedTrait.dar);
                setDatePrecolte(appliDate.toISOString().split('T')[0]);
            } else {
                 setDatePrecolte('');
            }
        } else {
            setDatePrecolte('');
        }
    }, [newTraitement.dateappli, newTraitement.ref, traitOptions]);

    const handleFormChange = (name, value) => {
        setNewTraitement(prev => ({ ...prev, [name]: value }));
    };

    const filteredVarieteOptions = useMemo(() => {
        if (!newTraitement.codgrp) return [];
        return varieteOptions.filter(v => v.grpVarId === newTraitement.codgrp);
    }, [newTraitement.codgrp, varieteOptions]);

    const handleGrpVarChange = (option) => {
        setNewTraitement(prev => ({
            ...prev,
            codgrp: option ? option.value : null,
            codvar: null // Reset variety selection
        }));
    };

    const handleAddTraitement = async (e) => {
        e.preventDefault();
        setError(null);

        const { refver, codgrp, codvar, ref, dateappli } = newTraitement;
        if (!refver || !codgrp || !codvar || !ref || !dateappli) {
            setError("Please fill out all fields before saving.");
            return;
        }

        try {
            await apiPost('/api/traitement', newTraitement);
            setNewTraitement({ refver: null, codgrp: null, codvar: null, ref: null, dateappli: '' });
            await fetchTraitements(); // Re-fetch data after adding
        } catch (err) {
            setError(`Failed to add treatment: ${err.message}`);
        }
    };

    const handleDeleteTraitement = async (id) => {
        if (window.confirm('Are you sure you want to delete this treatment application?')) {
            setError(null);
            try {
                // 1. Call the API to delete the item from the database.
                await apiDelete(`/api/traitement/${id}`);
                // 2. After a successful deletion, re-fetch the entire list from the server.
                await fetchTraitements();
            } catch (err) {
                // 3. If the API call fails, show an error.
                setError(`Failed to delete treatment: ${err.message}`);
            }
        }
    };

    const handleSaveNewTrait = async (traitData) => {
        setError(null);
        try {
            await apiPost('/api/trait', traitData);
            setIsModalOpen(false);
            fetchLookups();
        } catch(err) {
            setError(`Failed to save new trait product: ${err.message}`);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            {error && <p className="error-message">{error}</p>}

            <div className="form-card">
                <h2>Add New Treatment Application</h2>
                <form onSubmit={handleAddTraitement} className="traitement-form">
                    <div className="input-group"><label>Orchard</label><Select options={vergerOptions} onChange={option => handleFormChange('refver', option ? option.value : null)} value={vergerOptions.find(o => o.value === newTraitement.refver) || null} isClearable /></div>
                    <div className="input-group"><label>Variety Group</label><Select options={grpVarOptions} onChange={handleGrpVarChange} value={grpVarOptions.find(o => o.value === newTraitement.codgrp) || null} isClearable /></div>
                    <div className="input-group"><label>Variety</label><Select key={newTraitement.codgrp || 'empty'} options={filteredVarieteOptions} onChange={option => handleFormChange('codvar', option ? option.value : null)} value={filteredVarieteOptions.find(o => o.value === newTraitement.codvar) || null} isDisabled={!newTraitement.codgrp} isClearable /></div>
                    <div className="input-group"><label>Treatment Product</label><div className="input-with-button"><Select options={traitOptions} onChange={option => handleFormChange('ref', option ? option.value : null)} value={traitOptions.find(o => o.value === newTraitement.ref) || null} isClearable /><button type="button" className="add-btn-inline" onClick={() => setIsModalOpen(true)}>+</button></div></div>
                    <div className="input-group"><label>Application Date</label><input type="date" value={newTraitement.dateappli} onChange={e => handleFormChange('dateappli', e.target.value)} /></div>
                    <div className="input-group"><label>Pre-Harvest Date (Auto-calculated)</label><input type="date" value={datePrecolte} disabled readOnly /></div>
                    <button type="submit" className="save-btn">Save Treatment</button>
                </form>
            </div>

            <div className="table-container">
                <h2>Applied Treatments</h2>
                <table className="data-table">
                     <thead>
                        <tr>
                            <th>Orchard</th>
                            <th>Variety Group</th>
                            <th>Variety</th>
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
                                <td>{t.grpVarName}</td>
                                <td>{t.varieteName}</td>
                                <td>{t.traitName}</td>
                                <td>{new Date(t.dateappli).toLocaleDateString()}</td>
                                <td>{new Date(t.dateprecolte).toLocaleDateString()}</td>
                                <td><button className="delete-btn" onClick={() => handleDeleteTraitement(t.numtrait)}>Delete</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (<TraitModal onClose={() => setIsModalOpen(false)} onSave={handleSaveNewTrait} />)}
        </div>
    );
};

export default TraitementPage;

