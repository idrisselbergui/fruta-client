import React, { useState, useEffect, useMemo } from 'react';
import { getReceptions, createSampleTest, getActiveSamples, getAllSamples, getDestinations, getVarietes, updateSampleStatus } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateForDisplay } from '../utils/dateUtils';
import './SampleTestManagementPage.css';

const SampleTestManagementPage = () => {
  const [receptions, setReceptions] = useState([]);
  const [activeSamples, setActiveSamples] = useState([]);
  const [allSamples, setAllSamples] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'all'
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [receptionsData, activeSamplesData, allSamplesData, destinationsData, varietiesData] = await Promise.all([
        getReceptions(),
        getActiveSamples(),
        getAllSamples(),
        getDestinations(),
        getVarietes()
      ]);
      setReceptions(receptionsData || []);
      setActiveSamples(activeSamplesData || []);
      setAllSamples(allSamplesData || []);
      setDestinations(destinationsData || []);
      setVarieties(varietiesData || []);
      setError(null);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCouleurChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaletteSelect = (e) => {
    const selectedNumpal = parseInt(e.target.value);
    setFormData(prev => ({
      ...prev,
      numpal: selectedNumpal
    }));

    // Auto-fill other fields from selected palette
    const selectedPalette = receptions.find(r => r.numpal === selectedNumpal);
    if (selectedPalette) {
      // Find matching variety from dropdown options
      const matchingVariety = varieties.find(v => v.codvar === selectedPalette.codvar);
      setFormData(prev => ({
        ...prev,
        selectedVariety: matchingVariety || null,
        initialFruitCount: selectedPalette.nbrcai || 1,
        pdsfru: selectedPalette.pdsfru || '',
        nomver: selectedPalette.nomver || '',
        nomemb: selectedPalette.nomemb || ''
      }));
    }
  };

  const handleDropdownChange = (fieldName, selectedOption) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: selectedOption
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Send data with proper types matching backend expectations
      const sampleData = {
        numpal: parseInt(formData.numpal),
        startDate: formData.startDate, // Keep as string - backend will parse
        initialFruitCount: parseInt(formData.initialFruitCount),
        pdsfru: formData.pdsfru ? parseFloat(formData.pdsfru) : null,
        couleur1: parseInt(formData.couleur1),
        couleur2: parseInt(formData.couleur2),
        status: 0 // 0 = Active (enum value)
      };

      // Only add optional fields if they exist and are valid short integers
      if (formData.selectedDestination) {
        const coddesValue = formData.selectedDestination?.value || formData.selectedDestination?.coddes;
        if (coddesValue && Math.abs(coddesValue) <= 32767) { // short range check
          sampleData.coddes = coddesValue;
        }
      }
      if (formData.selectedVariety) {
        const codvarValue = formData.selectedVariety?.value || formData.selectedVariety?.codvar;
        if (codvarValue && Math.abs(codvarValue) <= 32767) { // short range check
          sampleData.codvar = codvarValue;
        }
      }

      console.log('Sending sample data:', sampleData);
      await createSampleTest(sampleData);

      // Reset form and refresh data
      setFormData({
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
      setShowForm(false);

      // Refresh all data including receptions after successful creation
      console.log('Reloading data after successful sample test creation...');
      await fetchData();

      alert('Sample test created successfully!');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to create sample test: ' + err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
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
    setError(null);
  };

  const calculateDays = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getDestinationName = (coddes) => {
    if (!coddes) return 'Unknown';
    const destination = destinations.find(d =>
      d.value === coddes || d.coddes === coddes
    );
    return destination ? (destination.label || destination.vildes || `Client ${coddes}`) : `Client ${coddes}`;
  };

  const getVarietyName = (codvar) => {
    if (!codvar) return 'Unknown';
    const variety = varieties.find(v =>
      v.value === codvar || v.codvar === codvar
    );
    return variety ? (variety.label || variety.nomvar || `Variety ${codvar}`) : `Variety ${codvar}`;
  };

  // Sort samples by palette number (descending - highest first)
  const sortedSamples = [...(viewMode === 'active' ? activeSamples : allSamples)].sort((a, b) =>
    b.numpal - a.numpal
  );

  // Pagination logic
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(sortedSamples.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSamples = sortedSamples.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Current samples based on view mode
  const currentSamples = viewMode === 'active' ? activeSamples : allSamples;

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5; // Max page buttons to display

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show page 1
      pages.push(1);

      // Calculate start and end for middle block centered on currentPage
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we are close to boundaries
      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      // Add left ellipsis before middle block if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add middle block page numbers
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add right ellipsis after middle block if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

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

  const handleStatusToggle = async (sampleId, currentStatus) => {
    try {
      const newStatus = currentStatus === 0 ? 1 : 0; // Toggle between 0 (Active) and 1 (Closed)

      const statusData = {
        status: newStatus
      };

      console.log('Updating sample status:', sampleId, statusData);
      await updateSampleStatus(sampleId, statusData);

      // Refresh the samples list to reflect the change
      await fetchData();

    } catch (err) {
      console.error('Failed to update sample status:', err);
      setError('Failed to update sample status: ' + err.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="sample-test-management">
      <h1>Gestion Shelf Life</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Outer Container: Create New Sample Test - Always on Top */}
      <div className="create-section-outer">
        <div className="create-section">
          <div className="create-section-header">
            <h2>🫐 Créer Nouveau Shelf Life</h2>
            <p>Sélectionnez une réception pour créer un Shelf Life pour le suivi qualité.</p>

            {!showForm && (
              <button className="create-btn" onClick={() => setShowForm(true)}>
                + Créer Shelf Life
              </button>
            )}
          </div>
          {showForm && (
            <div className="form-container">
              <h3>Nouveau Shelf Life</h3>
              <form onSubmit={handleSubmit} className="sample-test-form">
                <div className="form-row">
                  <div className="input-group">
                    <label>Numéro de Palette *</label>
                    <select
                      name="numpal"
                      value={formData.numpal}
                      onChange={handlePaletteSelect}
                      required
                    >
                      <option value="">Sélectionner Palette...</option>
                      {receptions.map(palette => (
                        <option key={palette.numpal} value={palette.numpal}>
                          #{palette.numpal} (#{palette.numrec}) - {formatDateForDisplay(palette.dterec) || 'No Date'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Nom de la Variété</label>
                    <input
                      type="text"
                      value={formData.nomver}
                      readOnly
                    />
                  </div>

                  <div className="input-group">
                    <label>Type de Palette</label>
                    <input
                      type="text"
                      value={formData.nomemb}
                      readOnly
                    />
                  </div>

                  <div className="input-group">
                    <label>Code Client *</label>
                    <select
                      value={formData.selectedDestination ? formData.selectedDestination.value || formData.selectedDestination.coddes : ''}
                      onChange={(e) => {
                        const selectedDest = destinations.find(d =>
                          d.value === parseInt(e.target.value) || d.coddes === parseInt(e.target.value)
                        );
                        handleDropdownChange('selectedDestination', selectedDest);
                      }}
                      required
                    >
                      <option value="">Sélectionner Client...</option>
                      {destinations.map(dest => (
                        <option key={dest.value || dest.coddes} value={dest.value || dest.coddes}>
                          {dest.label || dest.vildes || `Client ${dest.coddes}`} (#{dest.value || dest.coddes})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Code Variété</label>
                    <select
                      value={formData.selectedVariety ? formData.selectedVariety.value || formData.selectedVariety.codvar : ''}
                      onChange={(e) => {
                        const selectedVar = varieties.find(v =>
                          v.value === parseInt(e.target.value) || v.codvar === parseInt(e.target.value)
                        );
                        handleDropdownChange('selectedVariety', selectedVar);
                      }}
                    >
                      <option value="">Sélectionner Variété...</option>
                      {varieties.map(variety => (
                        <option key={variety.value || variety.codvar} value={variety.value || variety.codvar}>
                          {variety.label || variety.nomvar || `Variety ${variety.codvar}`} (#{variety.value || variety.codvar})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>Date de Début *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Nombre Initial de Fruits *</label>
                    <input
                      type="number"
                      name="initialFruitCount"
                      value={formData.initialFruitCount}
                      onChange={handleFormChange}
                      min="1"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Poids Fruits (G)</label>
                    <input
                      type="number"
                      name="pdsfru"
                      value={formData.pdsfru}
                      onChange={handleFormChange}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="input-group">
                    <label>Coloration 1</label>
                    <input
                      type="number"
                      name="couleur1"
                      value={formData.couleur1}
                      onChange={handleFormChange}
                      min="1"
                      max="10"
                      step="1"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Coloration 2</label>
                    <input
                      type="number"
                      name="couleur2"
                      value={formData.couleur2}
                      onChange={handleFormChange}
                      min="1"
                      max="10"
                      step="1"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={handleCancel}>
                    Annuler
                  </button>
                  <button type="submit" className="save-btn">
                    Créer Shelf Life
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Samples Section */}
      <div className="samples-section">
        <div className="section-header">
          <h2>Tous les Shelf Life</h2>
          {/* Modern Segmented Control */}
          <div className={`segmented-control ${viewMode === 'all' ? 'all-active' : ''}`}>
            <button
              className={`segmented-btn ${viewMode === 'active' ? 'active' : ''}`}
              onClick={() => setViewMode('active')}
            >
              Actifs
            </button>
            <button
              className={`segmented-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              Tous
            </button>
          </div>
        </div>

        {currentSamples.length === 0 ? (
          <div className="empty-state">
            <p>Aucun Shelf Life {viewMode === 'active' ? 'actif' : ''} trouvé.</p>
            <p>{viewMode === 'active' ? 'Créez un Shelf Life pour commencer le suivi.' : 'Aucun enregistrement trouvé.'}</p>
          </div>
        ) : (
          <>
            <div className="samples-list">
              {paginatedSamples.map(sample => (
                <div key={sample.id} className="sample-item">
                  <div className="sample-header">
                    <h4>Palette #{sample.numpal}</h4>
                    <span className={`status-badge ${sample.status === 0 ? 'active' : 'closed'}`}>
                      {sample.status === 0 ? 'Actif' : 'Fermé'}
                    </span>
                    <div className="status-toggle">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={sample.status === 0}
                          onChange={() => handleStatusToggle(sample.id, sample.status)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                  <div className="sample-details">
                    <p><strong>Jour :</strong> {calculateDays(sample.startDate)}</p>
                    <p><strong>Client :</strong> {getDestinationName(sample.coddes)}</p>
                    <p><strong>Variété :</strong> {getVarietyName(sample.codvar)}</p>
                    <p><strong>Fruits :</strong> {sample.initialFruitCount}</p>
                    <p><strong>Statut :</strong> {sample.isCheckedToday ? 'Contrôlé Aujourd\'hui ✅' : 'En Attente'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modern Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Affichage {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedSamples.length)} sur {sortedSamples.length} résultats
                </div>

                <div className="pagination">
                  <button
                    className="pagination-nav"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <span className="nav-arrow">‹</span>
                    Précédent
                  </button>

                  <div className="pagination-numbers">
                    {pageNumbers.map((pageNumber, index) => (
                      pageNumber === '...' ? (
                        <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                          ...
                        </span>
                      ) : (
                        <button
                          key={pageNumber}
                          className={`pagination-number ${currentPage === pageNumber ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNumber)}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={currentPage === pageNumber ? 'page' : undefined}
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
                    aria-label="Next page"
                  >
                    Suivant
                    <span className="nav-arrow">›</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SampleTestManagementPage;
