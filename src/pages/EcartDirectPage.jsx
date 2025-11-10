import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select from 'react-select';
import { apiGet, apiPost, apiPut, apiDelete } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import useDebounce from '../hooks/useDebounce';
import { generateEcartDirectGroupedPDF, generateEcartDirectDetailsPDF } from '../utils/pdfGenerator';
import './EcartDirectPage.css';

const EcartDirectPage = () => {
    const [ecartDirects, setEcartDirects] = useState([]);
    const [vergers, setVergers] = useState([]);
    const [varietes, setVarietes] = useState([]);
    const [typeEcarts, setTypeEcarts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ numbl: '', dtepal: '', refver: '', codvar: '', pdsfru: '', codtype: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Filters state
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        selectedVerger: null,
        selectedVariete: null,
        selectedTypeEcart: null,
    });

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [ecartData, vergerData, varieteData, typeEcartData] = await Promise.all([
                apiGet('/api/ecartdirect'),
                apiGet('/api/lookup/vergers'),
                apiGet('/api/lookup/varietes'),
                apiGet('/api/lookup/typeecarts')
            ]);
            setEcartDirects(ecartData);
            setVergers(vergerData);
            setVarietes(varieteData);
            setTypeEcarts(typeEcartData);
        } catch (err) {
            setError('Failed to fetch data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch campagne dates for initial filter values
    useEffect(() => {
        const fetchCampagneDates = async () => {
            try {
                const campagneDates = await apiGet('/api/lookup/campagne-dates');
                setFilters(prev => ({
                    ...prev,
                    startDate: campagneDates.startDate ? new Date(campagneDates.startDate).toISOString().split('T')[0] : '',
                    endDate: campagneDates.endDate ? new Date(campagneDates.endDate).toISOString().split('T')[0] : '',
                }));
            } catch (err) {
                console.error('Failed to fetch campagne dates:', err);
            }
        };
        fetchCampagneDates();
    }, []);

    const handleShowForm = (item = null) => {
        setError(null);
        setEditingItem(item);
        if (item) {
            setFormData({
                numbl: item.numbl || '',
                dtepal: item.dtepal ? new Date(item.dtepal).toISOString().split('T')[0] : '',
                refver: item.refver || '',
                codvar: item.codvar || '',
                pdsfru: item.pdsfru || '',
                codtype: item.codtype || ''
            });
        } else {
            setFormData({ numbl: '', dtepal: '', refver: '', codvar: '', pdsfru: '', codtype: '' });
        }
        setShowForm(true);
    };

    const handleHideForm = () => {
        setShowForm(false);
        setEditingItem(null);
        setFormData({ numbl: '', dtepal: '', refver: '', codvar: '', pdsfru: '', codtype: '' });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (editingItem) {
                await apiPut(`/api/ecartdirect/${editingItem.numpal}`, formData);
            } else {
                await apiPost('/api/ecartdirect', formData);
            }
            handleHideForm();
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            setError(null);
            try {
                await apiDelete(`/api/ecartdirect/${id}`);
                fetchData();
            } catch (err) {
                setError(err.message);
            }
        }
    };

    // Filter handler
    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1); // Reset to first page when filtering
    };

    // Debounced filters for performance
    const debouncedFilters = useDebounce(filters, 500);

    // Filtered and sorted data
    const filteredAndSortedEcartDirects = useMemo(() => {
        let filtered = [...ecartDirects];

        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(item => {
                const verger = vergers.find(v => v.refver === item.refver);
                const variete = varietes.find(v => v.codvar === item.codvar);
                const typeEcart = typeEcarts.find(t => t.codtype === item.codtype);
                return (
                    item.numpal?.toString().includes(searchTerm.toLowerCase()) ||
                    verger?.nomver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    variete?.nomvar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.dtepal?.includes(searchTerm) ||
                    item.numbl?.toString().includes(searchTerm.toLowerCase()) ||
                    item.pdsfru?.toString().includes(searchTerm.toLowerCase()) ||
                    typeEcart?.destype?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        // Apply filters
        if (debouncedFilters.startDate) {
            const startDate = new Date(debouncedFilters.startDate);
            filtered = filtered.filter(item =>
                item.dtepal && new Date(item.dtepal) >= startDate
            );
        }

        if (debouncedFilters.endDate) {
            const endDate = new Date(debouncedFilters.endDate);
            endDate.setHours(23, 59, 59, 999); // End of day
            filtered = filtered.filter(item =>
                item.dtepal && new Date(item.dtepal) <= endDate
            );
        }

        if (debouncedFilters.selectedVerger) {
            filtered = filtered.filter(item =>
                item.refver === debouncedFilters.selectedVerger.value
            );
        }

        if (debouncedFilters.selectedVariete) {
            filtered = filtered.filter(item =>
                item.codvar === debouncedFilters.selectedVariete.value
            );
        }

        if (debouncedFilters.selectedTypeEcart) {
            filtered = filtered.filter(item =>
                item.codtype === debouncedFilters.selectedTypeEcart.value
            );
        }

        // Sort by numpal descending
        return filtered.sort((a, b) => b.numpal - a.numpal);
    }, [ecartDirects, debouncedFilters, searchTerm, vergers, varietes, typeEcarts]);

    // Calculate pagination using filtered data
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredAndSortedEcartDirects.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredAndSortedEcartDirects.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // PDF export handlers
    const handleExportGroupedPDF = () => {
        console.log('Exporting grouped PDF with data:', filteredAndSortedEcartDirects);

        if (!filteredAndSortedEcartDirects?.length) {
            alert('Aucune donnée disponible pour la génération du PDF groupé. Veuillez ajuster les filtres.');
            return;
        }

        try {
            generateEcartDirectGroupedPDF(
                filteredAndSortedEcartDirects,
                vergers,
                varietes,
                typeEcarts,
                filters
            );
            console.log('Grouped PDF generation completed');
        } catch (error) {
            console.error('Error generating grouped PDF:', error);
            alert('Erreur lors de la génération du PDF groupé: ' + error.message);
        }
    };

    const handleExportDetailsPDF = () => {
        console.log('Exporting details PDF with data:', filteredAndSortedEcartDirects);

        if (!filteredAndSortedEcartDirects?.length) {
            alert('Aucune donnée disponible pour la génération du PDF détaillé. Veuillez ajuster les filtres.');
            return;
        }

        try {
            generateEcartDirectDetailsPDF(
                filteredAndSortedEcartDirects,
                vergers,
                varietes,
                typeEcarts,
                filters
            );
            console.log('Details PDF generation completed');
        } catch (error) {
            console.error('Error generating details PDF:', error);
            alert('Erreur lors de la génération du PDF détaillé: ' + error.message);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    // Prepare select options
    const vergerOptions = vergers.map(v => ({ value: v.refver, label: `${v.refver} - ${v.nomver}` }));
    const varieteOptions = varietes.map(v => ({ value: v.codvar, label: v.nomvar }));
    const typeEcartOptions = typeEcarts.map(t => ({ value: t.codtype, label: t.destype }));

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Manage Ecart Direct</h1>
                <button className="add-btn" onClick={() => handleShowForm()}>+ Add New Ecart</button>
            </div>

            {/* Error display */}
            {error && <p className="error-message">{error}</p>}

            {/* Inline Form */}
            {showForm && (
                <div className="form-container">
                    <h3>{editingItem ? 'Edit Ecart Direct' : 'Add New Ecart Direct'}</h3>
                    <form onSubmit={handleSaveForm} className="ecart-form">
                        <div className="form-row">
                            <div className="input-group">
                                <label>Numéro BL</label>
                                <input
                                    type="number"
                                    name="numbl"
                                    value={formData.numbl}
                                    onChange={handleFormChange}
                                    required
                                    placeholder="Enter BL number"
                                />
                            </div>
                            <div className="input-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    name="dtepal"
                                    value={formData.dtepal}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Verger</label>
                                <select
                                    name="refver"
                                    value={formData.refver}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="">Select Verger</option>
                                    {vergers.map(verger => (
                                        <option key={verger.refver} value={verger.refver}>
                                            {verger.nomver || 'N/A'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Variété</label>
                                <select
                                    name="codvar"
                                    value={formData.codvar}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="">Select Variété</option>
                                    {varietes.map(variete => (
                                        <option key={variete.codvar} value={variete.codvar}>
                                            {variete.nomvar || 'N/A'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Poids Fruit</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="pdsfru"
                                    value={formData.pdsfru}
                                    onChange={handleFormChange}
                                    placeholder="Enter weight"
                                />
                            </div>
                            <div className="input-group">
                                <label>Type Ecart</label>
                                <select
                                    name="codtype"
                                    value={formData.codtype}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="">Select Type Ecart</option>
                                    {typeEcarts.map(typeEcart => (
                                        <option key={typeEcart.codtype} value={typeEcart.codtype}>
                                            {typeEcart.destype || 'N/A'}
                                        </option>
                                    ))}
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

           

            {/* Filters Section */}
            <div className="dashboard-filters" style={{
                marginBottom: '2rem'
            }}>
                <div className="filter-item">
                    <label>Date de Début</label>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={e => handleFilterChange('startDate', e.target.value)}
                    />
                </div>
                <div className="filter-item">
                    <label>Date de Fin</label>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={e => handleFilterChange('endDate', e.target.value)}
                    />
                </div>
                <div className="filter-item">
                    <label>Verger</label>
                    <Select
                        options={vergerOptions}
                        value={filters.selectedVerger}
                        onChange={value => handleFilterChange('selectedVerger', value)}
                        isClearable
                        placeholder="Tous les Vergers"
                    />
                </div>
                <div className="filter-item">
                    <label>Variété</label>
                    <Select
                        options={varieteOptions}
                        value={filters.selectedVariete}
                        onChange={value => handleFilterChange('selectedVariete', value)}
                        isClearable
                        placeholder="Toutes les Variétés"
                    />
                </div>
                <div className="filter-item">
                    <label>Type d'Écart</label>
                    <Select
                        options={typeEcartOptions}
                        value={filters.selectedTypeEcart}
                        onChange={value => handleFilterChange('selectedTypeEcart', value)}
                        isClearable
                        placeholder="Tous les Types"
                    />
                </div>
            </div>

            {/* PDF Export Buttons */}
            <div style={{
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
            }}>
                <button
                    onClick={handleExportGroupedPDF}
                    className="btn btn-secondary"
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                    }}
                    title="Exporter le rapport groupé en PDF (par verger, variété, type d'écart)"
                >
                    📊 Rapport Groupé
                </button>
                <button
                    onClick={handleExportDetailsPDF}
                    className="btn btn-secondary"
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                    }}
                    title="Exporter le rapport détaillé en PDF (tous les détails du tableau)"
                >
                    📋 Rapport Détails
                </button>
            </div>
     {/* Search Input */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Type a keyword..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                    }}
                    className="search-input"
                />
            </div>
            <div className="table-container">
            
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Numéro Palette</th>
                            <th>Verger</th>
                            <th>Variete</th>
                            <th>Date</th>
                            <th>Numéro BL</th>
                            <th>Poids Fruit</th>
                            <th>Type Ecart</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map(item => {
                            const verger = vergers.find(v => v.refver === item.refver);
                            const variete = varietes.find(v => v.codvar === item.codvar);
                            return (
                                <tr key={item.numpal}>
                                    <td>{item.numpal}</td>
                                    <td>{verger?.nomver || 'N/A'}</td>
                                    <td>{variete?.nomvar || 'N/A'}</td>
                                    <td>{item.dtepal ? new Date(item.dtepal).toLocaleDateString() : ''}</td>
                                    <td>{item.numbl}</td>
                                    <td>{item.pdsfru}</td>
                                    <td>{item.typeEcart?.destype || 'N/A'}</td>
                                    <td className="action-buttons">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => handleShowForm(item)}
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => handleDelete(item.numpal)}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-container">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                >
                    Previous
                </button>
                <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default EcartDirectPage;
