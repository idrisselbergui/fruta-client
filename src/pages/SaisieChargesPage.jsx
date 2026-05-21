import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { apiGet, apiPost, deleteAdherentCharge, createAdherentCharge, getAdherentCharges } from '../apiService';
import { formatDateForDisplay, formatDateForInput } from '../utils/dateUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './GestionAvancePage.css'; // Reusing the matched styling

const SaisieChargesPage = ({ isModal = false, onClose }) => {
    // Premium React Select Custom Styles to override global 48px styles and vertically center text
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            height: '40px !important',
            minHeight: '40px !important',
            borderRadius: '0.375rem',
            borderColor: state.isFocused ? '#3b82f6 !important' : '#d1d5db !important',
            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6 !important' : 'none !important',
            '&:hover': { borderColor: state.isFocused ? '#3b82f6 !important' : '#9ca3af !important' },
            backgroundColor: 'white',
            display: 'flex !important',
            alignItems: 'center !important',
            flexWrap: 'nowrap !important'
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '0 8px !important',
            display: 'flex !important',
            alignItems: 'center !important',
            height: '38px !important',
            overflow: 'hidden !important',
            marginTop: '0 !important',
            marginBottom: '0 !important',
            paddingTop: '0 !important',
            paddingBottom: '0 !important'
        }),
        singleValue: (base) => ({
            ...base,
            margin: '0 !important',
            color: '#111827 !important',
            fontSize: '0.875rem !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        placeholder: (base) => ({
            ...base,
            margin: '0 !important',
            color: '#9ca3af !important',
            fontSize: '0.875rem !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        indicatorsContainer: (base) => ({
            ...base,
            height: '38px !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        dropdownIndicator: (base) => ({
            ...base,
            padding: '0 8px !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        clearIndicator: (base) => ({
            ...base,
            padding: '0 8px !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        input: (base) => ({
            ...base,
            margin: '0 !important',
            padding: '0 !important'
        })
    };

    const modalSelectStyles = {
        control: (base, state) => ({
            ...base,
            height: '48px !important',
            minHeight: '48px !important',
            borderRadius: '0.375rem',
            borderColor: state.isFocused ? '#3b82f6 !important' : '#d1d5db !important',
            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6 !important' : 'none !important',
            '&:hover': { borderColor: state.isFocused ? '#3b82f6 !important' : '#9ca3af !important' },
            backgroundColor: 'white',
            display: 'flex !important',
            alignItems: 'center !important',
            flexWrap: 'nowrap !important'
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '0 12px !important',
            display: 'flex !important',
            alignItems: 'center !important',
            height: '46px !important',
            overflow: 'hidden !important',
            marginTop: '0 !important',
            marginBottom: '0 !important',
            paddingTop: '0 !important',
            paddingBottom: '0 !important'
        }),
        singleValue: (base) => ({
            ...base,
            margin: '0 !important',
            color: '#111827 !important',
            fontSize: '0.95rem !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        placeholder: (base) => ({
            ...base,
            margin: '0 !important',
            color: '#9ca3af !important',
            fontSize: '0.95rem !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        indicatorsContainer: (base) => ({
            ...base,
            height: '46px !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        dropdownIndicator: (base) => ({
            ...base,
            padding: '0 8px !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        clearIndicator: (base) => ({
            ...base,
            padding: '0 8px !important',
            display: 'flex !important',
            alignItems: 'center !important'
        }),
        input: (base) => ({
            ...base,
            margin: '0 !important',
            padding: '0 !important'
        })
    };

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

    const [isMontantFocused, setIsMontantFocused] = useState(false);

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

    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrintAllCharges = async () => {
        if (!formData.adherent) {
            alert('Veuillez sélectionner un adhérent pour imprimer ses charges.');
            return;
        }

        try {
            setIsPrinting(true);
            const refadh = formData.adherent.value;
            // passing null as date fetches all charges for this adherent
            const charges = await getAdherentCharges(refadh, null);

            if (!charges || charges.length === 0) {
                alert("Aucune charge trouvée pour cet adhérent.");
                return;
            }

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add logo if possible
            try {
                const pageWidth = doc.internal.pageSize.getWidth();
                doc.addImage('/diaf.png', 'PNG', pageWidth - 35, 10, 25, 25);
            } catch (error) {
                console.log('Logo not found, continuing without logo');
            }

            // Header
            doc.setFontSize(20);
            doc.text('RELEVÉ DES CHARGES', 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.text(`Adhérent : ${formData.adherent.label}`, 20, 35);
            doc.setFontSize(10);
            doc.text(`Édité le : ${formatDateForDisplay(new Date().toISOString())}`, 140, 35);

            let y = 45;

            // Prepare Table Data
            const tableData = [];
            let totalCharges = 0;

            const headerRow = ['Date', 'Charge (Label)', 'Type', 'Montant (DH)'];
            tableData.push(headerRow);

            // Sort charges generally by date ascending
            charges.sort((a, b) => new Date(a.date) - new Date(b.date));

            charges.forEach(item => {
                const chargeLabel = chargesOptions.find(c => c.value === item.idcharge)?.label || 'Inconnu';
                const type = chargeLabel.includes('-') ? chargeLabel.split('-')[1].trim() : '-';
                const label = chargeLabel.includes('-') ? chargeLabel.split('-')[0].trim() : chargeLabel;
                const montant = parseFloat(item.montant) || 0;
                totalCharges += montant;

                tableData.push([
                    formatDateForDisplay(item.date),
                    label,
                    type,
                    montant.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                ]);
            });

            autoTable(doc, {
                startY: y,
                head: [headerRow],
                body: tableData.slice(1),
                theme: 'grid',
                styles: {
                    fontSize: 10,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [66, 139, 202],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 35 },
                    3: { halign: 'right', cellWidth: 40 }
                },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 20, right: 20 }
            });

            // Footer / Total
            const finalY = doc.lastAutoTable.finalY || y;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`Total des Charges : ${totalCharges.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`, 190, finalY + 10, { align: 'right' });

            const fileName = `releve-charges-${formData.adherent.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (err) {
            console.error("Erreur génération PDF:", err);
            alert("Erreur lors de l'impression des charges.");
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="vente-ecart-page" style={isModal ? { padding: '0', minHeight: 'auto', background: 'transparent' } : {}}>
            {!isModal ? (
                <header className="page-header">
                    <div className="header-title">
                        <h1>Saisie des Charges</h1>
                        <span className="subtitle">Saisir les charges journalières par adhérent</span>
                    </div>
                </header>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>💼</div>
                    <div>
                        <h2 style={{ margin: 0, color: '#111827', fontSize: '1.35rem', fontWeight: '700' }}>Saisie des Charges</h2>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Saisir les charges journalières par adhérent</span>
                    </div>
                </div>
            )}

            {error && <div className="error-message" style={{ margin: '1rem', padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>{error} <button onClick={() => setError(null)}>X</button></div>}

            <div className="form-container" style={{ paddingBottom: '2rem' }}>
                <div className="form-section" style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderTop: '3px solid #10b981',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ margin: 0, color: '#111827', fontSize: '1.125rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span role="img" aria-label="selection" style={{ marginRight: '4px' }}>📝📝</span> Sélection et Ajout de Charges
                        </h3>
                        <button
                            type="button"
                            onClick={handlePrintAllCharges}
                            disabled={!formData.adherent || isPrinting}
                            className="print-btn-custom"
                            style={{
                                boxSizing: 'border-box',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 1.5rem',
                                background: (!formData.adherent || isPrinting) ? '#cbd5e1' : 'linear-gradient(180deg, #4b5563 0%, #374151 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontWeight: '600',
                                cursor: (!formData.adherent || isPrinting) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.875rem',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                flex: '0 0 auto',
                                width: 'auto',
                                minWidth: 'auto'
                            }}
                            onMouseEnter={(e) => { if (formData.adherent && !isPrinting) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                            onMouseLeave={(e) => { if (formData.adherent && !isPrinting) e.currentTarget.style.filter = 'none'; }}
                            title="Imprimer toutes les charges de cet adhérent"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            {isPrinting ? 'Impression...' : 'Imprimer Tout'}
                        </button>
                    </div>

                    {/* Top Row: Selection */}
                    <div className="form-row" style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb' }}>
                        <div className="input-group" style={{ flex: '1 1 50%', minWidth: '0' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adhérent <span style={{ color: '#ef4444' }}>*</span></label>
                            <Select
                                options={adherentOptions}
                                value={formData.adherent}
                                onChange={(val) => setFormData(p => ({ ...p, adherent: val }))}
                                placeholder="Sélectionner Adhérent"
                                isClearable
                                styles={selectStyles}
                            />
                        </div>
                        <div className="input-group" style={{ flex: '1 1 50%', minWidth: '0' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date <span style={{ color: '#ef4444' }}>*</span></label>
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
                        <div className="input-group" style={{ flex: '2 1 0%', minWidth: '0' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type de Charge</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <Select
                                        options={chargesOptions}
                                        value={newDetail.charge}
                                        onChange={(val) => setNewDetail(p => ({ ...p, charge: val }))}
                                        placeholder="Choisir Charge"
                                        styles={selectStyles}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowChargeModal(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '0.375rem',
                                        border: 'none',
                                        background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        flexShrink: 0
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    title="Nouveau Type de Charge"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="input-group" style={{ flex: '1 1 0%', minWidth: '0' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Montant</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                height: '40px',
                                border: isMontantFocused ? '1px solid #3b82f6' : '1px solid #d1d5db',
                                boxShadow: isMontantFocused ? '0 0 0 1px #3b82f6' : 'none',
                                borderRadius: '0.375rem',
                                backgroundColor: 'white',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.15s, box-shadow 0.15s'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 0.75rem',
                                    height: '100%',
                                    backgroundColor: '#f3f4f6',
                                    borderRight: '1px solid #d1d5db',
                                    color: '#6b7280',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    userSelect: 'none'
                                }}>
                                    DH
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newDetail.montantCharge}
                                    onChange={(e) => setNewDetail(p => ({ ...p, montantCharge: e.target.value }))}
                                    placeholder="0.00"
                                    onFocus={() => setIsMontantFocused(true)}
                                    onBlur={() => setIsMontantFocused(false)}
                                    style={{
                                        flex: 1,
                                        height: '100%',
                                        padding: '0 0.75rem',
                                        border: 'none',
                                        outline: 'none',
                                        fontSize: '0.875rem',
                                        color: '#111827',
                                        textAlign: 'right',
                                        fontVariantNumeric: 'tabular-nums',
                                        backgroundColor: 'transparent'
                                    }}
                                />
                            </div>
                        </div>
                        <div className="input-group" style={{ flex: '0 0 auto' }}>
                            <button
                                type="button"
                                onClick={handleAddCharge}
                                style={{
                                    boxSizing: 'border-box',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 1.5rem',
                                    backgroundColor: '#0ea5e9',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0284c7'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0ea5e9'; }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
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
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charge (Label)</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Montant Charge</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Action</th>
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
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#6b7280',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            margin: '0 auto'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                        title="Supprimer"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
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
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: 'white',
                        padding: '2.5rem 2.25rem',
                        borderRadius: '0.75rem',
                        width: '520px',
                        minHeight: '440px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #f3f4f6'
                    }}>
                        <div className="modal-header" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '2rem',
                            borderBottom: '1px solid #f3f4f6',
                            paddingBottom: '0.875rem'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, color: '#111827', fontSize: '1.45rem', fontWeight: '750' }}>Nouveau Type de Charge</h2>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Ajouter une nouvelle catégorie de charge</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowChargeModal(false)}
                                style={{
                                    background: '#f3f4f6',
                                    border: 'none',
                                    borderRadius: '50%',
                                    fontSize: '1.25rem',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: '0',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleCreateNewChargeType} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div className="form-row" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '2.25rem' }}>
                                <div className="input-group" style={{ width: '100%' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Label Charge <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newChargeData.label}
                                        onChange={(e) => setNewChargeData(p => ({ ...p, label: e.target.value }))}
                                        required
                                        placeholder="Ex: Achat Caisses, Transport adherent..."
                                        style={{
                                            width: '100%',
                                            height: '48px',
                                            padding: '0 1rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.95rem',
                                            color: '#111827',
                                            boxSizing: 'border-box',
                                            outline: 'none',
                                            transition: 'border-color 0.15s, box-shadow 0.15s'
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                                <div className="input-group" style={{ width: '100%' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Type de Charge <span style={{ color: '#ef4444' }}>*</span>
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
                                        placeholder="Sélectionner Type"
                                        isClearable
                                        styles={modalSelectStyles}
                                    />
                                </div>
                            </div>
                            <div className="form-actions" style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '14px',
                                borderTop: '1px solid #f3f4f6',
                                paddingTop: '1.5rem',
                                marginTop: 'auto'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowChargeModal(false)}
                                    style={{
                                        height: '48px',
                                        padding: '0 2rem',
                                        backgroundColor: 'white',
                                        color: '#4b5563',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        height: '48px',
                                        padding: '0 2rem',
                                        background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                                >
                                    Créer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaisieChargesPage;
