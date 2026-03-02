import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { apiGet, apiPost, deleteAdherentCharge, createAdherentCharge, getAdherentCharges } from '../apiService';
import { formatDateForDisplay, formatDateForInput } from '../utils/dateUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import './GestionAvancePage.css'; // Reusing the matched styling

const SaisieChargesPage = () => {
    // Lookups
    const [adherents, setAdherents] = useState([]);
    const [chargesOptions, setChargesOptions] = useState([]);

    // Main Data
    const [savedCharges, setSavedCharges] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        adherent: null,
        date: new Date().toISOString().split('T')[0]
    });

    const [newDetail, setNewDetail] = useState({
        charge: null,
        montantCharge: ''
    });

    // New Charge Modal
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [newChargeData, setNewChargeData] = useState({ label: '', typecharge: '' });

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [adherentData, chargesData] = await Promise.all([
                    apiGet('/api/lookup/adherents'),
                    apiGet('/api/charges').catch(() => []),
                ]);

                setAdherents(adherentData);
                setChargesOptions(chargesData.map(c => ({
                    value: c.idcharge,
                    label: c.typecharge ? `${c.label} - ${c.typecharge}` : c.label
                })));
            } catch (err) {
                console.error("Failed to fetch lookups", err);
                setError('Failed to fetch data.');
            }
        };
        fetchLookups();
    }, []);

    const adherentOptions = adherents.map(a => ({ value: a.refadh, label: a.nomadh }));

    // Fetch existing charges when adherent or date changes
    useEffect(() => {
        const loadCharges = async () => {
            if (!formData.adherent || !formData.date) {
                setSavedCharges([]);
                return;
            }
            setIsLoading(true);
            try {
                const results = await getAdherentCharges(formData.adherent.value, formData.date);
                setSavedCharges(results || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load existing charges');
            } finally {
                setIsLoading(false);
            }
        };
        loadCharges();
    }, [formData.adherent, formData.date]);

    const handleAddCharge = async () => {
        if (!formData.adherent || !formData.date || !newDetail.charge || !newDetail.montantCharge) {
            alert('Veuillez sélectionner un adhérent, une date, une charge et un montant.');
            return;
        }

        try {
            const chargePayload = {
                refadh: formData.adherent.value,
                date: formData.date,
                idcharge: newDetail.charge.value,
                montant: parseFloat(newDetail.montantCharge)
            };
            const response = await createAdherentCharge(chargePayload);
            setSavedCharges(prev => [...prev, response]);
            setNewDetail({ charge: null, montantCharge: '' });
        } catch (err) {
            alert("Erreur: " + err.message);
        }
    };

    const handleDeleteCharge = async (id) => {
        if (!window.confirm("Supprimer cette charge ?")) return;
        try {
            await deleteAdherentCharge(id);
            setSavedCharges(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert("Erreur: " + err.message);
        }
    };

    const handleCreateNewChargeType = async (e) => {
        e.preventDefault();

        if (!newChargeData.typecharge || newChargeData.typecharge.trim() === '') {
            alert("Veuillez sélectionner un Type de Charge.");
            return;
        }

        try {
            const response = await apiPost('/api/charges', newChargeData);
            const updatedCharges = await apiGet('/api/charges');
            setChargesOptions(updatedCharges.map(c => ({
                value: c.idcharge,
                label: c.typecharge ? `${c.label} - ${c.typecharge}` : c.label
            })));
            setNewDetail(prev => ({
                ...prev,
                charge: {
                    value: response.idcharge,
                    label: response.typecharge ? `${response.label} - ${response.typecharge}` : response.label
                }
            }));
            setShowChargeModal(false);
            setNewChargeData({ label: '', typecharge: '' });
        } catch (err) {
            alert("Erreur: " + err.message);
        }
    };

    return (
        <div className="vente-ecart-page">
            <header className="page-header">
                <div className="header-title">
                    <h1>Saisie des Charges</h1>
                    <span className="subtitle">Saisir les charges journalières par adhérent</span>
                </div>
            </header>

            {error && <div className="error-message" style={{ margin: '1rem', padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>{error} <button onClick={() => setError(null)}>X</button></div>}

            <div className="form-container" style={{ paddingBottom: '2rem' }}>
                <div className="form-section" style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: '#111827', fontSize: '1.125rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><span role="img" aria-label="selection">📝</span> Sélection et Ajout de Charges</h3>

                    {/* Top Row: Selection */}
                    <div className="form-row" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb' }}>
                        <div className="input-group" style={{ flex: '1 1 300px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Adhérent <span style={{ color: '#ef4444' }}>*</span></label>
                            <Select
                                options={adherentOptions}
                                value={formData.adherent}
                                onChange={(val) => setFormData(p => ({ ...p, adherent: val }))}
                                placeholder="Sélectionner Adhérent"
                                isClearable
                                styles={{
                                    control: (base) => ({ ...base, minHeight: '40px', height: '40px', borderRadius: '0.375rem', borderColor: '#d1d5db', boxShadow: 'none', '&:hover': { borderColor: '#9ca3af' } }),
                                    valueContainer: (base) => ({ ...base, height: '40px', padding: '0 8px' }),
                                    indicatorsContainer: (base) => ({ ...base, height: '40px' })
                                }}
                            />
                        </div>
                        <div className="input-group" style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Date <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                                style={{ width: '100%', height: '40px', padding: '0 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#111827', boxSizing: 'border-box', outline: 'none' }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                    </div>

                    {/* Bottom Row: Ajouter */}
                    <div className="form-row" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="input-group" style={{ flex: '1 1 400px', minWidth: '300px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Type de Charge</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', height: '40px' }}>
                                <div style={{ flex: 1, minHeight: '40px', height: '40px' }}>
                                    <Select
                                        options={chargesOptions}
                                        value={newDetail.charge}
                                        onChange={(val) => setNewDetail(p => ({ ...p, charge: val }))}
                                        placeholder="Choisir Charge"
                                        styles={{
                                            control: (base) => ({ ...base, minHeight: '40px', height: '40px', borderRadius: '0.375rem', borderColor: '#d1d5db', boxShadow: 'none', '&:hover': { borderColor: '#9ca3af' } }),
                                            valueContainer: (base) => ({ ...base, height: '40px', padding: '0 8px' }),
                                            indicatorsContainer: (base) => ({ ...base, height: '40px' })
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowChargeModal(true)}
                                    style={{
                                        boxSizing: 'border-box',
                                        width: '40px',
                                        height: '40px',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '0.375rem',
                                        flexShrink: 0,
                                        backgroundColor: '#f3f4f6',
                                        border: '1px solid #d1d5db',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                                    title="Nouveau Type de Charge"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="input-group" style={{ flex: '0 1 150px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Montant</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newDetail.montantCharge}
                                onChange={(e) => setNewDetail(p => ({ ...p, montantCharge: e.target.value }))}
                                placeholder="0.00"
                                style={{ width: '100%', height: '40px', padding: '0 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#111827', boxSizing: 'border-box', outline: 'none', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563', marginBottom: '0.5rem' }}>&nbsp;</label>
                            <button
                                type="button"
                                onClick={handleAddCharge}
                                style={{ boxSizing: 'border-box', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: '500', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Ajouter
                            </button>
                        </div>
                    </div>

                    <div className="table-container" style={{ marginTop: '1.5rem' }}>
                        {isLoading ? (
                            <LoadingSpinner />
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Charge (Label)</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Montant Charge</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151', width: '80px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedCharges.length > 0 ? savedCharges.map((item) => {
                                        const chargeLabel = chargesOptions.find(c => c.value === item.idcharge)?.label || 'Inconnu';
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>{chargeLabel}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '500', color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(item.montant).toFixed(2)}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCharge(item.id)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', borderRadius: '4px' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                        title="Supprimer"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', fontStyle: 'italic', color: '#6b7280', fontSize: '0.875rem' }}>
                                                {!formData.adherent ? "Veuillez sélectionner un adhérent." : "Aucune charge ajoutée pour cette date."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                        <div style={{ marginTop: '1.25rem', paddingRight: '1rem', textAlign: 'right', fontSize: '1.125rem', fontWeight: '600', color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                            Total : {savedCharges.reduce((sum, item) => sum + (parseFloat(item.montant) || 0), 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for creating a new Charge type */}
            {showChargeModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2.5rem 2rem', borderRadius: '8px', width: '400px', minHeight: '400px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
                            <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>Nouvelle Charge</h2>
                            <button type="button" onClick={() => setShowChargeModal(false)} style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '1.25rem', color: '#6c757d', cursor: 'pointer', padding: '0', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#dc3545'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.color = '#6c757d'; }}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateNewChargeType} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div className="form-row" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="input-group" style={{ width: '100%' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#495057', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Label Charge <span style={{ color: '#dc3545' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newChargeData.label}
                                        onChange={(e) => setNewChargeData(p => ({ ...p, label: e.target.value }))}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem', color: '#495057', backgroundColor: '#f8f9fa', transition: 'border-color 0.15s ease-in-out', boxSizing: 'border-box' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#80bdff'; e.target.style.outline = '0'; e.target.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#ced4da'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                                <div className="input-group" style={{ width: '100%' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#495057', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Type de Charge <span style={{ color: '#dc3545' }}>*</span>
                                    </label>
                                    <Select
                                        options={[
                                            { value: 'Avance', label: 'Avance' },
                                            { value: 'Emballage', label: 'Emballage' },
                                            { value: 'Transport', label: 'Transport' },
                                            { value: 'Main d\'oeuvre', label: 'Main d\'oeuvre' },
                                            { value: 'Carburant', label: 'Carburant' },
                                            { value: 'Pesticides/Engrais', label: 'Pesticides/Engrais' },
                                            { value: 'Entretien', label: 'Entretien' },
                                            { value: 'Autre', label: 'Autre' }
                                        ]}
                                        value={newChargeData.typecharge ? { value: newChargeData.typecharge, label: newChargeData.typecharge } : null}
                                        onChange={(val) => setNewChargeData(p => ({ ...p, typecharge: val ? val.value : '' }))}
                                        placeholder="Optionnel"
                                        isClearable
                                        styles={{
                                            control: (base, state) => ({
                                                ...base,
                                                minHeight: '42px',
                                                borderRadius: '4px',
                                                borderColor: state.isFocused ? '#80bdff' : '#ced4da',
                                                boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(0,123,255,.25)' : 'none',
                                                '&:hover': { borderColor: state.isFocused ? '#80bdff' : '#adb5bd' },
                                                backgroundColor: '#f8f9fa'
                                            }),
                                            valueContainer: (base) => ({ ...base, padding: '2px 12px' }),
                                            placeholder: (base) => ({ ...base, color: '#6c757d' })
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                                <button type="button" className="cancel-btn" onClick={() => setShowChargeModal(false)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', flex: '1', transition: 'background-color 0.2s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#5a6268'; }} onMouseLeave={(e) => { e.target.style.backgroundColor = '#6c757d'; }}>Annuler</button>
                                <button type="submit" className="save-btn" style={{ backgroundColor: '#20c997', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', flex: '1', transition: 'background-color 0.2s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#1ba87e'; }} onMouseLeave={(e) => { e.target.style.backgroundColor = '#20c997'; }}>Créer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaisieChargesPage;
