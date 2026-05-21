import React, { useState, useEffect, useMemo } from 'react';
import {
  getActiveSamples,
  getAllSamples,
  getDefauts,
  getDestinations,
  getVarietes,
  getSampleHistory,
  createDailyCheck,
  createSampleTest,
  getReceptions,
  updateSampleStatus,
  getDailyCheck
} from '../apiService';
import { generateSampleTestReportPDF } from '../utils/pdfGenerator';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateForDisplay, formatDateForInput } from '../utils/dateUtils';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import './ShelfLifeHubPage.css';

const ShelfLifeHubPage = () => {
  // Base Data States
  const [activeSamples, setActiveSamples] = useState([]);
  const [allSamples, setAllSamples] = useState([]);
  const [receptions, setReceptions] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [availableDefects, setAvailableDefects] = useState([]);
  const [sampleHistories, setSampleHistories] = useState({});

  // UI Control States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [varietyFilter, setVarietyFilter] = useState('');

  // Drawer States
  const [showNewTestDrawer, setShowNewTestDrawer] = useState(false);
  const [showDailyCheckModal, setShowDailyCheckModal] = useState(false);

  // New Test Form State
  const [newTestForm, setNewTestForm] = useState({
    numpal: '',
    selectedDestination: null,
    selectedVariety: null,
    startDate: new Date().toISOString().split('T')[0],
    initialFruitCount: 1,
    pdsfru: '',
    couleur1: 1,
    couleur2: 1,
    nomver: '',
    nomemb: ''
  });

  // Daily Check Modal State
  const [activeCheckSample, setActiveCheckSample] = useState(null);
  const [checkDate, setCheckDate] = useState('');
  const [pdsfru, setPdsfru] = useState('');
  const [couleur1, setCouleur1] = useState(1);
  const [couleur2, setCouleur2] = useState(1);
  const [selectedDefect, setSelectedDefect] = useState('');
  const [defectQuantity, setDefectQuantity] = useState(0);
  const [defectRecords, setDefectRecords] = useState([]);
  const [defectsLoading, setDefectsLoading] = useState(false);

  // Pagination for Grid
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // PDF Preview Modal State
  const [showPDFPreviewModal, setShowPDFPreviewModal] = useState(false);
  const [previewPDFUrl, setPreviewPDFUrl] = useState('');
  const [previewPDFFileName, setPreviewPDFFileName] = useState('');
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [activePreviewSample, setActivePreviewSample] = useState(null);

  // On Mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [activeData, allData, receptionsData, destinationsData, varietiesData, defectsData] = await Promise.all([
        getActiveSamples(),
        getAllSamples(),
        getReceptions(),
        getDestinations(),
        getVarietes(),
        getDefauts()
      ]);

      setActiveSamples(activeData || []);
      setAllSamples(allData || []);
      setReceptions(receptionsData || []);
      setDestinations(destinationsData || []);
      setVarieties(varietiesData || []);
      setAvailableDefects(defectsData || []);

      // Load histories in parallel for all active samples
      const histories = {};
      if (activeData && activeData.length > 0) {
        await Promise.all(
          activeData.map(async (sample) => {
            try {
              const hist = await getSampleHistory(sample.id);
              histories[sample.id] = hist;
            } catch (e) {
              console.error(`Failed to load history for sample ${sample.id}`, e);
            }
          })
        );
      }
      setSampleHistories(histories);

    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Lazy load history for a single sample if not loaded yet
  const ensureHistoryLoaded = async (sampleId) => {
    if (sampleHistories[sampleId]) return;
    try {
      const hist = await getSampleHistory(sampleId);
      setSampleHistories(prev => ({
        ...prev,
        [sampleId]: hist
      }));
    } catch (e) {
      console.error(`Failed to load history for sample ${sampleId}`, e);
    }
  };

  // Helper: Get Destination Name
  const getDestinationName = (coddes) => {
    if (!coddes) return 'Client Inconnu';
    const dest = destinations.find(d => d.value === coddes || d.coddes === coddes);
    return dest ? (dest.label || dest.vildes || `Client ${coddes}`) : `Client ${coddes}`;
  };

  // Helper: Get Variety Name
  const getVarietyName = (codvar) => {
    if (!codvar) return 'Variété Inconnue';
    const variety = varieties.find(v => v.value === codvar || v.codvar === codvar);
    return variety ? (variety.label || variety.nomvar || `Variété ${codvar}`) : `Variété ${codvar}`;
  };

  // Helper: Get robust calendar day index difference
  const getDayIndex = (startDateStr, checkDateStr) => {
    if (!startDateStr || !checkDateStr) return 0;
    const start = new Date(startDateStr);
    const check = new Date(checkDateStr);
    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const checkUTC = Date.UTC(check.getFullYear(), check.getMonth(), check.getDate());
    const diffMs = checkUTC - startUTC;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  // Helper: Calculate days elapsed
  const calculateDaysElapsed = (startDate) => {
    if (!startDate) return 1;
    const diffDays = getDayIndex(startDate, new Date());
    return diffDays > 0 ? diffDays : 1;
  };

  // Filter and Search logic
  const filteredSamples = useMemo(() => {
    const source = viewMode === 'active' ? activeSamples : allSamples;
    return source.filter(sample => {
      // Search query (numpal)
      const matchesSearch = sample.numpal.toString().includes(searchQuery);

      // Client filter
      const matchesClient = clientFilter === '' || sample.coddes?.toString() === clientFilter;

      // Variety filter
      const matchesVariety = varietyFilter === '' || sample.codvar?.toString() === varietyFilter;

      return matchesSearch && matchesClient && matchesVariety;
    }).sort((a, b) => b.numpal - a.numpal); // Highest palette number first
  }, [viewMode, activeSamples, allSamples, searchQuery, clientFilter, varietyFilter]);

  // Paginated active items
  const paginatedSamples = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSamples.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSamples, currentPage]);

  const totalPages = Math.ceil(filteredSamples.length / ITEMS_PER_PAGE);

  useEffect(() => {
    // Reset page if view filters change
    setCurrentPage(1);
  }, [viewMode, searchQuery, clientFilter, varietyFilter]);

  // Dynamic Pagination Ellipsis Calculation
  const paginationPages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Load history when cards are rendered to guarantee sparklines work
  useEffect(() => {
    paginatedSamples.forEach(sample => {
      ensureHistoryLoaded(sample.id);
    });
  }, [paginatedSamples]);

  // Create Sample Form Handlers
  const handlePaletteSelect = (e) => {
    const selectedNumpal = parseInt(e.target.value);
    if (!selectedNumpal) return;

    const palette = receptions.find(r => r.numpal === selectedNumpal);
    if (!palette) return;

    // Find matching variety
    const matchingVar = varieties.find(v => v.codvar === palette.codvar);

    // Heuristics for "Most Likely Customer Destination"
    // Search the history of all existing samples to find a previous test with the same variety or verger
    let predictedDestination = null;
    const historicMatch = allSamples.find(s => s.codvar === palette.codvar);
    if (historicMatch) {
      predictedDestination = destinations.find(d => d.value === historicMatch.coddes || d.coddes === historicMatch.coddes);
    }

    setNewTestForm(prev => ({
      ...prev,
      numpal: selectedNumpal,
      selectedVariety: matchingVar || null,
      initialFruitCount: palette.nbrcai || 100,
      pdsfru: palette.pdsfru || '',
      nomver: palette.nomver || '',
      nomemb: palette.nomemb || '',
      selectedDestination: predictedDestination || null
    }));
  };

  const handleNewTestSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const sampleData = {
        numpal: parseInt(newTestForm.numpal),
        startDate: newTestForm.startDate,
        initialFruitCount: parseInt(newTestForm.initialFruitCount),
        pdsfru: newTestForm.pdsfru ? parseFloat(newTestForm.pdsfru) : null,
        couleur1: parseInt(newTestForm.couleur1),
        couleur2: parseInt(newTestForm.couleur2),
        status: 0 // Active
      };

      if (newTestForm.selectedDestination) {
        sampleData.coddes = newTestForm.selectedDestination.value || newTestForm.selectedDestination.coddes;
      }
      if (newTestForm.selectedVariety) {
        sampleData.codvar = newTestForm.selectedVariety.value || newTestForm.selectedVariety.codvar;
      }

      await createSampleTest(sampleData);

      // Close and Reset Form
      setShowNewTestDrawer(false);
      setNewTestForm({
        numpal: '',
        selectedDestination: null,
        selectedVariety: null,
        startDate: new Date().toISOString().split('T')[0],
        initialFruitCount: 1,
        pdsfru: '',
        couleur1: 1,
        couleur2: 1,
        nomver: '',
        nomemb: ''
      });

      // Reload all data
      await fetchInitialData();
      alert('Nouveau Shelf Life créé avec succès !');
    } catch (err) {
      console.error(err);
      setError('Échec de la création du test : ' + err.message);
    }
  };

  // Toggle active/inactive status
  const handleStatusToggle = async (sampleId, currentStatus) => {
    try {
      const newStatus = currentStatus === 0 ? 1 : 0; // 0 = Active, 1 = Closed
      await updateSampleStatus(sampleId, { status: newStatus });
      await fetchInitialData();
    } catch (err) {
      console.error(err);
      setError('Échec de la modification du statut : ' + err.message);
    }
  };

  // Daily Check Handlers
  const handleTimelineNodeClick = async (sample, dayNum) => {
    // Calculate the target check date string for "Day X"
    const start = new Date(sample.startDate);
    const targetDate = new Date(start.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000);

    // Prevent future date check
    if (targetDate > new Date()) return;

    const dateStr = targetDate.toISOString().split('T')[0];

    setActiveCheckSample(sample);
    setCheckDate(dateStr);
    setShowDailyCheckModal(true);

    // Fetch existing records for this day check
    setDefectsLoading(true);
    setDefectRecords([]);
    try {
      const checkData = await getDailyCheck(sample.id, dateStr);
      if (checkData) {
        setPdsfru(checkData.pdsfru ? checkData.pdsfru.toString() : '');
        setCouleur1(checkData.couleur1 || 1);
        setCouleur2(checkData.couleur2 || 1);

        if (checkData.details && checkData.details.length > 0) {
          const loadedDefects = checkData.details.map(detail => {
            const defectMeta = availableDefects.find(d => d.coddef === detail.defectId);
            return {
              id: `server-${detail.id}`,
              defectId: detail.defectId.toString(),
              defectName: defectMeta ? defectMeta.intdef : `Défaut ${detail.defectId}`,
              defectFamily: defectMeta ? defectMeta.famdef : 'Autre',
              quantity: detail.quantity
            };
          });
          setDefectRecords(loadedDefects);
        }
      } else {
        // Pre-populate with previous weight if available from history
        const history = sampleHistories[sample.id];
        let defaultWeight = sample.pdsfru || '';
        if (history && history.dailyChecks && history.dailyChecks.length > 0) {
          // Get the most recent daily check weight
          const recentCheck = history.dailyChecks[history.dailyChecks.length - 1];
          if (recentCheck.pdsfru) defaultWeight = recentCheck.pdsfru;
        }

        setPdsfru(defaultWeight);
        setCouleur1(1);
        setCouleur2(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDefectsLoading(false);
    }
  };

  const addDefectRecord = () => {
    if (!selectedDefect || defectQuantity <= 0) return;

    const defectMeta = availableDefects.find(d => d.coddef.toString() === selectedDefect);
    if (!defectMeta) return;

    // Check if defect already added
    const exists = defectRecords.find(r => r.defectId === selectedDefect);
    if (exists) {
      setDefectRecords(prev => prev.map(r =>
        r.defectId === selectedDefect ? { ...r, quantity: r.quantity + defectQuantity } : r
      ));
    } else {
      setDefectRecords(prev => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          defectId: selectedDefect,
          defectName: defectMeta.intdef,
          defectFamily: defectMeta.famdef,
          quantity: defectQuantity
        }
      ]);
    }

    setSelectedDefect('');
    setDefectQuantity(0);
  };

  const removeDefectRecord = (id) => {
    setDefectRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveDailyCheck = async () => {
    if (!activeCheckSample) return;

    try {
      const payload = {
        checkDate: checkDate,
        pdsfru: pdsfru ? parseFloat(pdsfru) : null,
        couleur1: parseInt(couleur1),
        couleur2: parseInt(couleur2),
        defects: defectRecords.map(r => ({
          defectId: parseInt(r.defectId),
          quantity: r.quantity
        }))
      };

      await createDailyCheck(activeCheckSample.id, payload);

      // Reset Modal
      setShowDailyCheckModal(false);
      setActiveCheckSample(null);
      setDefectRecords([]);

      // Reload Data
      await fetchInitialData();
      alert('Contrôle enregistré avec succès !');
    } catch (err) {
      console.error(err);
      alert('Échec de l\'enregistrement : ' + err.message);
    }
  };

  // PDF Export Trigger
  const handleGeneratePDF = async (sample) => {
    try {
      const history = await getSampleHistory(sample.id);
      if (!history) throw new Error('Failed to load sample history.');

      await generateSampleTestReportPDF(history, destinations, varieties, availableDefects);
    } catch (err) {
      console.error(err);
      alert('Échec de la génération du PDF. Veuillez réessayer.');
    }
  };

  // PDF Preview Trigger
  const handlePreviewPDF = async (sample) => {
    setActivePreviewSample(sample);
    setShowPDFPreviewModal(true);
    setPdfPreviewLoading(true);
    setPreviewPDFUrl('');
    try {
      const history = await getSampleHistory(sample.id);
      if (!history) throw new Error('Failed to load sample history.');

      const { blobUrl, fileName } = await generateSampleTestReportPDF(
        history, 
        destinations, 
        varieties, 
        availableDefects, 
        true
      );
      setPreviewPDFUrl(blobUrl);
      setPreviewPDFFileName(fileName);
    } catch (err) {
      console.error(err);
      alert('Échec de la génération de l\'aperçu. Veuillez réessayer.');
      setShowPDFPreviewModal(false);
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  // Render Sparkline data for a card
  const getSparklineData = (sampleId) => {
    const history = sampleHistories[sampleId];
    if (!history || !history.dailyChecks || history.dailyChecks.length === 0) {
      return [{ day: 'Initial', pds: 100, defects: 0 }];
    }

    return history.dailyChecks.map((dc, idx) => ({
      day: `J${idx + 1}`,
      pds: dc.pdsfru || 0,
      defects: dc.defects ? dc.defects.reduce((sum, d) => sum + d.quantity, 0) : 0
    }));
  };

  // Dynamic Timeline node rendering per card
  const renderTimelineNodes = (sample) => {
    const elapsed = calculateDaysElapsed(sample.startDate);
    const history = sampleHistories[sample.id];
    const checks = history ? history.dailyChecks || [] : [];

    // Calculate last checked day using robust getDayIndex to enforce sequential checking
    const lastCheckedDay = checks.reduce((max, c) => {
      const dayIdx = getDayIndex(sample.startDate, c.checkDate);
      return dayIdx > max ? dayIdx : max;
    }, 0);
    const nextPendingDay = lastCheckedDay + 1;

    // Collect all day indices to render. No gray/future placeholders!
    const daysToRenderSet = new Set();
    
    // 1. Add all days that have checks recorded
    checks.forEach(c => {
      const dayIdx = getDayIndex(sample.startDate, c.checkDate);
      if (dayIdx > 0) {
        daysToRenderSet.add(dayIdx);
      }
    });

    // 2. If the sample is active and the next pending check is available to record today or in the past, show it
    if (sample.status === 0 && nextPendingDay <= elapsed) {
      daysToRenderSet.add(nextPendingDay);
    }

    // Sort day indices chronologically
    const sortedDays = Array.from(daysToRenderSet).sort((a, b) => a - b);

    const nodes = [];

    for (const i of sortedDays) {
      // Find matching daily check for Day i
      const checkOnDay = checks.find(c => getDayIndex(sample.startDate, c.checkDate) === i);

      let nodeClass = 'pending';
      let symbol = '➕';

      if (checkOnDay) {
        const totalDefects = checkOnDay.defects ? checkOnDay.defects.reduce((sum, d) => sum + d.quantity, 0) : 0;
        if (totalDefects === 0) {
          nodeClass = 'healthy';
          symbol = '✅';
        } else if (totalDefects <= 3) {
          nodeClass = 'warning';
          symbol = '⚠️';
        } else {
          nodeClass = 'danger';
          symbol = '🛑';
        }
      } else {
        // If not checked, it must be the pending day
        nodeClass = 'pending';
        symbol = '➕';
      }

      nodes.push(
        <div
          key={`node-${sample.id}-${i}`}
          className={`timeline-node ${nodeClass}`}
          onClick={() => {
            if (sample.status === 1 && !checkOnDay) return;
            if (sample.status === 0 && !checkOnDay && i !== nextPendingDay) return;
            handleTimelineNodeClick(sample, i);
          }}
          title={
            checkOnDay 
              ? `Défauts relevés : ${checkOnDay.defects ? checkOnDay.defects.length : 0}${sample.status === 1 ? ' (Lecture seule)' : ''}` 
              : 'En attente - Cliquer pour enregistrer'
          }
        >
          <span className="node-day">J{i}</span>
          <span className="node-status-symbol">{symbol}</span>
        </div>
      );
    }

    return nodes;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="shelf-life-portal">
      {/* Header */}
      <div className="portal-header">
        <div className="portal-title-wrapper">
          <h1>Suivi & Contrôle Shelf Life</h1>
          <p>Supervisez l'évolution de la qualité et planifiez les contrôles quotidiens en toute simplicité.</p>
        </div>
        <button className="new-test-btn" onClick={() => setShowNewTestDrawer(true)}>
          <span>➕</span> Nouveau Test Shelf Life
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button className="close-alert-btn" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="portal-controls-bar">
        {/* Segmented Control */}
        <div className="segmented-tabs">
          <button
            className={`tab-btn ${viewMode === 'active' ? 'active' : ''}`}
            onClick={() => setViewMode('active')}
          >
            Actifs ({activeSamples.length})
          </button>
          <button
            className={`tab-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            Tous ({allSamples.length})
          </button>
        </div>

        {/* Dynamic Client & Variety Filters */}
        <div className="filters-wrapper">
          <div className="search-input-wrapper">
            <span className="search-icon-svg">🔍</span>
            <input
              type="text"
              placeholder="Rechercher Palette..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="">Tous les Clients</option>
            {destinations.map(dest => (
              <option key={dest.value || dest.coddes} value={dest.value || dest.coddes}>
                {dest.label || dest.vildes || `Client ${dest.coddes}`}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={varietyFilter}
            onChange={(e) => setVarietyFilter(e.target.value)}
          >
            <option value="">Toutes les Variétés</option>
            {varieties.map(variety => (
              <option key={variety.value || variety.codvar} value={variety.value || variety.codvar}>
                {variety.label || variety.nomvar || `Variété ${variety.codvar}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Grid Cards */}
      {filteredSamples.length === 0 ? (
        <div className="empty-portal-state">
          <div className="empty-portal-icon">🍇</div>
          <h3>Aucun test shelf life trouvé</h3>
          <p>Essayez de réinitialiser vos filtres ou créez un nouveau test shelf life ci-dessus.</p>
        </div>
      ) : (
        <>
          <div className="sample-grid">
            {paginatedSamples.map(sample => {
              const sparkData = getSparklineData(sample.id);
              const elapsedDays = calculateDaysElapsed(sample.startDate);

              const history = sampleHistories[sample.id];
              const checks = history ? history.dailyChecks || [] : [];
              const lastCheckDay = checks.reduce((max, c) => {
                const diff = getDayIndex(sample.startDate, c.checkDate);
                return diff > max ? diff : max;
              }, 0);
              const testDuration = lastCheckDay > 0 ? lastCheckDay : 1;

              return (
                <div key={sample.id} className="sample-portal-card">
                  {/* Card Header */}
                  <div className="sample-card-header">
                    <div>
                      <h4 className="variety-title">{getVarietyName(sample.codvar)}</h4>
                      <p className="packaging-subtitle">Palette #{sample.numpal} • Verger: {sample.nomver || sample.vergerName || 'Inconnu'}</p>
                    </div>
                    <div className="status-indicator">
                      <span className={`status-dot ${sample.status === 0 ? 'active' : 'closed'}`}></span>
                      <span className="status-text">{sample.status === 0 ? 'Actif' : 'Fermé'}</span>
                    </div>
                  </div>

                  {/* Sparkline Chart */}
                  <div className="mini-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <defs>
                          <linearGradient id={`grad-${sample.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(272, 70%, 50%)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(272, 70%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div style={{ background: 'white', padding: '6px 10px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '0.75rem' }}>
                                  <strong>{payload[0].payload.day}</strong><br />
                                  Poids: {payload[0].payload.pds}g<br />
                                  Défauts: {payload[0].payload.defects}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="pds"
                          stroke="hsl(272, 70%, 50%)"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill={`url(#grad-${sample.id})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Metadata Fields */}
                  <div className="card-metadata-grid">
                    <div className="meta-field">
                      <strong>Client Destinataire</strong>
                      <span>{getDestinationName(sample.coddes)}</span>
                    </div>
                    <div className="meta-field">
                      <strong>Date de début</strong>
                      <span>{formatDateForDisplay(sample.startDate)}</span>
                    </div>
                    <div className="meta-field">
                      <strong>Nombre Fruits</strong>
                      <span>{sample.initialFruitCount} pcs</span>
                    </div>
                    <div className="meta-field">
                      <strong>Jours écoulés</strong>
                      <span>{sample.status === 1 ? `Clôturé (${testDuration} j)` : `Jour ${elapsedDays}`}</span>
                    </div>
                  </div>

                   {/* Horizontal Timeline Grid */}
                  <div className="timeline-section-title">
                    <span>Timeline Interactive</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      textTransform: 'none', 
                      color: sample.status === 1 
                        ? 'hsl(209, 14%, 45%)' 
                        : sample.isCheckedToday 
                          ? 'hsl(142, 70%, 45%)' 
                          : 'hsl(38, 92%, 50%)' 
                    }}>
                      {sample.status === 1 
                        ? 'Test clôturé 🔒' 
                        : sample.isCheckedToday 
                          ? 'Contrôlé aujourd\'hui ✅' 
                          : 'À contrôler aujourd\'hui ⏰'}
                    </span>
                  </div>
                  <div className="timeline-grid">
                    {renderTimelineNodes(sample)}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="card-actions">
                    <div className="pdf-actions-group">
                      <button className="pdf-trigger-btn" onClick={() => handleGeneratePDF(sample)} title="Télécharger le rapport PDF">
                        📥 Télécharger PDF
                      </button>
                      <button className="pdf-preview-btn" onClick={() => handlePreviewPDF(sample)} title="Visualiser le rapport en ligne">
                        👁️ Aperçu
                      </button>
                    </div>

                    <div className="toggle-switch-wrapper">
                      <span className="toggle-label">Actif</span>
                      <label className="card-switch">
                        <input
                          type="checkbox"
                          checked={sample.status === 0}
                          onChange={() => handleStatusToggle(sample.id, sample.status)}
                        />
                        <span className="card-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Affichage {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredSamples.length)} sur {filteredSamples.length} résultats
              </div>

              <div className="pagination">
                <button
                  className="pagination-nav"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <span className="nav-arrow">‹</span> Précédent
                </button>

                <div className="pagination-numbers">
                  {paginationPages.map((pageNum, index) => (
                    pageNum === '...' ? (
                      <span key={`ell-${index}`} className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={pageNum}
                        className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>

                <button
                  className="pagination-nav"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Suivant <span className="nav-arrow">›</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slide-out Drawer: Nouveau Test Shelf Life */}
      {showNewTestDrawer && (
        <div className="drawer-backdrop" onClick={() => setShowNewTestDrawer(false)}>
          <div className="side-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>🔍 Nouveau Test Shelf Life</h3>
              <button className="close-drawer-btn" onClick={() => setShowNewTestDrawer(false)}>×</button>
            </div>
            <form onSubmit={handleNewTestSubmit} className="drawer-body">
              <div className="portal-form-group">
                <label>Palette de réception *</label>
                <select
                  className="portal-form-control"
                  value={newTestForm.numpal}
                  onChange={handlePaletteSelect}
                  required
                >
                  <option value="">Sélectionner une palette...</option>
                  {receptions.map(p => (
                    <option key={p.numpal} value={p.numpal}>
                      #{p.numpal} (#{p.numrec}) - {getVarietyName(p.codvar)} - {formatDateForDisplay(p.dterec)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="portal-form-group">
                <label>Variété</label>
                <input
                  type="text"
                  className="portal-form-control"
                  value={newTestForm.selectedVariety ? getVarietyName(newTestForm.selectedVariety.codvar) : newTestForm.nomver || ''}
                  disabled
                />
              </div>

              <div className="portal-form-group">
                <label>Emballage / Type de palette</label>
                <input
                  type="text"
                  className="portal-form-control"
                  value={newTestForm.nomemb || ''}
                  disabled
                />
              </div>

              <div className="portal-form-group">
                <label>Client destinataire *</label>
                <select
                  className="portal-form-control"
                  value={newTestForm.selectedDestination ? newTestForm.selectedDestination.value || newTestForm.selectedDestination.coddes : ''}
                  onChange={(e) => {
                    const dest = destinations.find(d => d.value === parseInt(e.target.value) || d.coddes === parseInt(e.target.value));
                    setNewTestForm(prev => ({ ...prev, selectedDestination: dest || null }));
                  }}
                  required
                >
                  <option value="">Sélectionner un Client...</option>
                  {destinations.map(d => (
                    <option key={d.value || d.coddes} value={d.value || d.coddes}>
                      {d.label || d.vildes || `Client ${d.coddes}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="portal-form-group">
                  <label>Date de début *</label>
                  <input
                    type="date"
                    className="portal-form-control"
                    value={newTestForm.startDate}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Nombre Fruits Initial *</label>
                  <input
                    type="number"
                    min="1"
                    className="portal-form-control"
                    value={newTestForm.initialFruitCount}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, initialFruitCount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="portal-form-group">
                  <label>Poids Fruits (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="portal-form-control"
                    value={newTestForm.pdsfru}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, pdsfru: e.target.value }))}
                    placeholder="Facultatif"
                  />
                </div>

                <div className="portal-form-group">
                  <label>Couleur Initiale 1</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="portal-form-control"
                    value={newTestForm.couleur1}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, couleur1: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="drawer-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowNewTestDrawer(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Créer le Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Right-Aligned Centered Dialog Modal: Enregistrer / Modifier un contrôle quotidien */}
      {showDailyCheckModal && activeCheckSample && (
        <div className="right-modal-backdrop" onClick={() => setShowDailyCheckModal(false)}>
          <div className="right-centered-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>📝 Contrôle Quotidien {activeCheckSample.status === 1 && '(Lecture Seule)'}</h3>
              <button className="close-drawer-btn" onClick={() => setShowDailyCheckModal(false)}>×</button>
            </div>
            <div className="drawer-body">
              <p style={{ marginTop: 0, color: 'hsl(209, 14%, 45%)', fontSize: '0.88rem' }}>
                {activeCheckSample.status === 1 
                  ? <>Consultation du contrôle pour la <strong>Palette #{activeCheckSample.numpal}</strong> à la date du <strong>{formatDateForDisplay(checkDate)}</strong>.</>
                  : <>Enregistrement du contrôle pour la <strong>Palette #{activeCheckSample.numpal}</strong> à la date du <strong>{formatDateForDisplay(checkDate)}</strong>.</>
                }
              </p>

              {defectsLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <LoadingSpinner />
                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 10 }}>Chargement des données...</p>
                </div>
              ) : (
                <>
                  <div className="portal-form-group">
                    <label>Poids Actuel Fruits (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="portal-form-control"
                      value={pdsfru}
                      onChange={(e) => setPdsfru(e.target.value)}
                      placeholder="Saisir le poids de la palette"
                      disabled={activeCheckSample.status === 1}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="portal-form-group">
                      <label>Coloration 1 (1 - 10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="portal-form-control"
                        value={couleur1}
                        onChange={(e) => setCouleur1(parseInt(e.target.value) || 1)}
                        required
                        disabled={activeCheckSample.status === 1}
                      />
                    </div>

                    <div className="portal-form-group">
                      <label>Coloration 2 (1 - 10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="portal-form-control"
                        value={couleur2}
                        onChange={(e) => setCouleur2(parseInt(e.target.value) || 1)}
                        required
                        disabled={activeCheckSample.status === 1}
                      />
                    </div>
                  </div>

                  {/* Add Defects section */}
                  {activeCheckSample.status !== 1 && (
                    <>
                      <h4 className="defects-picker-title">Relever des Défauts</h4>

                      <div className="defect-add-row">
                        <div className="portal-form-group" style={{ marginBottom: 0 }}>
                          <label>Défaut</label>
                          <select
                            className="portal-form-control"
                            value={selectedDefect}
                            onChange={(e) => setSelectedDefect(e.target.value)}
                          >
                            <option value="">Choisir un défaut...</option>
                            {availableDefects.map(d => (
                              <option key={d.coddef} value={d.coddef}>
                                {d.intdef} ({d.famdef})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="portal-form-group" style={{ marginBottom: 0 }}>
                          <label>Quantité</label>
                          <input
                            type="number"
                            min="1"
                            className="portal-form-control"
                            value={defectQuantity || ''}
                            onChange={(e) => setDefectQuantity(parseInt(e.target.value) || 0)}
                            placeholder="Qté"
                          />
                        </div>

                        <button type="button" className="add-defect-button" onClick={addDefectRecord}>
                          Ajouter
                        </button>
                      </div>
                    </>
                  )}

                  {/* Listed Defects */}
                  {defectRecords.length > 0 && (
                    <>
                      {activeCheckSample.status === 1 && <h4 className="defects-picker-title" style={{ borderTop: 'none', paddingTop: 0 }}>Défauts Relevés</h4>}
                      <table className="drawer-defects-table">
                        <thead>
                          <tr>
                            <th>Défaut</th>
                            <th>Type</th>
                            <th>Quantité</th>
                            {activeCheckSample.status !== 1 && <th style={{ width: '40px' }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {defectRecords.map(record => (
                            <tr key={record.id}>
                              <td>{record.defectName}</td>
                              <td>{record.defectFamily}</td>
                              <td>{record.quantity}</td>
                              {activeCheckSample.status !== 1 && (
                                <td>
                                  <button
                                    type="button"
                                    className="delete-defect-btn"
                                    onClick={() => removeDefectRecord(record.id)}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowDailyCheckModal(false)}>
                {activeCheckSample.status === 1 ? 'Fermer' : 'Annuler'}
              </button>
              {activeCheckSample.status !== 1 && (
                <button type="button" className="btn-primary" onClick={handleSaveDailyCheck} disabled={defectsLoading}>
                  Enregistrer le Contrôle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal Overlay */}
      {showPDFPreviewModal && activePreviewSample && (
        <div className="pdf-preview-backdrop" onClick={() => setShowPDFPreviewModal(false)}>
          <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>
                📄 Aperçu du Rapport Shelf-Life — Palette #{activePreviewSample.numpal}
              </h3>
              <div className="pdf-preview-header-actions">
                {previewPDFUrl && (
                  <button 
                    className="pdf-preview-download-btn" 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewPDFUrl;
                      link.download = previewPDFFileName;
                      link.click();
                    }}
                  >
                    📥 Télécharger
                  </button>
                )}
                <button className="pdf-preview-close-btn" onClick={() => setShowPDFPreviewModal(false)}>
                  Fermer
                </button>
              </div>
            </div>

            <div className="pdf-preview-body">
              {pdfPreviewLoading ? (
                <div className="pdf-preview-loader-wrapper">
                  <div className="pdf-preview-spinner"></div>
                  <span>Génération de l'aperçu du rapport en cours...</span>
                </div>
              ) : previewPDFUrl ? (
                <iframe 
                  src={previewPDFUrl} 
                  className="pdf-preview-iframe" 
                  title={`Rapport PDF - Palette ${activePreviewSample.numpal}`}
                />
              ) : (
                <div className="error-banner" style={{ margin: '20px' }}>
                  <span>⚠️ Impossible de charger l'aperçu du rapport. Veuillez réessayer.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelfLifeHubPage;
