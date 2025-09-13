import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './TraitPage.css';

// Modal component for Add/Edit form
const TraitModal = ({ trait, onClose, onSave }) => {
    const [formData, setFormData] = useState(
        trait || { nomcom: '', matieractive: '', dar: 0, dos: 0, unite: '' }
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
                <h2>{trait ? 'Edit Product' : 'Add New Product'}</h2>
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
                        <label>Dosage</label>
                        <input type="number" name="dos" value={formData.dos || 0} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label>Unit</label>
                        <input type="text" name="unite" value={formData.unite || ''} onChange={handleChange} />
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
            setError('Failed to fetch products.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTraits();
    }, [fetchTraits]);

    const handleOpenModal = (trait = null) => {
        setError(null); // Clear previous errors when opening modal
        setEditingTrait(trait);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTrait(null);
    };

    const handleSaveTrait = async (traitData) => {
        setError(null); // Clear previous errors
        try {
            if (editingTrait) {
                await apiPut(`/api/trait/${editingTrait.ref}`, traitData);
            } else {
                await apiPost('/api/trait', traitData);
            }
            handleCloseModal();
            fetchTraits();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteTrait = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            setError(null); // Clear previous errors
            try {
                await apiDelete(`/api/trait/${id}`);
                fetchTraits();
            } catch (err) {
                // --- ENHANCED ERROR HANDLING ---
                // Display the specific error message from the backend.
                setError(err.message);
                // --- END OF CHANGE ---
            }
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Manage Treatment Products</h1>
                <button className="add-btn" onClick={() => handleOpenModal()}>+ Add New Product</button>
            </div>
            
            {/* --- ERROR DISPLAY --- */}
            {/* This will now show any error messages from the backend or frontend. */}
            {error && <p className="error-message">{error}</p>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Commercial Name</th>
                            <th>Active Ingredient</th>
                            <th>DAR (Days)</th>
                            <th>Dosage</th>
                            <th>Unit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {traits.map(trait => (
                            <tr key={trait.ref}>
                                <td>{trait.nomcom}</td>
                                <td>{trait.matieractive}</td>
                                <td>{trait.dar}</td>
                                <td>{trait.dos}</td>
                                <td>{trait.unite}</td>
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
                />
            )}
        </div>
    );
};

export default TraitPage;

