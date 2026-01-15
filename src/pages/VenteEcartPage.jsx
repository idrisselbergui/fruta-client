import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiGet, apiPost, apiPut, apiDelete } from '../apiService';
import { generateVenteEcartPDF } from '../utils/pdfGenerator';
import LoadingSpinner from '../components/LoadingSpinner';
import './VenteEcartPage.css';

const VenteEcartPage = () => {
    const [typeEcarts, setTypeEcarts] = useState([]); // Add TypeEcarts state
    const [vergers, setVergers] = useState([]);
    const [grpvars, setGrpvars] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        typeEcart: null, // Add typeEcart to formData
        numbonvente: '',
        date: new Date().toISOString().split('T')[0],
        price: '',
        poidsTotal: '',
        montantTotal: '',
        numlot: null
    });

    // Manual details list: [{ refver, codgrv, pds, uniqueId }]
    const [details, setDetails] = useState([]);
    // New detail entry state
    const [newDetail, setNewDetail] = useState({
        refver: null,
        codgrv: null,
        pds: ''
    });
    const [isPrinting, setIsPrinting] = useState(false);

    const [ventes, setVentes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isEditing, setIsEditing] = useState(false);
    const [editingVenteId, setEditingVenteId] = useState(null);
    const [isViewing, setIsViewing] = useState(false);
    const [viewingVenteId, setViewingVenteId] = useState(null);
    const [searchVentes, setSearchVentes] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Fetch lookups
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [typeData, vergerData, grpvarData, ventesData] = await Promise.all([
                    apiGet('/api/lookup/typeecarts'), // Fetch type ecarts
                    apiGet('/api/lookup/vergers'),
                    apiGet('/api/lookup/grpvars'),
                    apiGet('/api/vente-ecart')
                ]);
                setTypeEcarts(typeData);
                setVergers(vergerData);
                setGrpvars(grpvarData);
                setVentes(ventesData.sort((a, b) => b.id - a.id));
            } catch (err) {
                setError('Failed to fetch lookup data.');
            }
        };
        fetchLookups();
    }, []);

    const filteredVentes = useMemo(() => {
        if (!searchVentes.trim()) return ventes;
        const searchTerm = searchVentes.toLowerCase();
        return ventes.filter(vente => (
            vente.id?.toString().toLowerCase().includes(searchTerm) ||
            (vente.numbonvente || '').toString().toLowerCase().includes(searchTerm) ||
            (vente.numlot || '').toString().toLowerCase().includes(searchTerm) ||
            new Date(vente.date).toLocaleDateString().toLowerCase().includes(searchTerm) ||
            vente.price?.toString().toLowerCase().includes(searchTerm) ||
            vente.poidsTotal?.toString().toLowerCase().includes(searchTerm) ||
            vente.montantTotal?.toString().toLowerCase().includes(searchTerm)
        ));
    }, [ventes, searchVentes]);

    // Calculate poidsTotal and montantTotal from details
    const calculatedPoidsTotal = useMemo(() => {
        return details.reduce((sum, item) => sum + (parseFloat(item.pds) || 0), 0);
    }, [details]);

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

    const handleAddDetail = () => {
        if (!newDetail.refver || !newDetail.codgrv || !newDetail.pds) {
            alert('Veuillez remplir Verger, Variété (Groupe) et Poids.');
            return;
        }

        // Check for duplicates
        const exists = details.some(d =>
            d.refver.value === newDetail.refver.value &&
            d.codgrv.value === newDetail.codgrv.value
        );

        if (exists) {
            alert('Ce Verger et cette Variété ont déjà été ajoutés.');
            return;
        }

        const detail = {
            ...newDetail,
            uniqueId: Date.now() // Simple unique ID for list rendering
        };
        setDetails(prev => [...prev, detail]);
        setNewDetail({ refver: null, codgrv: null, pds: '' }); // Reset input
    };

    const handleRemoveDetail = (uniqueId) => {
        setDetails(prev => prev.filter(d => d.uniqueId !== uniqueId));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);
        if (!formData.date || !formData.price || details.length === 0) {
            setError('Veuillez remplir les champs requis et ajouter au moins un détail.');
            return;
        }
        try {
            const requestData = {
                Numbonvente: formData.numbonvente ? parseInt(formData.numbonvente) : null,
                Date: new Date(formData.date),
                Price: parseFloat(formData.price), // Added Price
                PoidsTotal: parseFloat(formData.poidsTotal),
                MontantTotal: parseFloat(formData.montantTotal),
                Numlot: formData.numlot ? parseInt(formData.numlot) : null,
                Codtype: formData.typeEcart ? formData.typeEcart.value : null, // Send Codtype
                Details: details.map(d => ({
                    Refver: d.refver.value, // Ensure this is int
                    Codgrv: d.codgrv.value, // Ensure this is int
                    Pds: parseFloat(d.pds)
                }))
            };
            if (isEditing && editingVenteId) {
                await apiPut(`/api/vente-ecart/${editingVenteId}`, requestData);
                alert('Vente modifiée avec succès!');
            } else {
                await apiPost('/api/vente-ecart', requestData);
                alert('Vente créée avec succès!');
            }
            const updatedVentes = await apiGet('/api/vente-ecart');
            setVentes(updatedVentes.sort((a, b) => b.id - a.id));
            setCurrentPage(1);

            // Reset
            setIsEditing(false);
            setEditingVenteId(null);
            setFormData({
                typeEcart: null,
                numbonvente: '',
                date: new Date().toISOString().split('T')[0],
                price: '',
                poidsTotal: '',
                montantTotal: '',
                numlot: null
            });
            setDetails([]);
            setNewDetail({ refver: null, codgrv: null, pds: '' });
        } catch (err) {
            setError(err.message);
        }
    };

    const vergerOptions = vergers.map(v => ({ value: v.refver, label: v.nomver }));
    const grpvarOptions = grpvars.map(v => ({ value: v.codgrv, label: v.nomgrv })); // Changed from varietes

    const getDisplayName = (verRef, verList, grpCod, grpList) => {
        const verger = verList.find(v => v.refver === verRef);
        const grpvar = grpList.find(v => v.codgrv === grpCod);
        return { verger: verger?.nomver || 'N/A', variete: grpvar?.nomgrv || 'N/A' }; // keeping 'variete' key for compatibility or rename it
    };

    const handleDeleteVente = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
            try {
                await apiDelete(`/api/vente-ecart/${id}`);
                // Refresh list
                const refreshedVentes = await apiGet('/api/vente-ecart');
                setVentes(refreshedVentes.sort((a, b) => b.id - a.id));

                // If the deleted vente was being edited or viewed, reset form
                if (editingVenteId === id || viewingVenteId === id) {
                    setShowForm(false);
                    setIsEditing(false);
                    setEditingVenteId(null);
                    setIsViewing(false);
                    setViewingVenteId(null);
                    setFormData({
                        typeEcart: null,
                        numbonvente: '',
                        date: new Date().toISOString().split('T')[0],
                        price: '',
                        poidsTotal: '',
                        montantTotal: '',
                        numlot: null
                    });
                    setDetails([]);
                }
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handlePrintVente = async (venteId) => {
        try {
            setIsPrinting(true);
            const data = await apiGet(`/api/vente-ecart/${venteId}`);
            const { vente, details: fetchedDetails } = data;

            // Map details for the PDF generator using the same lookups
            const mappedDetails = fetchedDetails.map(d => ({
                refver: { label: vergers.find(v => v.refver === d.refver)?.nomver || 'N/A' },
                codgrv: { label: grpvars.find(v => v.codgrv === d.codgrv)?.nomgrv || 'N/A' },
                pds: d.pds
            }));

            generateVenteEcartPDF(vente, mappedDetails, vergers, grpvars, typeEcarts);
        } catch (err) {
            console.error("Error printing PDF:", err);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleEditVente = async (venteId) => {
        try {
            const data = await apiGet(`/api/vente-ecart/${venteId}`);
            const { vente, details: fetchedDetails } = data;

            setFormData({
                numbonvente: vente.numbonvente || '',
                date: new Date(vente.date).toISOString().split('T')[0],
                price: vente.price,
                poidsTotal: vente.poidsTotal || '0',
                montantTotal: vente.montantTotal || '0',
                numlot: vente.numlot || null,
                typeEcart: vente.codtype ? { value: vente.codtype, label: typeEcarts.find(t => t.codtype === vente.codtype)?.destype || 'Inconnu' } : null
            });
            setIsEditing(true);
            setEditingVenteId(venteId);
            setIsViewing(false);
            setShowForm(true);

            if (fetchedDetails && Array.isArray(fetchedDetails)) {
                // Map fetched details which have raw IDs to the {value, label} structure we use for Select
                const mappedDetails = fetchedDetails.map(d => ({
                    uniqueId: d.id, // Use DB id as uniqueId
                    refver: { value: d.refver, label: vergers.find(v => v.refver === d.refver)?.nomver || 'N/A' },
                    codgrv: { value: d.codgrv, label: grpvars.find(v => v.codgrv === d.codgrv)?.nomgrv || 'N/A' }, // Changed to codgrv
                    pds: d.pds
                }));
                setDetails(mappedDetails);
            } else {
                setDetails([]);
            }

        } catch (err) {
            setError(err.message);
        }
    };

    const generateBonDeLivraison = async (venteId) => {
        if (!venteId) return;

        try {
            const data = await getVente(venteId);
            const { vente, details } = data;

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add logo
            try {
                const pageWidth = doc.internal.pageSize.getWidth();
                doc.addImage('/diaf.png', 'PNG', pageWidth - 35, 10, 25, 25);
            } catch (error) {
                console.log('Logo not found, continuing without logo');
            }

            // Header
            doc.setFontSize(20);
            doc.text('BON DE VENTE', 105, 20, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`${new Date().toLocaleDateString('fr-FR')}`, 170, 40);

            // Vente details
            doc.setFontSize(10);

            let y = 60;
            doc.text(`N° Bon: ${vente.numbonvente || 'N/A'}`, 20, y);
            doc.text(`N° Lot: ${vente.numlot || 'N/A'}`, 75, y);
            doc.text(`Date de Vente: ${new Date(vente.date).toLocaleDateString('fr-FR')}`, 130, y);
            y += 10;
            doc.text(`Prix : ${parseFloat(vente.price).toLocaleString('fr-MA')} DH`, 20, y);
            doc.text(`Poids Total: ${parseFloat(vente.poidsTotal).toFixed(2).toLocaleString('fr-MA')} kg`, 75, y);
            doc.text(`Montant Total: ${parseFloat(vente.montantTotal).toFixed(2).toLocaleString('fr-MA')} DH`, 130, y);
            y += 20;

            // Ecarts table
            const tableData = [];
            const headerRow = ['Verger', 'Variété', 'Poids Vendu (kg)'];
            tableData.push(headerRow);

            const itemsToPrint = details || [];

            if (itemsToPrint.length > 0) {
                itemsToPrint.forEach(item => {
                    const { verger, variete } = getDisplayName(item.refver, vergers, item.codgrv, grpvars); // Use codgrv/grpvars
                    tableData.push([
                        verger,
                        variete,
                        parseFloat(item.pds).toFixed(2)
                    ]);
                });
            } else {
                tableData.push(['Aucun détail', '', '']);
            }

            // Generate the table
            autoTable(doc, {
                startY: y,
                head: [headerRow],
                body: tableData.slice(1),
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [66, 139, 202],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    2: { halign: 'right' }
                },
                margin: { left: 20, right: 20 },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            // Footer
            const footerY = doc.internal.pageSize.height - 20;
            doc.setFontSize(10);
            doc.text('Signature du Vendeur:', 20, footerY);
            doc.text('Signature de l\'Acheteur:', 100, footerY);

            // Save the PDF
            const fileName = `bon-livraison-vente-${vente.numbonvente || venteId}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            alert('Bon de livraison généré avec succès!');
        } catch (error) {
            console.error('Erreur génération bon livraison:', error);
            alert('Erreur lors de génération du bon de livraison.');
        }
    };

    // Pagination logic
    const totalItems = filteredVentes.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentVentes = filteredVentes.slice(startIndex, endIndex);

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Show pages around current
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust window if near start
            if (currentPage <= 3) {
                end = Math.min(totalPages - 1, 4);
            }
            // Adjust window if near end
            if (currentPage >= totalPages - 2) {
                start = Math.max(2, totalPages - 3);
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }
        return pages;
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Vente Écart</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            {/* Create Section - Outer Container like Daily Checks */}
            <div className="create-section-outer">
                <div className="form-container">
                    <h2>{isEditing ? 'Modifier la Vente Écart' : 'Enregistrer une Vente Écart'}</h2>
                    <p style={{ marginBottom: '1.5rem', color: '#6c757d', fontSize: '0.95rem' }}>Créez ou modifiez une vente d'écart.</p>

                    {!showForm ? (
                        <button type="button" className="ve-create-btn" onClick={() => setShowForm(true)}>
                            + Créer une Vente Écart
                        </button>
                    ) : (
                        <div className="daily-check-form">
                            <div className="form-section">
                                <form onSubmit={handleSave} className="ecart-form">
                                    <div className="form-row" style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'flex-end',
                                        gap: '1.5rem',
                                        marginBottom: '1.5rem'
                                    }}>
                                        <div className="input-group" style={{ flex: '2 1 200px' }}>
                                            <label>Type d'Écart</label>
                                            <Select
                                                options={typeEcarts.map(t => ({ value: t.codtype, label: t.destype }))}
                                                value={formData.typeEcart}
                                                onChange={(val) => setFormData(prev => ({ ...prev, typeEcart: val }))}
                                                placeholder="Type"
                                                styles={{
                                                    control: (base) => ({
                                                        ...base,
                                                        minHeight: '48px',
                                                        height: '48px',
                                                        fontSize: '1rem',
                                                        borderRadius: '8px',
                                                        borderColor: '#e0e6ed',
                                                        backgroundColor: '#f8f9fa',
                                                        boxShadow: 'none',
                                                        '&:hover': { borderColor: '#adb5bd' }
                                                    }),
                                                    valueContainer: (base) => ({ ...base, height: '48px', padding: '0 8px' }),
                                                    input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                                    singleValue: (base) => ({ ...base, margin: 0, top: '50%', transform: 'translateY(-50%)' }),
                                                    placeholder: (base) => ({ ...base, margin: 0, top: '50%', transform: 'translateY(-50%)' }),
                                                    dropdownIndicator: (base) => ({ ...base, padding: '8px' }),
                                                    indicatorsContainer: (base) => ({ ...base, height: '48px' }),
                                                    menu: (base) => ({ ...base, zIndex: 100 })
                                                }}
                                            />
                                        </div>
                                        <div className="input-group" style={{ flex: '1 1 120px' }}>
                                            <label>N° Bon Vente</label>
                                            <input
                                                type="number"
                                                name="numbonvente"
                                                value={formData.numbonvente}
                                                onChange={handleFormChange}
                                            />
                                        </div>
                                        <div className="input-group" style={{ flex: '1 1 120px' }}>
                                            <label>N° Lot</label>
                                            <input
                                                type="number"
                                                name="numlot"
                                                value={formData.numlot || ""}
                                                onChange={handleFormChange}
                                                placeholder="Opt."
                                            />
                                        </div>
                                        <div className="input-group" style={{ flex: '1 1 140px' }}>
                                            <label>Date</label>
                                            <input
                                                type="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleFormChange}
                                                required
                                            />
                                        </div>
                                        <div className="input-group" style={{ flex: '0 0 120px' }}>
                                            <label>Prix (DH/kg)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleFormChange}
                                                required
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="input-group" style={{ flex: '0 0 130px' }}>
                                            <label>Poids Total</label>
                                            <input
                                                type="text"
                                                name="poidsTotal"
                                                value={formData.poidsTotal}
                                                readOnly
                                                style={{ fontWeight: 'bold', color: '#007bff' }}
                                            />
                                        </div>
                                        <div className="input-group" style={{ flex: '0 0 130px' }}>
                                            <label>Montant Total</label>
                                            <input
                                                type="text"
                                                name="montantTotal"
                                                value={formData.montantTotal}
                                                readOnly
                                                style={{ fontWeight: 'bold', color: '#28a745' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Merged Manual Detail Entry Section */}
                                    {(!isViewing) && (
                                        <div className="detail-entry" style={{ marginTop: '0.5rem', paddingTop: '1rem' }}>
                                            <div className="form-row" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                <div className="input-group" style={{ flex: '2', minWidth: '200px' }}>
                                                    <label>Verger</label>
                                                    <Select
                                                        options={vergerOptions}
                                                        value={newDetail.refver}
                                                        onChange={(val) => setNewDetail(prev => ({ ...prev, refver: val }))}
                                                        placeholder="Choisir Verger"
                                                        styles={{
                                                            control: (base) => ({
                                                                ...base,
                                                                minHeight: '48px',
                                                                height: '48px',
                                                                fontSize: '1rem',
                                                                borderRadius: '8px',
                                                                borderColor: '#e0e6ed',
                                                                backgroundColor: 'white',
                                                                boxShadow: 'none',
                                                                '&:hover': { borderColor: '#adb5bd' }
                                                            }),
                                                            valueContainer: (base) => ({ ...base, height: '48px', padding: '0 8px' }),
                                                            singleValue: (base) => ({ ...base, margin: 0, top: '50%', transform: 'translateY(-50%)' }),
                                                            placeholder: (base) => ({ ...base, margin: 0, top: '50%', transform: 'translateY(-50%)' }),
                                                            indicatorsContainer: (base) => ({ ...base, height: '48px' })
                                                        }}
                                                    />
                                                </div>
                                                <div className="input-group" style={{ flex: '2', minWidth: '200px' }}>
                                                    <label>Variété (Groupe)</label>
                                                    <Select
                                                        options={grpvarOptions}
                                                        value={newDetail.codgrv}
                                                        onChange={(val) => setNewDetail(prev => ({ ...prev, codgrv: val }))}
                                                        placeholder="Choisir Variété"
                                                        styles={{
                                                            control: (base) => ({
                                                                ...base,
                                                                minHeight: '48px',
                                                                height: '48px',
                                                                fontSize: '1rem',
                                                                borderRadius: '8px',
                                                                borderColor: '#e0e6ed',
                                                                backgroundColor: 'white',
                                                                boxShadow: 'none',
                                                                '&:hover': { borderColor: '#adb5bd' }
                                                            }),
                                                            valueContainer: (base) => ({ ...base, height: '48px', padding: '0 8px' }),
                                                            singleValue: (base) => ({ ...base, margin: 0, top: '50%', transform: 'translateY(-50%)' }),
                                                            placeholder: (base) => ({ ...base, margin: 0, top: '50%', transform: 'translateY(-50%)' }),
                                                            indicatorsContainer: (base) => ({ ...base, height: '48px' })
                                                        }}
                                                    />
                                                </div>
                                                <div className="input-group" style={{ flex: '1', minWidth: '120px' }}>
                                                    <label>Poids (kg)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={newDetail.pds}
                                                        onChange={(e) => setNewDetail(prev => ({ ...prev, pds: e.target.value }))}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="input-group" style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                                    <label>&nbsp;</label>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddDetail}
                                                        className="ve-add-btn"
                                                    >
                                                        + Ajouter
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details Table - Moved inside detail-entry for better layout */}
                                            <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '1rem' }}>
                                                <table className="data-table" style={{ fontSize: '0.85em' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ padding: '3px 6px' }}>Verger</th>
                                                            <th style={{ padding: '3px 6px' }}>Variété</th>
                                                            <th style={{ textAlign: 'right', padding: '3px 6px' }}>Poids (kg)</th>
                                                            {!isViewing && <th style={{ textAlign: 'center', padding: '3px 6px' }}>Action</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {details.length > 0 ? (
                                                            details.map((item, index) => (
                                                                <tr key={item.uniqueId || index}>
                                                                    <td style={{ padding: '2px 6px' }}>{item.refver?.label || 'N/A'}</td>
                                                                    <td style={{ padding: '2px 6px' }}>{item.codgrv?.label || 'N/A'}</td>
                                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '2px 6px' }}>{parseFloat(item.pds).toFixed(2)}</td>
                                                                    {!isViewing && (
                                                                        <td style={{ textAlign: 'center', padding: '2px 6px' }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveDetail(item.uniqueId)}
                                                                                style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', padding: '0', lineHeight: '1' }}
                                                                            >
                                                                                &times;
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={isViewing ? 3 : 4} style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '10px' }}>
                                                                    Aucun détail ajouté.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-actions">
                                        {/* Show Save/Update button only when not viewing */}
                                        {!isViewing && (
                                            <button type="submit" style={{ backgroundColor: isEditing ? '#ffc107' : '#28a745', color: isEditing ? 'black' : 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>{isEditing ? 'Modifier Vente' : 'Enregistrer Vente'}</button>
                                        )}
                                        {/* Always show Cancel button */}
                                        <button type="button" className="cancel-btn" onClick={() => {
                                            setShowForm(false);
                                            setIsEditing(false);
                                            setEditingVenteId(null);
                                            setIsViewing(false);
                                            setViewingVenteId(null);
                                            setFormData({
                                                typeEcart: null,
                                                numbonvente: '',
                                                date: new Date().toISOString().split('T')[0],
                                                price: '',
                                                poidsTotal: '',
                                                montantTotal: '',
                                                numlot: null
                                            });
                                            setDetails([]);
                                            setNewDetail({ refver: null, codgrv: null, pds: '' });
                                        }}>
                                            {isViewing ? 'Fermer' : 'Annuler'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Visualisation Vente */}
                            {isViewing && (
                                <div style={{ marginTop: '20px' }}>
                                    <div className="table-section" style={{ padding: '0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden' }}>



                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: '400px' }}>
                                            {/* Summary Section */}
                                            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '0', border: '1px solid #ddd' }}>
                                                <button onClick={() => generateBonDeLivraison(viewingVenteId)} style={{ fontSize: '0.8em', backgroundColor: '#5cb85c', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>Générer Bon de Livraison</button>
                                                <h3 style={{ color: '#007bff', marginTop: '0', marginBottom: '10px' }}>  Vente   #{viewingVenteId} <span style={{ fontSize: '0.9em', color: 'black', textAlign: 'center' }}>{selectedTypeEcart?.label || 'Inconnu'} </span></h3>

                                                <div style={{ fontSize: '1em', marginBottom: '10px', color: '#495057' }}>
                                                    N° Bon: {formData.numbonvente}
                                                </div>
                                                <div style={{ fontSize: '1em', marginBottom: '10px', color: '#495057' }}>
                                                    Numéro de Lot:{formData.numlot || 'N/A'}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.85em', color: '#6c757d', marginBottom: '5px' }}>Poids Total</div>
                                                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#007bff' }}>{formData.poidsTotal || '0'} kg</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.85em', color: '#6c757d', marginBottom: '5px' }}>Prix par kg</div>
                                                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#ffc107' }}>MAD {formData.price || '0'}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.85em', color: '#6c757d', marginBottom: '5px' }}>Montant Total</div>
                                                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#28a745' }}>MAD {formData.montantTotal || '0'}</div>
                                                    </div>


                                                </div>
                                            </div>
                                            {/* Details Section */}
                                            <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '0 0 10px 10px' }}>
                                                <h3 style={{ marginTop: '0', marginBottom: '20px', color: '#495057' }}>Détails des Écarts Vendus</h3>
                                                {details.length > 0 ? (
                                                    <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                                        <table className="data-table" style={{ fontSize: '0.85em' }}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Verger</th>
                                                                    <th>Variété</th>
                                                                    <th style={{ textAlign: 'right' }}>Poids (kg)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {details.map((item, index) => (
                                                                    <tr key={item.uniqueId || index}>
                                                                        <td>{item.refver?.label || 'N/A'}</td>
                                                                        <td>{item.codgrv?.label || 'N/A'}</td>
                                                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(item.pds).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '10px' }}>
                                                        <div style={{ fontSize: '3em', marginBottom: '10px' }}>📦</div>
                                                        <p style={{ color: '#856404', margin: '0', fontSize: '0.9em' }}>
                                                            <strong>Note :</strong> L'API ne fournit actuellement pas les détails individuels des écarts pour cette vente. Si le backend est mis à jour pour inclure les informations sur les écarts dans la réponse de getVente, la liste détaillée des palettes sera affichée ici automatiquement.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>

            {/* Separator */}
            <hr style={{ border: '0', height: '1px', background: '#e0e0e0', margin: '40px 0' }} />

            {/* Ventes List */}
            <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Détails des Ventes</h3>
                    <input
                        type="text"
                        placeholder="Rechercher par ID, N° Bon, Lot, Date, Prix..."
                        value={searchVentes}
                        onChange={(e) => setSearchVentes(e.target.value)}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            width: '50%',
                            fontSize: '0.8em',
                            boxSizing: 'border-box',
                            backgroundColor: '#ffffff',
                            outline: 'none'
                        }}
                    />
                </div>
                <div className="table-container">
                    <table className="data-table" style={{ fontSize: '0.9em' }}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>N° Bon de Vente</th>
                                <th>Numéro de Lot</th>
                                <th>Date</th>
                                <th>Prix (DH/kg)</th>
                                <th>Poids Total (kg)</th>
                                <th>Montant Total (DH)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentVentes.map(vente => (
                                <tr key={vente.id}>
                                    <td>{vente.id}</td>
                                    <td>{vente.numbonvente || 'N/A'}</td>
                                    <td>{vente.numlot || 'N/A'}</td>
                                    <td>{new Date(vente.date).toLocaleDateString()}</td>
                                    <td>{vente.price?.toFixed(2)}</td>
                                    <td>{vente.poidsTotal?.toFixed(2)}</td>
                                    <td>{vente.montantTotal?.toFixed(2)}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleEditVente(vente.id)}
                                                title="Modifier"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="action-btn"
                                                style={{ color: '#6f42c1', backgroundColor: '#f3e5f5' }}
                                                onClick={() => handlePrintVente(vente.id)}
                                                title="Imprimer PDF"
                                                disabled={isPrinting}
                                            >
                                                🖨️
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDeleteVente(vente.id)}
                                                title="Supprimer"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Affichage {startIndex + 1}-{Math.min(endIndex, totalItems)} sur {totalItems} résultats
                        </div>

                        <div className="pagination">
                            <button
                                className="pagination-nav"
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                            >
                                <span className="nav-arrow">‹</span>
                                Précédent
                            </button>

                            <div className="pagination-numbers">
                                {renderPageNumbers().map((pageNumber, index) => (
                                    pageNumber === '...' ? (
                                        <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                                    ) : (
                                        <button
                                            key={pageNumber}
                                            className={`pagination-number ${currentPage === pageNumber ? 'active' : ''}`}
                                            onClick={() => handlePageChange(pageNumber)}
                                        >
                                            {pageNumber}
                                        </button>
                                    )
                                ))}
                            </div>

                            <button
                                className="pagination-nav"
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                            >
                                Suivant
                                <span className="nav-arrow">›</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VenteEcartPage;
