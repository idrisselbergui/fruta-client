import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { apiGet, apiPost, apiPut, apiDelete, getChargeSum } from '../apiService';
import { formatDateForDisplay, formatDateForInput } from '../utils/dateUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import './GestionAvancePage.css';

const GestionAvancePage = () => {
    // Lookups
    const [adherents, setAdherents] = useState([]);

    // Main Data
    const [avances, setAvances] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAvanceId, setEditingAvanceId] = useState(null);
    const [isViewing, setIsViewing] = useState(false);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const [wizardDetails, setWizardDetails] = useState([]);
    const [isCalculating, setIsCalculating] = useState(false);

    // Prix Estimatifs Modal State
    const [showPrixModal, setShowPrixModal] = useState(false);
    const [grpVars, setGrpVars] = useState([]);
    const [prixEstimatifsData, setPrixEstimatifsData] = useState({}); // { codgrv: prix }
    const [isSavingPrix, setIsSavingPrix] = useState(false);

    // Pagination/Search
    const [searchAvances, setSearchAvances] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form Data Structure
    const [formData, setFormData] = useState({
        adherent: null,
        date: new Date().toISOString().split('T')[0],
        annee: new Date().getFullYear(),
        mois: new Date().getMonth() + 1,
        tgExport: '',
        prixEstimeMois: '',
        decaompteEsteme: '',
        s1: '', s2: '', s3: '', s4: '', s5: '',
        montantAvance: '', totalCharges: '', totalDecompte: ''
    });

    // Total Charges Fetched from Server
    const [totalCharges, setTotalCharges] = useState(0);

    // Real (manually entered) row state
    const emptyRealRow = { ts1: '', ts2: '', ts3: '', ts4: '', ts5: '', decs1: '', decs2: '', decs3: '', decs4: '', decs5: '' };
    const [realRow, setRealRow] = useState(emptyRealRow);

    const handleRealRowChange = (field, value) => {
        setRealRow(prev => ({ ...prev, [field]: value }));
    };

    // Auto-calculated Prix par KG for the real row
    const realPrixParKg = (() => {
        const totalT = ['ts1', 'ts2', 'ts3', 'ts4', 'ts5'].reduce((s, k) => s + (parseFloat(realRow[k]) || 0), 0);
        const totalDec = ['decs1', 'decs2', 'decs3', 'decs4', 'decs5'].reduce((s, k) => s + (parseFloat(realRow[k]) || 0), 0);
        return totalT > 0 ? totalDec / totalT : 0;
    })();

    // Fetch master lookups
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [adherentData, avancesData] = await Promise.all([
                    apiGet('/api/lookup/adherents'),
                    apiGet('/api/gestionavances')
                ]);

                setAdherents(adherentData);
                setAvances(avancesData.sort((a, b) => b.id - a.id));
            } catch (err) {
                console.error("Failed to fetch lookups", err);
                setError('Failed to fetch data.');
            }
        };
        fetchLookups();
    }, []);

    // Fetch Variety Groups once for the Modal
    useEffect(() => {
        const fetchGrpVars = async () => {
            try {
                const groups = await apiGet('/api/lookup/grpvars');
                setGrpVars(groups);
            } catch (err) {
                console.error("Failed to fetch grpvars", err);
            }
        };
        fetchGrpVars();
    }, []);

    const adherentOptions = adherents.map(a => ({ value: a.refadh, label: a.nomadh }));

    // Effect to fetch total charges when adherent, annee, or mois changes
    useEffect(() => {
        const fetchCharges = async () => {
            if (!formData.adherent || !formData.annee || !formData.mois) {
                setTotalCharges(0);
                return;
            }
            try {
                const sum = await getChargeSum(formData.adherent.value, formData.annee, formData.mois);
                setTotalCharges(sum || 0);
            } catch (err) {
                console.error("Failed to fetch charge sum", err);
                setTotalCharges(0);
            }
        };
        fetchCharges();
    }, [formData.adherent, formData.annee, formData.mois]);

    // Wizard Totals Calculations
    const wizardTotals = useMemo(() => {
        let tTonnageS1 = 0, tTonnageS2 = 0, tTonnageS3 = 0, tTonnageS4 = 0, tTonnageS5 = 0;
        let tDecS1 = 0, tDecS2 = 0, tDecS3 = 0, tDecS4 = 0, tDecS5 = 0;

        wizardDetails.forEach(row => {
            tTonnageS1 += row.tonnageS1;
            tTonnageS2 += row.tonnageS2;
            tTonnageS3 += row.tonnageS3;
            tTonnageS4 += row.tonnageS4;
            tTonnageS5 += (row.tonnageS5 || 0);

            tDecS1 += (row.tonnageS1 * row.prixEstime);
            tDecS2 += (row.tonnageS2 * row.prixEstime);
            tDecS3 += (row.tonnageS3 * row.prixEstime);
            tDecS4 += (row.tonnageS4 * row.prixEstime);
            tDecS5 += ((row.tonnageS5 || 0) * row.prixEstime);
        });

        const totalTonnage = tTonnageS1 + tTonnageS2 + tTonnageS3 + tTonnageS4 + tTonnageS5;
        const totalDec = tDecS1 + tDecS2 + tDecS3 + tDecS4 + tDecS5;
        const totalAvanceOrTotal = totalDec;

        let calculatedSolde = totalDec - totalCharges;

        return {
            tTonnageS1, tTonnageS2, tTonnageS3, tTonnageS4, tTonnageS5, totalTonnage,
            tDecS1, tDecS2, tDecS3, tDecS4, tDecS5, totalDec,
            calculatedSolde
        };
    }, [wizardDetails, totalCharges, isEditing, formData]);

    // Format numbers
    const formatNumber = (num) => {
        return num && !isNaN(num) ? num.toFixed(2) : "0.00";
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Prix Estimatifs Handlers
    const handleOpenPrixModal = async () => {
        if (!formData.annee || !formData.mois) {
            alert('Veuillez sélectionner une Année et un Mois avant de saisir les prix.');
            return;
        }
        setShowPrixModal(true);
        // Load existing prices for this month/year
        try {
            const data = await apiGet(`/api/PrixEstimatifs/by-month?annee=${formData.annee}&mois=${formData.mois}`);
            const mapping = {};
            data.forEach(p => { mapping[p.codGrv] = p.prixEstime; });
            setPrixEstimatifsData(mapping);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePrixChange = (codgrv, value) => {
        setPrixEstimatifsData(prev => ({
            ...prev,
            [codgrv]: value
        }));
    };

    const handleSavePrixEstimatifs = async (e) => {
        e.preventDefault();
        setIsSavingPrix(true);
        try {
            const promises = grpVars.map(g => {
                const prix = parseFloat(prixEstimatifsData[g.codgrv]) || 0;
                return apiPost('/api/PrixEstimatifs/upsert', {
                    Annee: parseInt(formData.annee),
                    Mois: parseInt(formData.mois),
                    CodGrv: g.codgrv,
                    PrixEstime: prix
                });
            });
            await Promise.all(promises);
            setShowPrixModal(false);
            alert('Prix estimatifs enregistrés avec succès !');
        } catch (err) {
            alert('Erreur lors de la sauvegarde: ' + err.message);
        } finally {
            setIsSavingPrix(false);
        }
    };

    // Go to Step 2
    const handleNextStep = async () => {
        if (!formData.adherent) {
            setError('Veuillez sélectionner un Adhérent.');
            return;
        }

        // --- Duplicate check: block if a décompte already exists for this adherent + month ---
        if (!isEditing) {
            const duplicate = avances.find(a =>
                a.refadh === formData.adherent.value &&
                a.annee === parseInt(formData.annee) &&
                a.mois === parseInt(formData.mois)
            );
            if (duplicate) {
                setError(`⚠️ Un décompte existe déjà pour cet adhérent pour ${formData.mois}/${formData.annee} (ID: #${duplicate.id}). Veuillez le modifier via le bouton ✏️ au lieu d'en créer un nouveau.`);
                return;
            }
        }

        setError(null);
        setIsCalculating(true);
        try {
            const data = await apiGet(`/api/gestionavances/wizard-details?refadh=${formData.adherent.value}&annee=${formData.annee}&mois=${formData.mois}`);

            if (data && data.length > 0) {
                const hasMissingPrices = data.some(row => !row.prixEstime || row.prixEstime === 0);
                if (hasMissingPrices) {
                    alert("Impossible de continuer : Il manque des prix estimatifs pour les groupes de variétés exportés ce mois. Veuillez cliquer sur '💰 Saisir Prix Estimatifs' pour les définir.");
                    return;
                }
            }

            setWizardDetails(data || []);

            // Pre-populate the real row with estimated values (only for new records, not editing)
            if (!isEditing && data && data.length > 0) {
                const sum = (field) => data.reduce((s, r) => s + (r[field] || 0), 0);
                const fmt = (v) => v > 0 ? parseFloat(v.toFixed(2)) : '';
                setRealRow({
                    ts1: fmt(sum('tonnageS1')), ts2: fmt(sum('tonnageS2')),
                    ts3: fmt(sum('tonnageS3')), ts4: fmt(sum('tonnageS4')),
                    ts5: fmt(sum('tonnageS5')),
                    decs1: fmt(data.reduce((s, r) => s + r.tonnageS1 * r.prixEstime, 0)),
                    decs2: fmt(data.reduce((s, r) => s + r.tonnageS2 * r.prixEstime, 0)),
                    decs3: fmt(data.reduce((s, r) => s + r.tonnageS3 * r.prixEstime, 0)),
                    decs4: fmt(data.reduce((s, r) => s + r.tonnageS4 * r.prixEstime, 0)),
                    decs5: fmt(data.reduce((s, r) => s + (r.tonnageS5 || 0) * r.prixEstime, 0)),
                });
            }

            setCurrentStep(2);
        } catch (err) {
            setError(err.message || 'Erreur lors du calcul');
        } finally {
            setIsCalculating(false);
        }
    };

    // Saving data
    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.adherent) {
            setError('Veuillez sélectionner un Adhérent.');
            return;
        }

        try {
            const requestData = {
                refadh: formData.adherent.value,
                date: new Date(formData.date),
                annee: parseInt(formData.annee) || new Date().getFullYear(),
                mois: parseInt(formData.mois),
                ttdecompte: wizardTotals.calculatedSolde,
                ttcharges: parseFloat(totalCharges) || 0,
                tgExport: wizardTotals.totalTonnage,
                prixEstemeMois: 0, // It varies by variety now, so we save 0
                decaompteEsteme: wizardTotals.totalDec,
                s1: wizardTotals.tTonnageS1,
                s2: wizardTotals.tTonnageS2,
                s3: wizardTotals.tTonnageS3,
                s4: wizardTotals.tTonnageS4,
                s5: wizardTotals.tTonnageS5,
                realTS1: parseFloat(realRow.ts1) || 0,
                realTS2: parseFloat(realRow.ts2) || 0,
                realTS3: parseFloat(realRow.ts3) || 0,
                realTS4: parseFloat(realRow.ts4) || 0,
                realTS5: parseFloat(realRow.ts5) || 0,
                realDecS1: parseFloat(realRow.decs1) || 0,
                realDecS2: parseFloat(realRow.decs2) || 0,
                realDecS3: parseFloat(realRow.decs3) || 0,
                realDecS4: parseFloat(realRow.decs4) || 0,
                realDecS5: parseFloat(realRow.decs5) || 0,
                montant: wizardTotals.totalDec
            };

            if (isEditing && editingAvanceId) {
                await apiPut(`/api/gestionavances/${editingAvanceId}`, requestData);
                alert('Décompte modifié avec succès!');
            } else {
                await apiPost('/api/gestionavances', requestData);
                alert('Décompte créé avec succès!');
            }

            const updatedAvances = await apiGet('/api/gestionavances');
            setAvances(updatedAvances.sort((a, b) => b.id - a.id));
            resetForm();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEditAvance = async (id) => {
        try {
            const data = await apiGet(`/api/gestionavances/${id}`);
            const { avance } = data; // details is not here

            setFormData({
                adherent: adherentOptions.find(a => a.value === avance.refadh) || null,
                date: formatDateForInput(avance.date),
                annee: avance.annee || new Date().getFullYear(),
                mois: avance.mois || '',
                tgExport: avance.tgExport || '',
                prixEstimeMois: avance.prixEstemeMois || '',
                decaompteEsteme: avance.decaompteEsteme || '',
                s1: avance.s1 || '',
                s2: avance.s2 || '',
                s3: avance.s3 || '',
                s4: avance.s4 || '',
                s5: avance.s5 || '',
                montantAvance: avance.montant || '',
                totalCharges: avance.ttcharges || '',
                totalDecompte: avance.ttdecompte || ''
            });

            setIsEditing(true);
            setEditingAvanceId(id);
            setIsViewing(false);
            setCurrentStep(1);
            setShowForm(true);
            // Restore real row values if they were previously saved
            setRealRow({
                ts1: avance.realTS1 || '', ts2: avance.realTS2 || '', ts3: avance.realTS3 || '',
                ts4: avance.realTS4 || '', ts5: avance.realTS5 || '',
                decs1: avance.realDecS1 || '', decs2: avance.realDecS2 || '', decs3: avance.realDecS3 || '',
                decs4: avance.realDecS4 || '', decs5: avance.realDecS5 || ''
            });

        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteAvance = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce décompte ?')) {
            try {
                await apiDelete(`/api/gestionavances/${id}`);
                const refreshed = await apiGet('/api/gestionavances');
                setAvances(refreshed.sort((a, b) => b.id - a.id));

                if (editingAvanceId === id) {
                    resetForm();
                }
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingAvanceId(null);
        setIsViewing(false);
        setCurrentStep(1);
        setWizardDetails([]);
        setRealRow(emptyRealRow);
        setFormData({
            adherent: null,
            date: new Date().toISOString().split('T')[0],
            annee: new Date().getFullYear(),
            mois: new Date().getMonth() + 1,
            tgExport: '',
            prixEstimeMois: '',
            decaompteEstime: '',
            s1: '', s2: '', s3: '', s4: '', s5: '',
            montantAvance: '', totalCharges: '', totalDecompte: ''
        });
        setTotalCharges(0);
    };

    // Filter and Pagination
    const filteredAvances = useMemo(() => {
        if (!searchAvances.trim()) return avances;
        const searchTerm = searchAvances.toLowerCase();
        return avances.filter(a =>
            a.id?.toString().toLowerCase().includes(searchTerm) ||
            formatDateForDisplay(a.date).toLowerCase().includes(searchTerm) ||
            a.montant?.toString().toLowerCase().includes(searchTerm)
        );
    }, [avances, searchAvances]);

    const totalItems = filteredAvances.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentAvances = filteredAvances.slice(startIndex, startIndex + itemsPerPage);


    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Gestion Decompte</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="create-section-outer">
                <div className="form-container">
                    <h2>{isEditing ? 'Modifier le Décompte' : 'Rechercher ou Enregistrer un Décompte'}</h2>

                    {!showForm ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <button type="button" className="ve-create-btn" onClick={() => setShowForm(true)}>
                                + Créer un Décompte
                            </button>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchAvances}
                                onChange={(e) => setSearchAvances(e.target.value)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
                            />
                        </div>
                    ) : (
                        <div className="daily-check-form">
                            <div className="form-section">
                                <form onSubmit={handleSave} className="ecart-form">

                                    {/* STEP 1: Configuration */}
                                    <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                                        <div className="form-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                            <div className="input-group" style={{ flex: '2 1 200px' }}>
                                                <label>Adhérent</label>
                                                <Select
                                                    options={adherentOptions}
                                                    value={formData.adherent}
                                                    onChange={(val) => setFormData(p => ({ ...p, adherent: val }))}
                                                    placeholder="Choisir Adhérent"
                                                    styles={{
                                                        control: (base) => ({ ...base, minHeight: '48px', height: '48px', borderRadius: '8px', borderColor: '#e0e6ed', backgroundColor: '#f8f9fa' }),
                                                        valueContainer: (base) => ({ ...base, height: '48px', padding: '0 8px' }),
                                                        indicatorsContainer: (base) => ({ ...base, height: '48px' })
                                                    }}
                                                />
                                            </div>
                                            <div className="input-group" style={{ flex: '1 1 140px' }}>
                                                <label>Date</label>
                                                <input type="date" name="date" value={formData.date} onChange={handleFormChange} required />
                                            </div>
                                            <div className="input-group" style={{ flex: '1 1 100px' }}>
                                                <label>Année</label>
                                                <select name="annee" value={formData.annee} onChange={handleFormChange} style={{ height: '38px', padding: '0 8px', borderRadius: '4px', border: '1px solid #e0e6ed', backgroundColor: '#f8f9fa' }}>
                                                    {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                                        <option key={year} value={year}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="input-group" style={{ flex: '1 1 100px' }}>
                                                <label>Mois</label>
                                                <input type="number" name="mois" value={formData.mois} onChange={handleFormChange} min="1" max="12" style={{ height: '38px', padding: '0 8px', borderRadius: '4px', border: '1px solid #e0e6ed', backgroundColor: '#f8f9fa' }} />
                                            </div>
                                            <div className="input-group" style={{ flex: '1 1 150px', display: 'flex', alignItems: 'flex-end' }}>
                                                <button type="button" onClick={handleOpenPrixModal} style={{ height: '38px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', padding: '0 15px', cursor: 'pointer', width: '100%', fontWeight: '500' }}>
                                                    💰 Saisir Prix Estimatifs
                                                </button>
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffeeba' }}>
                                                <strong>Mode Édition :</strong> Vous modifiez le décompte existant (ID: {editingAvanceId}).
                                                Les anciens totaux globaux enregistrés sont conservés. Pour recalculer selon le Tonnage réel actuel, cliquez sur Suivant.
                                            </div>
                                        )}

                                        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                            <button
                                                type="button"
                                                className="save-btn"
                                                style={{ backgroundColor: '#007bff', color: 'white' }}
                                                onClick={handleNextStep}
                                                disabled={isCalculating}
                                            >
                                                {isCalculating ? 'Calcul en cours...' : 'Suivant (Calculer)'}
                                            </button>
                                            <button type="button" className="cancel-btn" onClick={resetForm}>
                                                Annuler
                                            </button>
                                        </div>
                                    </div>

                                    {/* STEP 2: Wizard Table */}
                                    {currentStep === 2 && (
                                        <div className="wizard-step-2 fade-in">
                                            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ color: '#007bff', margin: 0 }}>Répartition Mensuelle ({formData.mois}/{formData.annee})</h4>
                                                <button type="button" onClick={() => setCurrentStep(1)} style={{ padding: '5px 10px', background: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                    ← Retour aux filtres
                                                </button>
                                            </div>

                                            <div className="table-responsive" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                                                        <tr>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6' }}>Gr. Variété</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>T. S1 (KG)</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>T. S2</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>T. S3</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>T. S4</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>T. S5</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right', color: '#17a2b8' }}>Prix Est. (DH)</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>Déc. S1</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>Déc. S2</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>Déc. S3</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>Déc. S4</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }}>Déc. S5</th>
                                                            <th style={{ padding: '8px', borderBottom: '2px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>Total Déc.</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {wizardDetails.map((row, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                                <td style={{ padding: '8px' }}>{row.nomGrv}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS1)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS2)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS3)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS4)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS5 || 0)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#17a2b8' }}>{formatNumber(row.prixEstime)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS1 * row.prixEstime)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS2 * row.prixEstime)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS3 * row.prixEstime)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(row.tonnageS4 * row.prixEstime)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber((row.tonnageS5 || 0) * row.prixEstime)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                                                                    {formatNumber((row.tonnageS1 + row.tonnageS2 + row.tonnageS3 + row.tonnageS4 + (row.tonnageS5 || 0)) * row.prixEstime)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {wizardDetails.length === 0 && (
                                                            <tr>
                                                                <td colSpan="13" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                                                    Aucune donnée d'export trouvée pour ce mois/année.
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {/* ── Real (manually entered) row ── */}
                                                        <tr style={{ backgroundColor: '#fff8e1', borderTop: '2px solid #ffc107' }}>
                                                            <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#856404', whiteSpace: 'nowrap' }}>
                                                                ✏️ Réel (Saisi)
                                                            </td>
                                                            {['ts1', 'ts2', 'ts3', 'ts4', 'ts5'].map(field => (
                                                                <td key={field} style={{ padding: '4px' }}>
                                                                    <input
                                                                        type="number" step="0.01" min="0"
                                                                        value={realRow[field]}
                                                                        onChange={e => handleRealRowChange(field, e.target.value)}
                                                                        style={{ width: '80px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ffc107', textAlign: 'right', backgroundColor: '#fffdf0' }}
                                                                        placeholder="0.00"
                                                                    />
                                                                </td>
                                                            ))}
                                                            {/* Prix par KG auto-calculated */}
                                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: '#e67e22' }}>
                                                                {formatNumber(realPrixParKg)}
                                                            </td>
                                                            {['decs1', 'decs2', 'decs3', 'decs4', 'decs5'].map(field => (
                                                                <td key={field} style={{ padding: '4px' }}>
                                                                    <input
                                                                        type="number" step="0.01" min="0"
                                                                        value={realRow[field]}
                                                                        onChange={e => handleRealRowChange(field, e.target.value)}
                                                                        style={{ width: '80px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ffc107', textAlign: 'right', backgroundColor: '#fffdf0' }}
                                                                        placeholder="0.00"
                                                                    />
                                                                </td>
                                                            ))}
                                                            {/* Total Déc. real */}
                                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#856404' }}>
                                                                {formatNumber(['decs1', 'decs2', 'decs3', 'decs4', 'decs5'].reduce((s, k) => s + (parseFloat(realRow[k]) || 0), 0))}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Final Totals Readonly Area */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px', marginTop: '15px' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Total Décomptes ({formatNumber(wizardTotals.totalTonnage)} KG)</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#007bff' }}>{formatNumber(wizardTotals.totalDec)} DH</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Total Charges (- Chg)</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dc3545' }}>{formatNumber(totalCharges)} DH</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Solde (Déc. - Chg)</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: wizardTotals.calculatedSolde < 0 ? '#dc3545' : '#28a745' }}>{formatNumber(wizardTotals.calculatedSolde)} DH</div>
                                                </div>
                                            </div>

                                            <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                                <button type="submit" className="save-btn" style={{ backgroundColor: isEditing ? '#ffc107' : '#28a745', color: isEditing ? 'black' : 'white' }}>
                                                    {isEditing ? 'Confirmer la Modification' : 'Enregistrer le Décompte'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PRIX ESTIMATIF MODAL */}
            {showPrixModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
                    <div className="modal-content" style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '400px', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>Prix Estimatifs ({formData.mois}/{formData.annee})</h3>
                        <p style={{ fontSize: '14px', color: '#666' }}>Saisissez le prix de chaque variété par KG.</p>
                        <form onSubmit={handleSavePrixEstimatifs}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                                {grpVars.map(grp => (
                                    <div key={grp.codgrv} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                        <label style={{ margin: 0, fontWeight: '500' }}>{grp.nomgrv}</label>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                style={{ width: '100px', padding: '5px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'right' }}
                                                value={prixEstimatifsData[grp.codgrv] !== undefined ? prixEstimatifsData[grp.codgrv] : ''}
                                                onChange={(e) => handlePrixChange(grp.codgrv, e.target.value)}
                                            />
                                            <span style={{ marginLeft: '10px', color: '#6c757d' }}>DH</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowPrixModal(false)} style={{ padding: '8px 15px', border: 'none', background: '#6c757d', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Annuler</button>
                                <button type="submit" disabled={isSavingPrix} style={{ padding: '8px 15px', border: 'none', background: '#28a745', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    {isSavingPrix ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DATA TABLE (Liste) */}
            {!showForm && (
                <div className="table-section" style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>Adhérent</th>
                                    <th>Total Décomptes</th>
                                    <th>Total Charges</th>
                                    <th>Solde (Net)</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentAvances.length > 0 ? (
                                    currentAvances.map((avance) => (
                                        <tr key={avance.id}>
                                            <td>#{avance.id}</td>
                                            <td>{formatDateForDisplay(avance.date)}</td>
                                            <td>{adherents.find(a => a.refadh === avance.refadh)?.nomadh || avance.refadh}</td>
                                            <td style={{ fontWeight: 'bold' }}>{avance.decaompteEsteme?.toFixed(2) || '0.00'} DH</td>
                                            <td style={{ color: '#dc3545' }}>{avance.ttcharges?.toFixed(2) || '0.00'} DH</td>
                                            <td style={{ fontWeight: 'bold', color: avance.ttdecompte < 0 ? '#dc3545' : '#28a745' }}>
                                                {avance.ttdecompte?.toFixed(2) || '0.00'} DH
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-buttons">
                                                    <button onClick={() => handleEditAvance(avance.id)} className="action-btn edit-btn" title="Modifier">✏️</button>
                                                    <button onClick={() => handleDeleteAvance(avance.id)} className="action-btn delete-btn" title="Supprimer">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>Aucune avance trouvée</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <span className="pagination-info">Page {currentPage} sur {totalPages} ({totalItems} éléments)</span>
                            <div className="pagination">
                                <button className="pagination-nav" onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1}>
                                    <span className="nav-arrow">«</span> Précédent
                                </button>
                                <div className="pagination-numbers">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            className={`pagination-number ${currentPage === i + 1 ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button className="pagination-nav" onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages}>
                                    Suivant <span className="nav-arrow">»</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default GestionAvancePage;
