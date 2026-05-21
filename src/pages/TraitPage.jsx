import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './TraitPage.css';

// Main Page Component
const TraitPage = () => {
    const [traits, setTraits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingTrait, setEditingTrait] = useState(null);
    const [formData, setFormData] = useState({ nomcom: '', matieractive: '', dar: 0, dos: 0, unite: '' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const totalItems = traits.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTraits = traits.slice(startIndex, endIndex);

    const pageNumbers = useMemo(() => {
        const pages = [];
        const maxVisible = 5; // Max page buttons to display

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show page 1
            pages.push(1);

            // Calculate start and end for middle block centered on currentPage
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust if we are close to boundaries
            if (currentPage <= 3) {
                end = 4;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            // Add left ellipsis before middle block if needed
            if (start > 2) {
                pages.push('...');
            }

            // Add middle block page numbers
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // Add right ellipsis after middle block if needed
            if (end < totalPages - 1) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }
        return pages;
    }, [currentPage, totalPages]);

    // Bounds safety check
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [traits, totalPages, currentPage]);

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

    const handleShowForm = (trait = null) => {
        setError(null); // Clear previous errors when opening form
        setEditingTrait(trait);
        if (trait) {
            setFormData({
                nomcom: trait.nomcom || '',
                matieractive: trait.matieractive || '',
                dar: trait.dar || 0,
                dos: trait.dos || 0,
                unite: trait.unite || ''
            });
        } else {
            setFormData({ nomcom: '', matieractive: '', dar: 0, dos: 0, unite: '' });
        }
        setShowForm(true);
    };

    const handleHideForm = () => {
        setShowForm(false);
        setEditingTrait(null);
        setFormData({ nomcom: '', matieractive: '', dar: 0, dos: 0, unite: '' });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveTrait = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous errors
        try {
            if (editingTrait) {
                await apiPut(`/api/trait/${editingTrait.ref}`, formData);
            } else {
                await apiPost('/api/trait', formData);
            }
            handleHideForm();
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
                <button className="add-btn" onClick={() => handleShowForm()}>+ Add New Product</button>
            </div>
            
            {/* --- ERROR DISPLAY --- */}
            {/* This will now show any error messages from the backend or frontend. */}
            {error && <p className="error-message">{error}</p>}

            {/* Inline Form */}
            {showForm && (
                <div className="form-container">
                    <h3>{editingTrait ? 'Edit Product' : 'Add New Product'}</h3>
                    <form onSubmit={handleSaveTrait} className="ecart-form">
                        <div className="form-row">
                            <div className="input-group">
                                <label>Commercial Name</label>
                                <input
                                    type="text"
                                    name="nomcom"
                                    value={formData.nomcom}
                                    onChange={handleFormChange}
                                    required
                                    placeholder="Enter commercial name"
                                />
                            </div>
                            <div className="input-group">
                                <label>Active Ingredient</label>
                                <input
                                    type="text"
                                    name="matieractive"
                                    value={formData.matieractive}
                                    onChange={handleFormChange}
                                    required
                                    placeholder="Enter active ingredient"
                                />
                            </div>
                            <div className="input-group">
                                <label>DAR (Days)</label>
                                <input
                                    type="number"
                                    name="dar"
                                    value={formData.dar}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Dosage</label>
                                <input
                                    type="number"
                                    name="dos"
                                    value={formData.dos}
                                    onChange={handleFormChange}
                                    placeholder="Enter dosage"
                                />
                            </div>
                            <div className="input-group">
                                <label>Unit</label>
                                <input
                                    type="text"
                                    name="unite"
                                    value={formData.unite}
                                    onChange={handleFormChange}
                                    placeholder="Enter unit"
                                />
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
                            <th>Commercial Name</th>
                            <th>Active Ingredient</th>
                            <th>DAR (Days)</th>
                            <th>Dosage</th>
                            <th>Unit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTraits.map(trait => (
                            <tr key={trait.ref}>
                                <td>{trait.nomcom}</td>
                                <td>{trait.matieractive}</td>
                                <td>{trait.dar}</td>
                                <td>{trait.dos}</td>
                                <td>{trait.unite}</td>
                                <td className="action-buttons">
                                    <button className="edit-btn" onClick={() => handleShowForm(trait)}>Edit</button>
                                    <button className="delete-btn" onClick={() => handleDeleteTrait(trait.ref)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination-container">
                    <div className="pagination-info">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                    </div>
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                            disabled={currentPage === 1}
                            className="pagination-nav"
                            aria-label="Previous page"
                        >
                            <span className="nav-arrow">‹</span> Previous
                        </button>
                        <div className="pagination-numbers">
                            {pageNumbers.map((pageNum, index) => (
                                pageNum === '...' ? (
                                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                                ) : (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={currentPage === pageNum ? 'pagination-number active' : 'pagination-number'}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                            disabled={currentPage === totalPages}
                            className="pagination-nav"
                            aria-label="Next page"
                        >
                            Next <span className="nav-arrow">›</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TraitPage;

