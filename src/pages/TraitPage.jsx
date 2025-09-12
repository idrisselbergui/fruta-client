import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './TraitPage.css'; // We will create this new CSS file

// Modal component for Add/Edit form
const TraitModal = ({ trait, onClose, onSave, grpVarOptions }) => {
    const [formData, setFormData] = useState(
        trait || { nomcom: '', matieractive: '', dar: 0, codgrp: null }
    );

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
                <h2>{trait ? 'Edit Trait' : 'Add New Trait'}</h2>
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


// Main Page Component
const TraitPage = () => {
    const [traits, setTraits] = useState([]);
    const [grpVarOptions, setGrpVarOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrait, setEditingTrait] = useState(null);

    const fetchTraits = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await apiGet('/api/trait');
            setTraits(data);
        } catch (err) {
            setError('Failed to fetch traits.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchGrpVars = async () => {
            try {
                const data = await apiGet('/api/lookup/grpvars');
                setGrpVarOptions(data.map(g => ({ value: g.codgrv, label: g.nomgrv })));
            } catch (err) {
                console.error("Failed to fetch group varieties", err);
            }
        };
        fetchTraits();
        fetchGrpVars();
    }, [fetchTraits]);

    const handleOpenModal = (trait = null) => {
        setEditingTrait(trait);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTrait(null);
    };

    const handleSaveTrait = async (traitData) => {
        try {
            if (editingTrait) {
                // Update existing trait
                await apiPut(`/api/trait/${editingTrait.ref}`, traitData);
            } else {
                // Create new trait
                await apiPost('/api/trait', traitData);
            }
            handleCloseModal();
            fetchTraits(); // Refresh the list
        } catch (err) {
            setError('Failed to save trait.');
        }
    };

    const handleDeleteTrait = async (id) => {
        if (window.confirm('Are you sure you want to delete this trait?')) {
            try {
                await apiDelete(`/api/trait/${id}`);
                fetchTraits(); // Refresh the list
            } catch (err) {
                setError('Failed to delete trait.');
            }
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="page-container"><p className="error-message">{error}</p></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Manage Treatment Products</h1>
                <button className="add-btn" onClick={() => handleOpenModal()}>+ Add New Trait</button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Commercial Name</th>
                            <th>Active Ingredient</th>
                            <th>DAR (Days)</th>
                            <th>Variety Group</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {traits.map(trait => (
                            <tr key={trait.ref}>
                                <td>{trait.nomcom}</td>
                                <td>{trait.matieractive}</td>
                                <td>{trait.dar}</td>
                                <td>{grpVarOptions.find(g => g.value === trait.codgrp)?.label || 'N/A'}</td>
                                <td className="action-buttons">
                                    <button className="edit-btn" onClick={() => handleOpenModal(trait)}>Edit</button>
                                    <button className="delete-btn" onClick={() => handleDeleteTrait(trait.ref)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <TraitModal 
                    trait={editingTrait} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveTrait} 
                    grpVarOptions={grpVarOptions}
                />
            )}
        </div>
    );
};

export default TraitPage;
