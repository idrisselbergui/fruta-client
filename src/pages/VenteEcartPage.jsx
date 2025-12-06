import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiGet } from '../apiService';
import { getUnsoldEcartDirect, getUnsoldEcartE, getVentes, getVente, createVenteEcart, deleteVente, updateVente } from '../apiService';
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
        montantTotal: '',
        numlot: null // Added numlot
    });

    const [selectedEcarts, setSelectedEcarts] = useState([]); // [{table: 'ecart_direct'|'ecart_e', id, pdsvent}]
    const [ventes, setVentes] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingVenteId, setEditingVenteId] = useState(null);
    const [isViewing, setIsViewing] = useState(false);
    const [viewingVenteId, setViewingVenteId] = useState(null);

    // Fetch typeecarts and vergers/varietes for display
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [typeEcartData, vergerData, varieteData, ventesData] = await Promise.all([
                    apiGet('/api/lookup/typeecarts'),
                    apiGet('/api/lookup/vergers'),
                    apiGet('/api/lookup/varietes'),
                    getVentes()
                ]);
                setTypeEcarts(typeEcartData);
                setVergers(vergerData);
                setVarietes(varieteData);
                setVentes(ventesData);
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
                getUnsoldEcartDirect(selectedTypeEcart.value, startDate || null, endDate || null, editingVenteId || null),
                getUnsoldEcartE(selectedTypeEcart.value, startDate || null, endDate || null, editingVenteId || null)
            ]);
            setEcartDirects(directData);
            setEcartEs(eData);
            // Remove automatic selection in editing mode - let user select manually
        } catch (err) {
            setError('Failed to fetch ecarts.');
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch when filters change or editing mode on
    useEffect(() => {
        fetchEcarts();
    }, [selectedTypeEcart, startDate, endDate, editingVenteId]);

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
            // Check if this ecart is already selected
            const alreadySelected = selectedEcarts.find(ec => ec.table === table && ec.id === id);
            if (alreadySelected) {
                // If already selected, keep the existing pdsvent value
                setSelectedEcarts(prev => [...prev.filter(ec => ec.table !== table || ec.id !== id), alreadySelected]);
            } else {
                // If newly selected, default to the full poids, allowing for modification
                const initialPdsvent = (defaultPoids !== undefined && defaultPoids !== null) ? defaultPoids.toFixed(2) : '';
                setSelectedEcarts(prev => [...prev, { table, id, pdsvent: initialPdsvent }]);
            }
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
            setError('Veuillez remplir les champs requis et sélectionner au moins un écart.');
            return;
        }
        try {
            const requestData = {
                numbonvente: formData.numbonvente ? parseInt(formData.numbonvente) : null,
                date: new Date(formData.date),
                price: parseFloat(formData.price),
                poidsTotal: parseFloat(formData.poidsTotal),
                montantTotal: parseFloat(formData.montantTotal),
                numlot: formData.numlot ? parseInt(formData.numlot) : null, // Added numlot to requestData
                selectedEcarts: selectedEcarts
            };
            if (isEditing && editingVenteId) {
                await updateVente(editingVenteId, requestData);
                alert('Vente modifiée avec succès!');
            } else {
                await createVenteEcart(requestData);
                alert('Vente créée avec succès!');
            }
            const updatedVentes = await getVentes();
            setVentes(updatedVentes);
            // Exit edit mode and reset form
            setIsEditing(false);
            setEditingVenteId(null);
            setFormData({
                numbonvente: '',
                date: new Date().toISOString().split('T')[0],
                price: '',
                poidsTotal: '',
                montantTotal: '',
                numlot: null // Reset numlot
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

    const handleDeleteVente = async (venteId) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette vente?')) {
            try {
                await deleteVente(venteId);
                const updatedVentes = await getVentes();
                setVentes(updatedVentes);
                alert('Vente supprimée avec succès!');
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handleViewVente = async (venteId) => {
        try {
            const data = await getVente(venteId);
            console.log('View Vente Data:', data); // Debug what the API actually returns

            const { vente, codtype, ecarts } = data; // Check if ecarts data is available
            const typeOption = typeEcarts.find(t => t.codtype === codtype);

            setFormData({
                numbonvente: vente.numbonvente || '',
                date: new Date(vente.date).toISOString().split('T')[0],
                price: vente.price,
                poidsTotal: vente.poidsTotal || '0',
                montantTotal: vente.montantTotal || '0',
                numlot: vente.numlot || null // Populated numlot from fetched data
            });
            setIsViewing(true);
            setViewingVenteId(venteId);
            setSelectedTypeEcart(typeOption ? { value: typeOption.codtype, label: typeOption.destype } : null);

            // Store any ecart data that comes from the API
            // Try multiple possible property names
            if (ecarts && Array.isArray(ecarts)) {
                console.log('Ecarts from Vente API (ecarts):', ecarts);
                setSelectedEcarts(ecarts);
            } else if (data.selectedEcarts && Array.isArray(data.selectedEcarts)) {
                console.log('Ecarts from Vente API (selectedEcarts):', data.selectedEcarts);
                setSelectedEcarts(data.selectedEcarts);
            } else if (vente.selectedEcarts && Array.isArray(vente.selectedEcarts)) {
                console.log('Ecarts from Vente API (vente.selectedEcarts):', vente.selectedEcarts);
                setSelectedEcarts(vente.selectedEcarts);
            } else if (data.ecartDetails && Array.isArray(data.ecartDetails)) {
                console.log('Ecarts from Vente API (ecartDetails):', data.ecartDetails);
                setSelectedEcarts(data.ecartDetails);
            } else {
                console.log('No ecarts found in API response');
                setSelectedEcarts([]);
            }

        } catch (err) {
            setError(err.message);
        }
    };

    const generateBonDeLivraison = async (venteId) => {
        if (!venteId) return;

        try {
            const data = await getVente(venteId);
            const { vente, codtype, ecarts } = data;
            const typeOption = typeEcarts.find(t => t.codtype === codtype);

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
            doc.text('BON DE LIVRAISON', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text('FRUTAAAA - Société de Production Agricole', 20, 40);
            doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, 20, 50);

            // Vente details
            doc.setFontSize(12);
            doc.text('Détails de la Vente:', 20, 70);
            let y = 80;
            doc.text(`N° Bon de Vente: ${vente.numbonvente || 'N/A'}`, 20, y);
            y += 10;
            doc.text(`Numéro de Lot: ${vente.numlot || 'N/A'}`, 20, y);
            y += 10;
            doc.text(`Date de Vente: ${new Date(vente.date).toLocaleDateString('fr-FR')}`, 20, y);
            y += 10;
            doc.text(`Prix par kg: ${vente.price} €`, 20, y);
            y += 10;
            doc.text(`Poids Total: ${vente.poidsTotal} kg`, 20, y);
            y += 10;
            doc.text(`Montant Total: ${vente.montantTotal} €`, 20, y);
            y += 10;
            doc.text(`Type d'Écart: ${typeOption ? typeOption.destype : 'Inconnu'}`, 20, y);
            y += 20;

            // Ecarts table
            const tableData = [];
            const headerRow = ['N° Palette', 'Type', 'Verger', 'Variété', 'Poids Vendu (kg)'];
            tableData.push(headerRow);

            if (ecarts && Array.isArray(ecarts) && ecarts.length > 0) {
                ecarts.forEach(ecart => {
                    const { verger, variete } = getDisplayName(ecart.refver, vergers, ecart.codvar, varietes);
                    const typeText = ecart.table === 'ecart_direct' ? 'Direct' : 'Station';
                    tableData.push([
                        ecart.id,
                        typeText,
                        verger,
                        variete,
                        ecart.pdsvent
                    ]);
                });
            } else if (selectedEcarts.length > 0) {
                selectedEcarts.forEach(ecart => {
                    const { verger, variete } = getDisplayName(ecart.refver, vergers, ecart.codvar, varietes);
                    const typeText = ecart.table === 'ecart_direct' ? 'Direct' : 'Station';
                    tableData.push([
                        ecart.id,
                        typeText,
                        verger,
                        variete,
                        ecart.pdsvent
                    ]);
                });
            } else {
                tableData.push(['Aucune donnée d\'écart disponible', '', '', '', '']);
            }

            // Generate the table
            autoTable(doc, {
                startY: y,
                head: [headerRow],
                body: tableData.slice(1),
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 4
                },
                headStyles: {
                    fillColor: [66, 139, 202],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { halign: 'center' },
                    4: { halign: 'right' }
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

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Vente Écart</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            {/* Form Section */}
            <div className="form-container">
                <h3>Détails de Vente</h3>
                <form onSubmit={handleSave} className="ecart-form">
                    <div className="form-row">
                        <div className="input-group">
                            <label>N° Bon de Vente</label>
                            <input
                                type="number"
                                name="numbonvente"
                                value={formData.numbonvente}
                                onChange={handleFormChange}
                                placeholder=""
                            />
                        </div>
                        <div className="input-group">
                            <label>Numéro de Lot</label>
                            <input
                                type="number"
                                name="numlot"
                                value={formData.numlot || ""}
                                onChange={handleFormChange}
                                placeholder="Numéro de Lot (Facultatif)"
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
                            <label>Prix (€/kg)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="price"
                                value={formData.price}
                                onChange={handleFormChange}
                                required
                                placeholder="Entrez le prix"
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
                        {/* Show Save/Update button only when not viewing */}
                        {!isViewing && (
                            <button type="submit" style={{ backgroundColor: isEditing ? '#ffc107' : '#28a745', color: isEditing ? 'black' : 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>{isEditing ? 'Modifier Vente' : 'Enregistrer Vente'}</button>
                        )}
                        {/* Always show Cancel button */}
                        <button type="button" style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => {
                            setIsEditing(false);
                            setEditingVenteId(null);
                            setIsViewing(false);
                            setViewingVenteId(null);
                            setFormData({
                                numbonvente: '',
                                date: new Date().toISOString().split('T')[0],
                                price: '',
                                poidsTotal: '',
                                montantTotal: '',
                                numlot: null // Reset numlot
                            });
                            setSelectedEcarts([]);
                            setSelectedTypeEcart(null);
                            setEcartDirects([]);
                            setEcartEs([]);
                        }}>Annuler</button>
                    </div>
                </form>
            </div>

            {/* Filter */}
            <div className="filter-section">
                <div className="filter-item">
                    <label>Type d'Écart</label>
                    <Select
                        options={typeEcartOptions}
                        value={selectedTypeEcart}
                        onChange={setSelectedTypeEcart}
                        isClearable
                        isDisabled={isEditing || isViewing}
                        placeholder="Sélectionnez le Type d'Écart pour charger les articles"
                    />
                </div>
                <div className="filter-item">
                    <label>Date Début</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="filter-item">
                    <label>Date Fin</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Simple View Mode Summary */}
            {isViewing && (
                <div style={{ marginTop: '20px' }}>
                    {/* Vente Summary */}
                    <div className="table-section">
                        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #ddd' }}>
                            <h3 style={{ color: '#007bff', marginTop: '0' }}>Visualisation Vente #{viewingVenteId}</h3>
                            <p><strong>Cette vente contient :</strong></p>
                            <ul>
                                <li><strong>Poids Total :</strong> {formData.poidsTotal || '0'} kg</li>
                                <li><strong>Montant Total :</strong> €{formData.montantTotal || '0'}</li>
                                <li><strong>Prix par kg :</strong> €{formData.price || '0'}</li>
                                <li><strong>Numéro de Lot :</strong> {formData.numlot || 'N/A'}</li>
                                <li><strong>Type :</strong> {selectedTypeEcart?.label || 'Inconnu'}</li>
                            </ul>
                            <div style={{ textAlign: 'right', marginTop: '10px' }}>
                                <button onClick={() => generateBonDeLivraison(viewingVenteId)} style={{ fontSize: '0.8em', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Bon de Livraison</button>
                            </div>
                        </div>
                    </div>

                    {/* Ecarts Details Table if available */}
                    {selectedEcarts.length > 0 && (
                        <div className="table-section" style={{ marginTop: '20px' }}>
                            <h3>Détails des Écarts Vendus dans Cette Vente</h3>
                            <table className="data-table" style={{ fontSize: '0.9em' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                    <tr>
                                        <th>Type</th>
                                        <th>N° Palette</th>
                                        <th>Verger</th>
                                        <th>Variété</th>
                                        <th>Poids Vendu (kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedEcarts.map(item => {
                                        const { verger, variete } = getDisplayName(item.refver, vergers, item.codvar, varietes);
                                        return (
                                            <tr key={`${item.table}-${item.id}`}>
                                                <td style={{ fontWeight: 'bold', color: item.table === 'ecart_direct' ? '#007bff' : '#17a2b8' }}>
                                                    {item.table === 'ecart_direct' ? 'Direct' : 'Station'}
                                                </td>
                                                <td>{item.id}</td>
                                                <td>{verger}</td>
                                                <td>{variete}</td>
                                                <td>{item.pdsvent} kg</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Message if no ecart details */}
                    {selectedEcarts.length === 0 && (
                        <div className="table-section" style={{ marginTop: '20px' }}>
                            <div style={{ padding: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                                <p style={{ color: '#856404', margin: '0' }}>
                                    <strong>Note :</strong> L'API ne fournit actuellement pas les détails individuels des écarts pour cette vente. Si le backend est mis à jour pour inclure les informations sur les écarts dans la réponse de getVente, la liste détaillée des palettes sera affichée ici automatiquement.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedTypeEcart && !isViewing && (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Ecart Direct List */}
                    <div className="table-section" style={{ flex: 1, minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
                        <h3>Écart Direct</h3>
                        <table className="data-table" style={{ fontSize: '0.9em' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                <tr>
                                    <th>Sélectionner</th>
                                    <th>N° Palette</th>
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
                                            <td>{selected && item.Pdsvent ? item.Pdsvent?.toFixed(2) : item.pdsfru?.toFixed(2)} {item.pdsfru || item.Pdsvent ? 'kg' : ''}</td>
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
                    <div className="table-section" style={{ flex: 1, minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
                        <h3>Écart Station</h3>
                        <table className="data-table" style={{ fontSize: '0.9em' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                <tr>
                                    <th>Sélectionner</th>
                                    <th>N° Palette</th>
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
                                            <td>{selected && item.pdsvent ? item.pdsvent?.toFixed(2) : item.pdsfru?.toFixed(2)} {item.pdsfru || item.Pdsvent ? 'kg' : ''}</td>
                                            <td>
                                                {selected && (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={selected.pdsvent}
                                                        placeholder="Poids Vente"
                                                        onChange={(e) => handlePdsventChange('ecart_e', item.numpal, e.target.value)}
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

            {/* Ventes List */}
            <div className="table-section" style={{ marginTop: '40px' }}>
                <h3>Détails des Ventes</h3>
                <table className="data-table" style={{ fontSize: '0.9em' }}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>N° Bon de Vente</th>
                            <th>Numéro de Lot</th>
                            <th>Date</th>
                            <th>Prix (€/kg)</th>
                            <th>Poids Total (kg)</th>
                            <th>Montant Total (€)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventes.map(vente => (
                            <tr key={vente.id}>
                                <td>{vente.id}</td>
                                <td>{vente.numbonvente || 'N/A'}</td>
                                <td>{vente.numlot || 'N/A'}</td>
                                <td>{new Date(vente.date).toLocaleDateString()}</td>
                                <td>{vente.price?.toFixed(2)}</td>
                                <td>{vente.poidsTotal?.toFixed(2)}</td>
                                <td>{vente.montantTotal?.toFixed(2)}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                        <button onClick={() => handleDeleteVente(vente.id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Supprimer</button>
                                        <button onClick={() => handleViewVente(vente.id)} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Voir</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VenteEcartPage;
