import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { apiGet, apiPost, apiPut, apiDelete, getChargeSum } from '../apiService';
import { formatDateForDisplay, formatDateForInput } from '../utils/dateUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import './GestionAvancePage.css';

const GestionAvancePage = () => {
    const navigate = useNavigate();
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
    const [loadingEditId, setLoadingEditId] = useState(null);
    const [savedRealValues, setSavedRealValues] = useState(null);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const [wizardDetails, setWizardDetails] = useState([]);
    const [isCalculating, setIsCalculating] = useState(false);

    // Pagination/Search
    const [searchAvances, setSearchAvances] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

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

    // Editable rows — one per variety group, pre-filled from wizardDetails
    const [editableRows, setEditableRows] = useState([]);

    const handleEditableRowChange = (idx, field, value) => {
        setEditableRows(prev => prev.map((r, i) => {
            if (i !== idx) return r;
            const newRow = { ...r, [field]: value };
            
            // Recalculate prixEstime as average of per-week prices: Σ(decSx / tonnageSx) / count of weeks with tonnage
            const weeks = [
                { dec: parseFloat(newRow.decs1) || 0, ton: parseFloat(newRow.ts1) || 0 },
                { dec: parseFloat(newRow.decs2) || 0, ton: parseFloat(newRow.ts2) || 0 },
                { dec: parseFloat(newRow.decs3) || 0, ton: parseFloat(newRow.ts3) || 0 },
                { dec: parseFloat(newRow.decs4) || 0, ton: parseFloat(newRow.ts4) || 0 },
                { dec: parseFloat(newRow.decs5) || 0, ton: parseFloat(newRow.ts5) || 0 },
            ];
            const validWeeks = weeks.filter(w => w.ton > 0);
            newRow.prixEstime = validWeeks.length > 0
                ? validWeeks.reduce((sum, w) => sum + (w.dec / w.ton), 0) / validWeeks.length
                : 0;
            
            return newRow;
        }));
    };

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

    // Wizard Totals — computed from editable rows
    const wizardTotals = useMemo(() => {
        const n = (v) => parseFloat(v) || 0;
        let tDecS1 = 0, tDecS2 = 0, tDecS3 = 0, tDecS4 = 0, tDecS5 = 0;
        let tTonnageS1 = 0, tTonnageS2 = 0, tTonnageS3 = 0, tTonnageS4 = 0, tTonnageS5 = 0;

        editableRows.forEach(row => {
            tTonnageS1 += n(row.ts1); tTonnageS2 += n(row.ts2); tTonnageS3 += n(row.ts3);
            tTonnageS4 += n(row.ts4); tTonnageS5 += n(row.ts5);
            tDecS1 += n(row.decs1); tDecS2 += n(row.decs2); tDecS3 += n(row.decs3);
            tDecS4 += n(row.decs4); tDecS5 += n(row.decs5);
        });

        const totalTonnage = tTonnageS1 + tTonnageS2 + tTonnageS3 + tTonnageS4 + tTonnageS5;
        const totalDec = tDecS1 + tDecS2 + tDecS3 + tDecS4 + tDecS5;
        const calculatedSolde = totalDec - totalCharges;

        return {
            tTonnageS1, tTonnageS2, tTonnageS3, tTonnageS4, tTonnageS5, totalTonnage,
            tDecS1, tDecS2, tDecS3, tDecS4, tDecS5, totalDec,
            calculatedSolde
        };
    }, [editableRows, totalCharges]);

    // Format numbers
    const formatNumber = (num) => {
        return num && !isNaN(num) ? num.toFixed(2) : "0.00";
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

            setWizardDetails(data || []);

            // Pre-populate editable rows from wizardDetails — always use fresh export data
            // codGrv is now carried so we can save it in the details array
            if (data && data.length > 0) {
                const fmt = (v) => v > 0 ? parseFloat(v.toFixed(4)) : 0;
                setEditableRows(data.map(row => ({
                    codGrv: row.codGrv,
                    nomGrv: row.nomGrv,
                    ts1: fmt(row.tonnageS1), ts2: fmt(row.tonnageS2),
                    ts3: fmt(row.tonnageS3), ts4: fmt(row.tonnageS4),
                    ts5: fmt(row.tonnageS5 || 0),
                    prixEstime: fmt(row.prixEstime || 0),
                    decs1: fmt(row.tonnageS1 * row.prixEstime),
                    decs2: fmt(row.tonnageS2 * row.prixEstime),
                    decs3: fmt(row.tonnageS3 * row.prixEstime),
                    decs4: fmt(row.tonnageS4 * row.prixEstime),
                    decs5: fmt((row.tonnageS5 || 0) * row.prixEstime),
                })));
            } else {
                setEditableRows([]);
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
                prixEstemeMois: wizardTotals.totalTonnage > 0
                    ? wizardTotals.totalDec / wizardTotals.totalTonnage
                    : 0,
                decaompteEsteme: wizardTotals.totalDec,
                s1: wizardTotals.tTonnageS1,
                s2: wizardTotals.tTonnageS2,
                s3: wizardTotals.tTonnageS3,
                s4: wizardTotals.tTonnageS4,
                s5: wizardTotals.tTonnageS5,
                realTS1: wizardTotals.tTonnageS1,
                realTS2: wizardTotals.tTonnageS2,
                realTS3: wizardTotals.tTonnageS3,
                realTS4: wizardTotals.tTonnageS4,
                realTS5: wizardTotals.tTonnageS5,
                realDecS1: wizardTotals.tDecS1,
                realDecS2: wizardTotals.tDecS2,
                realDecS3: wizardTotals.tDecS3,
                realDecS4: wizardTotals.tDecS4,
                realDecS5: wizardTotals.tDecS5,
                montant: wizardTotals.totalDec,
                // Save per-variety detail rows so Edit can load them accurately
                details: editableRows.map(row => ({
                    codGrv: row.codGrv || 0,
                    nomGrv: row.nomGrv || '',
                    prixEstime: parseFloat(row.prixEstime) || 0,
                    tS1: parseFloat(row.ts1) || 0,
                    tS2: parseFloat(row.ts2) || 0,
                    tS3: parseFloat(row.ts3) || 0,
                    tS4: parseFloat(row.ts4) || 0,
                    tS5: parseFloat(row.ts5) || 0,
                    decS1: parseFloat(row.decs1) || 0,
                    decS2: parseFloat(row.decs2) || 0,
                    decS3: parseFloat(row.decs3) || 0,
                    decS4: parseFloat(row.decs4) || 0,
                    decS5: parseFloat(row.decs5) || 0,
                }))
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
        setLoadingEditId(id);
        try {
            const data = await apiGet(`/api/gestionavances/${id}`);
            const { avance } = data;

            const matchedAdherent = adherentOptions.find(a => a.value === avance.refadh)
                || (avance.refadh ? { value: avance.refadh, label: `Adhérent #${avance.refadh}` } : null);

            setFormData({
                adherent: matchedAdherent,
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

            // Preserve the saved total charges snapshot
            setTotalCharges(avance.ttcharges || 0);

            // If detail rows were saved, load them directly — no averaging needed
            if (avance.details && avance.details.length > 0) {
                setEditableRows(avance.details.map(d => {
                    // Use saved price if present; for old records (prix_estime=0), compute from the correct formula
                    const computedPrix = (() => {
                        if (d.prixEstime > 0) return d.prixEstime;
                        const weeks = [
                            { dec: d.decS1, ton: d.tS1 }, { dec: d.decS2, ton: d.tS2 },
                            { dec: d.decS3, ton: d.tS3 }, { dec: d.decS4, ton: d.tS4 },
                            { dec: d.decS5, ton: d.tS5 },
                        ];
                        const valid = weeks.filter(w => w.ton > 0);
                        return valid.length > 0 ? valid.reduce((s, w) => s + w.dec / w.ton, 0) / valid.length : 0;
                    })();
                    return {
                        codGrv: d.codGrv,
                        nomGrv: d.nomGrv,
                        ts1: d.tS1, ts2: d.tS2, ts3: d.tS3, ts4: d.tS4, ts5: d.tS5,
                        prixEstime: computedPrix,
                        decs1: d.decS1, decs2: d.decS2, decs3: d.decS3, decs4: d.decS4, decs5: d.decS5,
                    };
                }));
                // Jump straight to Step 2 since we already have the detail data
                setCurrentStep(2);
            } else {
                // Legacy records without details — fall back to wizard (Step 1)
                setSavedRealValues({
                    realTS1: avance.realTS1, realTS2: avance.realTS2,
                    realTS3: avance.realTS3, realTS4: avance.realTS4, realTS5: avance.realTS5,
                    realDecS1: avance.realDecS1, realDecS2: avance.realDecS2,
                    realDecS3: avance.realDecS3, realDecS4: avance.realDecS4, realDecS5: avance.realDecS5,
                });
                setCurrentStep(1);
            }

            setIsEditing(true);
            setEditingAvanceId(id);
            setIsViewing(false);
            setShowForm(true);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingEditId(null);
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
        setEditableRows([]);
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
        setSavedRealValues(null);
    };

    // Filter and Pagination
    const filteredAvances = useMemo(() => {
        if (!searchAvances.trim()) return avances;
        const searchTerm = searchAvances.toLowerCase();
        return avances.filter(a => {
            const adherentName = adherents.find(ad => ad.refadh === a.refadh)?.nomadh || '';
            const moisAnnee = a.mois != null && a.annee != null
                ? `${String(a.mois).padStart(2, '0')}/${a.annee}`
                : '';
            return (
                a.id?.toString().toLowerCase().includes(searchTerm) ||
                formatDateForDisplay(a.date).toLowerCase().includes(searchTerm) ||
                adherentName.toLowerCase().includes(searchTerm) ||
                moisAnnee.includes(searchTerm) ||
                a.montant?.toString().toLowerCase().includes(searchTerm)
            );
        });
    }, [avances, searchAvances, adherents]);

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
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" className="ve-create-btn" onClick={() => setShowForm(true)}>
                                    + Créer un Décompte
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/rapport-annuel')}
                                    style={{
                                        padding: '0.5rem 1.2rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        backgroundColor: '#6f42c1',
                                        color: '#fff',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5a32a3'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6f42c1'}
                                >
                                    🖨️ Rapport Annuel
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchAvances}
                                onChange={(e) => { setSearchAvances(e.target.value); setCurrentPage(1); }}
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
                                                        {editableRows.length === 0 && (
                                                            <tr>
                                                                <td colSpan="13" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                                                    Aucune donnée d'export trouvée pour ce mois/année.
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {editableRows.map((row, idx) => {
                                                            const rowDec = (parseFloat(row.decs1) || 0) + (parseFloat(row.decs2) || 0) + (parseFloat(row.decs3) || 0) + (parseFloat(row.decs4) || 0) + (parseFloat(row.decs5) || 0);
                                                            return (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                                                    <td style={{ padding: '6px 8px', fontWeight: '600', color: '#2c3e50', whiteSpace: 'nowrap' }}>
                                                                        {row.nomGrv}
                                                                    </td>
                                                                    {['ts1', 'ts2', 'ts3', 'ts4', 'ts5'].map(field => (
                                                                        <td key={field} style={{ padding: '3px' }}>
                                                                            <input
                                                                                type="number" step="0.01" min="0"
                                                                                value={row[field]}
                                                                                onChange={e => handleEditableRowChange(idx, field, e.target.value)}
                                                                                style={{ width: '80px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'right', backgroundColor: '#fff' }}
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                    <td style={{ padding: '3px' }}>
                                                                        <input
                                                                            type="number" step="0.01" min="0"
                                                                            value={row.prixEstime ? Number(row.prixEstime).toFixed(4) : ''}
                                                                            readOnly
                                                                            style={{ width: '80px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'right', backgroundColor: '#e9ecef', color: '#6c757d' }}
                                                                        />
                                                                    </td>
                                                                    {['decs1', 'decs2', 'decs3', 'decs4', 'decs5'].map(field => (
                                                                        <td key={field} style={{ padding: '3px' }}>
                                                                            <input
                                                                                type="number" step="0.01" min="0"
                                                                                value={row[field] ?? ''}
                                                                                onChange={e => handleEditableRowChange(idx, field, e.target.value)}
                                                                                style={{ width: '80px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'right', backgroundColor: '#fff' }}
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                                                                        {formatNumber(rowDec)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
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

            {/* DATA TABLE (Liste) */}
            {!showForm && (
                <div className="table-section" style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>Mois/Année</th>
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
                                            <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                                {avance.mois != null && avance.annee != null
                                                    ? `${String(avance.mois).padStart(2, '0')}/${avance.annee}`
                                                    : '-'}
                                            </td>
                                            <td>{adherents.find(a => a.refadh === avance.refadh)?.nomadh || avance.refadh}</td>
                                            <td style={{ fontWeight: 'bold' }}>{avance.decaompteEsteme?.toFixed(2) || '0.00'} DH</td>
                                            <td style={{ color: '#dc3545' }}>{avance.ttcharges?.toFixed(2) || '0.00'} DH</td>
                                            <td style={{ fontWeight: 'bold', color: avance.ttdecompte < 0 ? '#dc3545' : '#28a745' }}>
                                                {avance.ttdecompte?.toFixed(2) || '0.00'} DH
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-buttons">
                                                    <button onClick={() => handleEditAvance(avance.id)} className="action-btn edit-btn" title="Modifier" disabled={loadingEditId === avance.id}>
                                                        {loadingEditId === avance.id ? '⏳' : '✏️'}
                                                    </button>
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
                    {totalItems > 0 && (
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
