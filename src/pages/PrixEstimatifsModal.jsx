import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import './GestionAvancePage.css'; // Reusing standard styling patterns

const PrixEstimatifsModal = ({ onClose }) => {
    // Dropdown filters
    const [annee, setAnnee] = useState(new Date().getFullYear());
    const [mois, setMois] = useState(new Date().getMonth() + 1);

    // Lookups & Prices Data
    const [grpVars, setGrpVars] = useState([]);
    const [prixInputs, setPrixInputs] = useState({});
    const [originalPrices, setOriginalPrices] = useState({});

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Load lookups on mount
    useEffect(() => {
        const fetchGrpVars = async () => {
            try {
                setIsLoading(true);
                const data = await apiGet('/api/lookup/grpvars');
                // Ensure array data
                setGrpVars(data || []);
            } catch (err) {
                console.error("Failed to load variety groups lookup", err);
                setError("Impossible de charger les groupes de variétés.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchGrpVars();
    }, []);

    // Load prices when year or month changes
    useEffect(() => {
        const fetchPrices = async () => {
            if (!annee || !mois) return;
            try {
                setIsLoading(true);
                setError(null);
                setSuccessMessage(null);

                const data = await apiGet(`/api/PrixEstimatifs/by-month?annee=${annee}&mois=${mois}`);
                
                // Map existing prices by CodGrv
                const pricesMap = {};
                if (data && Array.isArray(data)) {
                    data.forEach(p => {
                        pricesMap[p.codGrv] = p.prixEstime;
                    });
                }

                // Construct initial input state based on grpVars list
                const inputs = {};
                grpVars.forEach(gv => {
                    inputs[gv.codgrv] = pricesMap[gv.codgrv] !== undefined ? pricesMap[gv.codgrv].toString() : '';
                });

                setPrixInputs(inputs);
                setOriginalPrices(pricesMap);
            } catch (err) {
                console.error("Failed to load prices", err);
                setError("Erreur lors de la récupération des prix estimatifs.");
            } finally {
                setIsLoading(false);
            }
        };

        if (grpVars.length > 0) {
            fetchPrices();
        }
    }, [annee, mois, grpVars]);

    // Handle single row input change
    const handlePriceChange = (codgrv, val) => {
        // Allow decimals and numbers only
        if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;
        setPrixInputs(prev => ({
            ...prev,
            [codgrv]: val
        }));
    };

    // Calculate dirty rows (items changed compared to originalPrices)
    const getDirtyRows = () => {
        const dirty = [];
        grpVars.forEach(gv => {
            const inputValStr = prixInputs[gv.codgrv];
            const inputVal = inputValStr !== '' ? parseFloat(inputValStr) : 0;
            const originalVal = originalPrices[gv.codgrv] !== undefined ? originalPrices[gv.codgrv] : 0;

            if (inputVal !== originalVal || (inputValStr === '' && originalPrices[gv.codgrv] !== undefined)) {
                dirty.push({
                    codGrv: gv.codgrv,
                    nomGrv: gv.nomgrv,
                    prixEstime: inputVal
                });
            }
        });
        return dirty;
    };

    // Save All modified rows
    const handleSaveAll = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        const dirty = getDirtyRows();
        if (dirty.length === 0) {
            setSuccessMessage("Aucune modification à enregistrer.");
            return;
        }

        try {
            setIsSaving(true);

            // Execute concurrent upserts
            const savePromises = dirty.map(item => {
                return apiPost('/api/PrixEstimatifs/upsert', {
                    annee: parseInt(annee),
                    mois: parseInt(mois),
                    codGrv: item.codGrv,
                    prixEstime: item.prixEstime
                });
            });

            await Promise.all(savePromises);

            setSuccessMessage(`${dirty.length} prix estimatif(s) mis à jour avec succès !`);
            
            // Refresh prices from server
            const data = await apiGet(`/api/PrixEstimatifs/by-month?annee=${annee}&mois=${mois}`);
            const pricesMap = {};
            if (data && Array.isArray(data)) {
                data.forEach(p => {
                    pricesMap[p.codGrv] = p.prixEstime;
                });
            }

            const inputs = {};
            grpVars.forEach(gv => {
                inputs[gv.codgrv] = pricesMap[gv.codgrv] !== undefined ? pricesMap[gv.codgrv].toString() : '';
            });

            setPrixInputs(inputs);
            setOriginalPrices(pricesMap);

        } catch (err) {
            console.error("Failed to save estimated prices", err);
            setError("Une erreur s'est produite lors de l'enregistrement des prix.");
        } finally {
            setIsSaving(false);
        }
    };

    const isDirty = getDirtyRows().length > 0;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
            boxSizing: 'border-box'
        }}>
            <div className="modal-content" style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid #e2e8f0',
                boxSizing: 'border-box'
            }}>
                {/* Modal Close Button */}
                <button 
                    type="button"
                    onClick={onClose} 
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        color: '#64748b',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = '#e2e8f0';
                        e.currentTarget.style.color = '#334155';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.color = '#64748b';
                    }}
                >
                    ✕
                </button>

                {/* Modal Header */}
                <div style={{
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        💰 Gestion des Prix Estimatifs
                    </h2>
                    <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '0.875rem',
                        color: '#64748b'
                    }}>
                        Saisissez ou modifiez les prix de vente estimés pour chaque groupe de variété sur le mois sélectionné.
                    </p>
                </div>

                {/* Filters Row */}
                <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    backgroundColor: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Année</label>
                        <select 
                            value={annee} 
                            onChange={(e) => setAnnee(parseInt(e.target.value))} 
                            style={{
                                height: '40px',
                                padding: '0 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                color: '#1e293b',
                                fontSize: '0.875rem',
                                outline: 'none',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s'
                            }}
                        >
                            {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mois</label>
                        <select 
                            value={mois} 
                            onChange={(e) => setMois(parseInt(e.target.value))} 
                            style={{
                                height: '40px',
                                padding: '0 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                color: '#1e293b',
                                fontSize: '0.875rem',
                                outline: 'none',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s'
                            }}
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>
                                    {new Date(0, m - 1).toLocaleString('fr', { month: 'long' })} ({String(m).padStart(2, '0')})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Notifications */}
                {error && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: '8px',
                        color: '#b91c1c',
                        fontSize: '0.875rem',
                        marginBottom: '1.25rem',
                        fontWeight: '500'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {successMessage && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        color: '#166534',
                        fontSize: '0.875rem',
                        marginBottom: '1.25rem',
                        fontWeight: '500'
                    }}>
                        ✓ {successMessage}
                    </div>
                )}

                {/* Table Data list */}
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <LoadingSpinner />
                    </div>
                ) : (
                    <form onSubmit={handleSaveAll}>
                        <div style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '1.5rem'
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ backgroundColor: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Groupe Variété</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', width: '200px' }}>Prix Estimé (DH / KG)</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', width: '120px' }}>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grpVars.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                                Aucun groupe de variété disponible.
                                            </td>
                                        </tr>
                                    ) : (
                                        grpVars.map((gv) => {
                                            const currentValStr = prixInputs[gv.codgrv] ?? '';
                                            const currentVal = currentValStr !== '' ? parseFloat(currentValStr) : 0;
                                            const originalVal = originalPrices[gv.codgrv] !== undefined ? originalPrices[gv.codgrv] : 0;
                                            
                                            // Determine Status badge
                                            let badgeColor = '#64748b';
                                            let badgeBg = '#f1f5f9';
                                            let badgeText = 'Non défini';

                                            if (originalPrices[gv.codgrv] !== undefined) {
                                                if (currentVal === originalVal && currentValStr !== '') {
                                                    badgeColor = '#15803d';
                                                    badgeBg = '#dcfce7';
                                                    badgeText = 'Enregistré';
                                                } else {
                                                    badgeColor = '#d97706';
                                                    badgeBg = '#fef3c7';
                                                    badgeText = 'Modifié';
                                                }
                                            } else if (currentValStr !== '') {
                                                badgeColor = '#2563eb';
                                                badgeBg = '#dbeafe';
                                                badgeText = 'À Enregistrer';
                                            }

                                            return (
                                                <tr key={gv.codgrv} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                                                        {gv.nomgrv}
                                                    </td>
                                                    <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                                                        <div style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            borderRadius: '8px',
                                                            border: '1px solid #cbd5e1',
                                                            backgroundColor: 'white',
                                                            overflow: 'hidden',
                                                            height: '36px',
                                                            width: '160px',
                                                            boxSizing: 'border-box'
                                                        }}>
                                                            <input
                                                                type="text"
                                                                placeholder="0.0000"
                                                                value={currentValStr}
                                                                onChange={e => handlePriceChange(gv.codgrv, e.target.value)}
                                                                style={{
                                                                    border: 'none',
                                                                    outline: 'none',
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    padding: '0 8px',
                                                                    textAlign: 'right',
                                                                    fontSize: '0.875rem',
                                                                    color: '#1e293b'
                                                                }}
                                                            />
                                                            <span style={{
                                                                padding: '0 8px',
                                                                backgroundColor: '#f1f5f9',
                                                                borderLeft: '1px solid #cbd5e1',
                                                                height: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                color: '#64748b'
                                                            }}>
                                                                DH
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '2px 8px',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: badgeColor,
                                                            backgroundColor: badgeBg
                                                        }}>
                                                            {badgeText}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            borderTop: '1px solid #e2e8f0',
                            paddingTop: '1.25rem'
                        }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    height: '40px',
                                    padding: '0 1.25rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: 'white',
                                    color: '#475569',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                Fermer
                            </button>

                            <button
                                type="submit"
                                disabled={!isDirty || isSaving}
                                style={{
                                    height: '40px',
                                    padding: '0 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: isDirty ? '#0284c7' : '#94a3b8',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                onMouseEnter={e => {
                                    if (isDirty && !isSaving) e.currentTarget.style.backgroundColor = '#0369a1';
                                }}
                                onMouseLeave={e => {
                                    if (isDirty && !isSaving) e.currentTarget.style.backgroundColor = '#0284c7';
                                }}
                            >
                                {isSaving ? 'Enregistrement...' : 'Enregistrer Tout'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PrixEstimatifsModal;
