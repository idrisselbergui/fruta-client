import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { apiGet } from '../apiService';
import { getUnsoldEcartDirect, getUnsoldEcartE, createVenteEcart } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './VenteEcartPage.css';

const VenteEcartPage = () => {
    const [ecartDirects, setEcartDirects] = useState([]);
    const [ecartEs, setEcartEs] = useState([]);
    const [vergers, setVergers] = useState([]);
    const [varietes, setVarietes] = useState([]);
    const [typeEcarts, setTypeEcarts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTypeEcart, setSelectedTypeEcart] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [formData, setFormData] = useState({
        numbonvente: '',
        date: new Date().toISOString().split('T')[0],
        price: '',
        poidsTotal: '',
        montantTotal: ''
    });                                                                 

    const [selectedEcarts, setSelectedEcarts] = useState([]); // [{table: 'ecart_direct'|'ecart_e', id, pdsvent}]

    // Fetch typeecarts and vergers/varietes for display
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [typeEcartData, vergerData, varieteData] = await Promise.all([
                    apiGet('/api/lookup/typeecarts'),
                    apiGet('/api/lookup/vergers'),
                    apiGet('/api/lookup/varietes')
                ]);
                setTypeEcarts(typeEcartData);
                setVergers(vergerData);
                setVarietes(varieteData);
            } catch (err) {
                setError('Failed to fetch lookup data.');
            }
        };
        fetchLookups();
    }, []);

    // Fetch ecarts when typeecart is selected
    const fetchEcarts = async () => {
        if (!selectedTypeEcart) return;
        try {
            setIsLoading(true);
            setError(null);
            const [directData, eData] = await Promise.all([
                getUnsoldEcartDirect(selectedTypeEcart.value, startDate || null, endDate || null),
                getUnsoldEcartE(selectedTypeEcart.value, startDate || null, endDate || null)
            ]);
            setEcartDirects(directData);
            setEcartEs(eData);
        } catch (err) {
            setError('Failed to fetch ecarts.');
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch when filters change
    useEffect(() => {
        fetchEcarts();
    }, [selectedTypeEcart, startDate, endDate]);

    // Calculate poidsTotal and montantTotal from selected ecarts
    const calculatedPoidsTotal = useMemo(() => {
        return selectedEcarts.reduce((sum, ecart) => sum + (parseFloat(ecart.pdsvent) || 0), 0);
    }, [selectedEcarts]);

    const calculatedMontantTotal = useMemo(() => {
        if (!formData.price || !calculatedPoidsTotal) return '';
        return parseFloat(formData.price) * calculatedPoidsTotal;
    }, [formData.price, calculatedPoidsTotal]);

    // Update form data with calculated values
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            poidsTotal: calculatedPoidsTotal.toFixed(2),
            montantTotal: calculatedMontantTotal ? calculatedMontantTotal.toFixed(2) : ''
        }));
    }, [calculatedPoidsTotal, calculatedMontantTotal]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEcartSelect = (table, id, checked, defaultPoids) => {
        if (checked) {
            setSelectedEcarts(prev => [...prev, { table, id, pdsvent: defaultPoids ? defaultPoids.toString() : '' }]);
        } else {
            setSelectedEcarts(prev => prev.filter(ec => ec.table !== table || ec.id !== id));
        }
    };

    const handlePdsventChange = (table, id, value) => {
        setSelectedEcarts(prev =>
            prev.map(ec =>
                ec.table === table && ec.id === id
                    ? { ...ec, pdsvent: value }
                    : ec
            )
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);
        if (!formData.date || !formData.price || selectedEcarts.length === 0) {
            setError('Please fill required fields and select at least one ecart.');
            return;
        }
        try {
            const requestData = {
                numbonvente: formData.numbonvente ? parseInt(formData.numbonvente) : null,
                date: new Date(formData.date),
                price: parseFloat(formData.price),
                poidsTotal: parseFloat(formData.poidsTotal),
                montantTotal: parseFloat(formData.montantTotal),
                selectedEcarts: selectedEcarts
            };
            await createVenteEcart(requestData);
            alert('Vente created successfully!');
            // Reset form
            setFormData({
                numbonvente: '',
                date: new Date().toISOString().split('T')[0],
                price: '',
                poidsTotal: '',
                montantTotal: ''
            });
            setSelectedEcarts([]);
            setSelectedTypeEcart(null);
            setEcartDirects([]);
            setEcartEs([]);
        } catch (err) {
            setError(err.message);
        }
    };

    const typeEcartOptions = typeEcarts.map(t => ({ value: t.codtype, label: t.destype }));

    const getDisplayName = (verRef, verList, varCod, varList) => {
        const verger = verList.find(v => v.refver === verRef);
        const variete = varList.find(v => v.codvar === varCod);
        return { verger: verger?.nomver || 'N/A', variete: variete?.nomvar || 'N/A' };
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Sell Ecart</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            {/* Form Section */}
            <div className="form-container">
                <h3>Vente Details</h3>
                <form onSubmit={handleSave} className="ecart-form">
                    <div className="form-row">
                        <div className="input-group">
                            <label>N° Bon Vente</label>
                            <input
                                type="number"
                                name="numbonvente"
                                value={formData.numbonvente}
                                onChange={handleFormChange}
                                placeholder=""
                            />
                        </div>
                        <div className="input-group">
                            <label>Date</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleFormChange}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Price (€/kg)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="price"
                                value={formData.price}
                                onChange={handleFormChange}
                                required
                                placeholder="Enter price"
                            />
                        </div>
                        <div className="input-group">
                            <label>Poids Total (kg)</label>
                            <input
                                type="text"
                                name="poidsTotal"
                                value={formData.poidsTotal}
                                readOnly
                            />
                        </div>
                        <div className="input-group">
                            <label>Montant Total (€)</label>
                            <input
                                type="text"
                                name="montantTotal"
                                value={formData.montantTotal}
                                readOnly
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="save-btn">Save Vente</button>
                    </div>
                </form>
            </div>

            {/* Filter */}
            <div className="filter-section">
                <div className="filter-item">
                    <label>Type Ecart</label>
                    <Select
                        options={typeEcartOptions}
                        value={selectedTypeEcart}
                        onChange={setSelectedTypeEcart}
                        isClearable
                        placeholder="Select Type Ecart to load items"
                    />
                </div>
                <div className="filter-item">
                    <label>Date From</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="filter-item">
                    <label>Date To</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {selectedTypeEcart && (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Ecart Direct List */}
                    <div className="table-section" style={{ flex: 1, minWidth: '300px' }}>
                        <h3>Ecart Direct</h3>
                        <table className="data-table" style={{ fontSize: '0.9em' }}>
                            <thead>
                                <tr>
                                    <th>Select</th>
                                    <th>Num Pal</th>
                                    <th>Verger</th>
                                    <th>Variété</th>
                                    <th>Poids (kg)</th>
                                    <th>Poids Vente (kg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ecartDirects.map(item => {
                                    const { verger, variete } = getDisplayName(item.refver, vergers, item.codvar, varietes);
                                    const selected = selectedEcarts.find(se => se.table === 'ecart_direct' && se.id === item.numpal);
                                    return (
                                        <tr key={item.numpal}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={!!selected}
                                                    onChange={(e) => handleEcartSelect('ecart_direct', item.numpal, e.target.checked, item.pdsfru)}
                                                />
                                            </td>
                                            <td>{item.numpal}</td>
                                            <td>{verger}</td>
                                            <td>{variete}</td>
                                            <td>{item.pdsfru?.toFixed(2)} {item.pdsfru ? 'kg' : ''}</td>
                                            <td>
                                                {selected && (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={selected.pdsvent}
                                                        onChange={(e) => handlePdsventChange('ecart_direct', item.numpal, e.target.value)}
                                                        placeholder="Poids Vente"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Ecart E List */}
                    <div className="table-section" style={{ flex: 1, minWidth: '300px' }}>
                        <h3>Ecart Station</h3>
                        <table className="data-table" style={{ fontSize: '0.9em' }}>
                            <thead>
                                <tr>
                                    <th>Select</th>
                                    <th>Num Pal</th>
                                    <th>Verger</th>
                                    <th>Variété</th>
                                    <th>Poids (kg)</th>
                                    <th>Poids Vente (kg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ecartEs.map(item => {
                                    const { verger, variete } = getDisplayName(item.refver, vergers, item.codvar, varietes);
                                    const selected = selectedEcarts.find(se => se.table === 'ecart_e' && se.id === item.numpal);
                                    return (
                                        <tr key={item.numpal}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={!!selected}
                                                    onChange={(e) => handleEcartSelect('ecart_e', item.numpal, e.target.checked, item.pdsfru)}
                                                />
                                            </td>
                                            <td>{item.numpal}</td>
                                            <td>{verger}</td>
                                            <td>{variete}</td>
                                            <td>{item.pdsfru?.toFixed(2)} {item.pdsfru ? 'kg' : ''}</td>
                                            <td>
                                                {selected && (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={selected.pdsvent}
                                                        onChange={(e) => handlePdsventChange('ecart_e', item.numpal, e.target.value)}
                                                        placeholder="Poids Vente"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VenteEcartPage;
