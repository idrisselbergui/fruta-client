import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { apiGet } from '../apiService';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const fmt = (v) => {
    if (!v || v === 0) return '-';
    return parseFloat(v).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ROW_COLORS = {
    chargeAvance: '#cfe2f3',   // light blue
    chargeOther: '#d9ead3',   // light green
    decompte: '#d9ead3',   // light green
    semaine: '#fff2cc',   // light yellow
    resultat: '#f4cccc',   // light red/pink
    export: '#e2efda',   // pale green
    section_header: '#2c3e50',
};

const GestionAvanceYearlyPrint = () => {
    const [adherents, setAdherents] = useState([]);
    const [selectedAdherent, setSelectedAdherent] = useState(null);
    const [campagneDates, setCampagneDates] = useState(null); // { startDate, endDate } from entreprise
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        Promise.all([
            apiGet('/api/lookup/adherents'),
            apiGet('/api/lookup/campagne-dates')
        ]).then(([adherentData, campData]) => {
            setAdherents((adherentData || []).map(a => ({ value: a.refadh, label: a.nomadh })));
            if (campData?.startDate) setCampagneDates(campData);
        }).catch(() => { });
    }, []);

    const loadReport = async () => {
        if (!selectedAdherent) { setError('Veuillez sélectionner un adhérent.'); return; }
        if (!campagneDates) { setError('Dates de campagne non disponibles.'); return; }
        setError(null);
        setLoading(true);
        try {
            const data = await apiGet('/api/gestionavances/yearly-report', {
                refadh: selectedAdherent.value,
                dateDebut: campagneDates.startDate,
                dateFin: campagneDates.endDate
            });
            setReportData(data);
        } catch (e) {
            setError(e.message || 'Erreur chargement rapport.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const win = window.open('', '_blank', 'width=1200,height=800');
        win.document.write(`
            <html>
            <head>
                <title>Rapport Annuel - ${reportData?.adherentName || ''}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; padding: 8px; font-family: Arial, sans-serif; }
                    .no-print { display: none !important; }
                    colgroup { display: none !important; }
                    table {
                        border-collapse: collapse !important;
                        table-layout: auto !important;
                        width: 100% !important;
                        font-size: 8pt !important;
                    }
                    table th, table td {
                        padding: 3px 5px !important;
                        white-space: nowrap !important;
                    }
                    div[style*="overflow"] {
                        overflow: visible !important;
                    }
                    @media print {
                        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        @page { size: A4 landscape; margin: 6mm; }
                        table { font-size: 7pt !important; }
                        table th, table td { padding: 2px 3px !important; }
                    }
                </style>
            </head>
            <body>${content.innerHTML}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
    };

    // Total per row across all months
    const monthTotal = (field) =>
        (reportData?.months || []).reduce((s, m) => s + (m[field] || 0), 0);
    const chargeTotal = (type) =>
        (reportData?.months || []).reduce((s, m) => s + (m.chargesByType?.[type] || 0), 0);

    const selectStyle = {
        control: (b) => ({ ...b, minHeight: '36px', height: '36px', fontSize: '0.875rem', borderColor: '#d1d5db' }),
        valueContainer: (b) => ({ ...b, height: '36px', padding: '0 8px' }),
        indicatorsContainer: (b) => ({ ...b, height: '36px' }),
    };

    const thStyle = {
        padding: '6px 8px', border: '1px solid #999', backgroundColor: '#2c3e50',
        color: 'white', fontSize: '0.7rem', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap'
    };
    const labelStyle = (bg) => ({
        padding: '5px 8px', border: '1px solid #aaa', backgroundColor: bg || '#fff',
        fontSize: '0.72rem', fontWeight: '600', whiteSpace: 'nowrap', textAlign: 'left'
    });
    const cellStyle = (bg) => ({
        padding: '5px 8px', border: '1px solid #aaa', backgroundColor: bg || '#fff',
        fontSize: '0.72rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums'
    });
    const totalStyle = (bg) => ({
        ...cellStyle(bg), fontWeight: '700', backgroundColor: bg ? bg : '#f0f0f0'
    });

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            {/* Print CSS */}
            <style>{`
                @media print {
                    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-area {
                        width: 100% !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .print-area > div { overflow: visible !important; }
                    .print-area table {
                        table-layout: auto !important;
                        width: 100% !important;
                        font-size: 7pt !important;
                    }
                    .print-area table th,
                    .print-area table td {
                        padding: 3px 4px !important;
                        white-space: nowrap !important;
                    }
                    .print-area colgroup { display: none !important; }
                    @page { size: A4 landscape; margin: 6mm; }
                }
            `}</style>

            {/* Controls — hidden on print */}
            <div className="no-print" style={{
                padding: '20px 30px', background: 'white', borderBottom: '2px solid #e5e7eb',
                display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap'
            }}>
                <div style={{ fontWeight: '700', fontSize: '1.2rem', color: '#2c3e50', marginRight: '8px' }}>
                    📊 Rapport Annuel Décompte
                </div>
                <div style={{ flex: '1 1 260px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>ADHÉRENT</label>
                    <Select options={adherents} value={selectedAdherent}
                        onChange={setSelectedAdherent} placeholder="Sélectionner..." styles={selectStyle} isClearable />
                </div>
                {campagneDates && (
                    <div style={{ fontSize: '0.8rem', color: '#555', alignSelf: 'center', padding: '4px 12px', background: '#f0f4f8', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                        📅 Campagne : {new Date(campagneDates.startDate).toLocaleDateString('fr-FR')} → {new Date(campagneDates.endDate).toLocaleDateString('fr-FR')}
                    </div>
                )}
                <button onClick={loadReport} disabled={loading}
                    style={{ height: '36px', padding: '0 20px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}>
                    {loading ? '⏳ Chargement...' : '🔎 Générer'}
                </button>
                {reportData && (
                    <button onClick={handlePrint}
                        style={{ height: '36px', padding: '0 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}>
                        🖨️ Imprimer
                    </button>
                )}
                {error && <span style={{ color: '#c0392b', fontSize: '0.85rem' }}>⚠️ {error}</span>}
            </div>

            {/* Print Document */}
            {reportData && (
                <div className="print-area" ref={printRef} style={{ padding: '16px 20px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2c3e50' }}>
                                DÉCOMPTE ANNUEL — {reportData.adherentName}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Campagne : {reportData.dateDebut} → {reportData.dateFin}
                            </div>
                        </div>
                        <div className="no-print" style={{ fontSize: '0.75rem', color: '#999' }}>
                            Imprimé le {new Date().toLocaleDateString('fr-FR')}
                        </div>
                    </div>

                    {/* Main Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '140px' }} />
                                {reportData.months.map((m, i) => <col key={i} style={{ width: '80px' }} />)}
                                <col style={{ width: '90px' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={thStyle}>DÉSIGNATION</th>
                                    {reportData.months.map((m, i) => (
                                        <th key={i} style={{
                                            ...thStyle,
                                            backgroundColor: m.isEstimated ? '#4a6741' : '#2c3e50'
                                        }}>
                                            {MONTH_NAMES[m.mois - 1]}<br />
                                            {m.annee}
                                            {m.isEstimated && (
                                                <div style={{ fontSize: '0.6rem', fontWeight: '400', opacity: 0.85 }}>
                                                    (Est.)
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                    <th style={{ ...thStyle, backgroundColor: '#1a252f' }}>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* ── CHARGES BY TYPE ── */}
                                {(reportData.chargeTypes || []).map((type) => (
                                    <tr key={type}>
                                        <td style={labelStyle(type.toLowerCase().includes('avance') ? ROW_COLORS.chargeAvance : ROW_COLORS.chargeOther)}>
                                            {type.toUpperCase()}
                                        </td>
                                        {reportData.months.map((m, i) => (
                                            <td key={i} style={cellStyle(type.toLowerCase().includes('avance') ? ROW_COLORS.chargeAvance : ROW_COLORS.chargeOther)}>
                                                {fmt(m.chargesByType?.[type])}
                                            </td>
                                        ))}
                                        <td style={totalStyle(type.toLowerCase().includes('avance') ? '#b8d4e8' : '#c6dfc0')}>
                                            {fmt(chargeTotal(type))}
                                        </td>
                                    </tr>
                                ))}

                                {/* ── AUTRES CHARGES (total all types) ── */}
                                <tr style={{ backgroundColor: '#f4f4f4' }}>
                                    <td style={labelStyle('#eeeeee')}><strong>TOTAL CHARGES</strong></td>
                                    {reportData.months.map((m, i) => (
                                        <td key={i} style={{ ...cellStyle('#eeeeee'), fontWeight: '700' }}>{fmt(m.totalCharges)}</td>
                                    ))}
                                    <td style={totalStyle('#d0d0d0')}>{fmt(monthTotal('totalCharges'))}</td>
                                </tr>

                                {/* Spacer */}
                                <tr><td colSpan={(reportData.months?.length || 0) + 2} style={{ height: '4px', backgroundColor: '#ccc', border: 'none' }} /></tr>

                                {/* ── DÉCOMPTE DE MOIS ── */}
                                <tr>
                                    <td style={labelStyle(ROW_COLORS.decompte)}>DÉCOMPTE DE MOIS</td>
                                    {reportData.months.map((m, i) => (
                                        <td key={i} style={cellStyle(ROW_COLORS.decompte)}>{fmt(m.decompte)}</td>
                                    ))}
                                    <td style={totalStyle('#b8d4bb')}>{fmt(monthTotal('decompte'))}</td>
                                </tr>

                                {/* ── SEMAINES S1–S5 (DH) ── */}
                                {['realDecS1', 'realDecS2', 'realDecS3', 'realDecS4', 'realDecS5'].map((field, si) => {
                                    const flagKey = `isRealDecS${si + 1}`;
                                    return (
                                        <tr key={field}>
                                            <td style={labelStyle(ROW_COLORS.semaine)}>S{si + 1} (DH)</td>
                                            {reportData.months.map((m, i) => {
                                                const isReal = m[flagKey] === true;
                                                return (
                                                    <td key={i} style={{
                                                        ...cellStyle(isReal ? '#c6efce' : ROW_COLORS.semaine),
                                                        color: isReal ? '#276221' : undefined,
                                                        fontWeight: isReal ? '700' : undefined
                                                    }}>
                                                        {fmt(m[field])}
                                                    </td>
                                                );
                                            })}
                                            <td style={totalStyle('#ffe08a')}>{fmt(monthTotal(field))}</td>
                                        </tr>
                                    );
                                })}

                                {/* Spacer */}
                                <tr><td colSpan={(reportData.months?.length || 0) + 2} style={{ height: '4px', backgroundColor: '#ccc', border: 'none' }} /></tr>

                                {/* ── RÉSULTAT ── */}
                                <tr>
                                    <td style={labelStyle(ROW_COLORS.resultat)}><strong>RÉSULTAT</strong></td>
                                    {reportData.months.map((m, i) => (
                                        <td key={i} style={{
                                            ...cellStyle(ROW_COLORS.resultat),
                                            fontWeight: '700',
                                            color: (m.resultat || 0) < 0 ? '#c0392b' : '#1a7340'
                                        }}>
                                            {fmt(m.resultat)}
                                        </td>
                                    ))}
                                    <td style={{
                                        ...totalStyle('#e8a0a0'),
                                        color: monthTotal('resultat') < 0 ? '#c0392b' : '#1a7340'
                                    }}>
                                        {fmt(monthTotal('resultat'))}
                                    </td>
                                </tr>

                                {/* ── TONNAGE EXPORT ── */}
                                <tr>
                                    <td style={labelStyle(ROW_COLORS.export)}>TONNAGE EXPORT</td>
                                    {reportData.months.map((m, i) => (
                                        <td key={i} style={cellStyle(ROW_COLORS.export)}>{fmt(m.tgExport)}</td>
                                    ))}
                                    <td style={totalStyle('#c8e6c9')}>{fmt(monthTotal('tgExport'))}</td>
                                </tr>

                                {/* ── PRIX ESTIMÉ GRPVAR ── */}
                                {(reportData.exportedGrvs || []).map((grv) => (
                                    <tr key={`est_${grv.codgrv}`}>
                                        <td style={labelStyle('#eaf2f8')}>P. EST. {grv.nomgrv}</td>
                                        {reportData.months.map((m, i) => (
                                            <td key={i} style={cellStyle('#eaf2f8')}>
                                                {fmt(m.pricesByGrpVar?.[grv.codgrv])}
                                            </td>
                                        ))}
                                        <td style={totalStyle('#d4e6f1')}>-</td>
                                    </tr>
                                ))}

                                {/* ── ACCOMPT ESTIMÉ ── */}
                                <tr>
                                    <td style={labelStyle('#e8f5e9')}>ACCOMPT ESTIMÉ</td>
                                    {reportData.months.map((m, i) => (
                                        <td key={i} style={cellStyle('#e8f5e9')}>{fmt(m.accomptEstime)}</td>
                                    ))}
                                    <td style={totalStyle('#c8e6c9')}>{fmt(monthTotal('accomptEstime'))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '12px', fontSize: '0.7rem', color: '#999', textAlign: 'right' }} className="no-print">
                        FRUTA — Rapport généré automatiquement le {new Date().toLocaleString('fr-FR')}
                    </div>
                </div>
            )}

            {!reportData && !loading && (
                <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>
                    Sélectionnez un adhérent et une année, puis cliquez sur <strong>Générer</strong>.
                </div>
            )}
        </div>
    );
};

export default GestionAvanceYearlyPrint;
