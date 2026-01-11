import React, { useState, useEffect } from 'react';
import { getReceptions, createSampleTest, getActiveSamples, getAllSamples, getDestinations, getVarietes, updateSampleStatus } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
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
    numrec: '',
    selectedDestination: null,
    selectedVariety: null,
    startDate: new Date().toISOString().split('T')[0],
    initialFruitCount: 1
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

  const handleReceptionSelect = (e) => {
    const selectedNumrec = parseInt(e.target.value);
    setFormData(prev => ({
      ...prev,
      numrec: selectedNumrec
    }));

    // Auto-fill other fields from selected reception
    const selectedReception = receptions.find(r => r.numrec === selectedNumrec);
    if (selectedReception) {
      // Find matching variety from dropdown options
      const matchingVariety = varieties.find(v => v.codvar === selectedReception.codvar);
      setFormData(prev => ({
        ...prev,
        selectedVariety: matchingVariety || null,
        initialFruitCount: selectedReception.nbrfru || 1
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
        numrec: parseInt(formData.numrec),
        startDate: formData.startDate, // Keep as string - backend will parse
        initialFruitCount: parseInt(formData.initialFruitCount),
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
        numrec: '',
        selectedDestination: null,
        selectedVariety: null,
        startDate: new Date().toISOString().split('T')[0],
        initialFruitCount: 1
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
      numrec: '',
      selectedDestination: null,
      selectedVariety: null,
      startDate: new Date().toISOString().split('T')[0],
      initialFruitCount: 1
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

  // Sort samples by reception number (descending - highest first)
  const sortedSamples = [...(viewMode === 'active' ? activeSamples : allSamples)].sort((a, b) =>
    b.numrec - a.numrec
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

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Calculate start and end of the middle section
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Add ellipsis before middle section if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis after middle section if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }

      // Always show last page if more than 1 page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
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
      <h1>Shelf Life</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Outer Container: Create New Sample Test - Always on Top */}
      <div className="create-section-outer">
        <div className="create-section">
          <h2>Create New Shelf Life</h2>
          <p>Select a reception to create a Shelf Life for quality monitoring.</p>

          {!showForm ? (
            <button className="create-btn" onClick={() => setShowForm(true)}>
              + Create Shelf Life
            </button>
          ) : (
            <div className="form-container">
              <h3>New Shelf Life</h3>
              <form onSubmit={handleSubmit} className="sample-test-form">
                <div className="form-row">
                  <div className="input-group">
                    <label>Reception Number *</label>
                    <select
                      name="numrec"
                      value={formData.numrec}
                      onChange={handleReceptionSelect}
                      required
                    >
                      <option value="">Select Reception...</option>
                      {receptions.map(reception => (
                        <option key={reception.numrec} value={reception.numrec}>
                          #{reception.numrec} - {reception.dterec ? new Date(reception.dterec).toLocaleDateString() : 'No Date'}
                          {reception.nbrfru ? ` (${reception.nbrfru} fruits)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Client Code</label>
                    <select
                      value={formData.selectedDestination ? formData.selectedDestination.value || formData.selectedDestination.coddes : ''}
                      onChange={(e) => {
                        const selectedDest = destinations.find(d =>
                          d.value === parseInt(e.target.value) || d.coddes === parseInt(e.target.value)
                        );
                        handleDropdownChange('selectedDestination', selectedDest);
                      }}
                    >
                      <option value="">Select Client...</option>
                      {destinations.map(dest => (
                        <option key={dest.value || dest.coddes} value={dest.value || dest.coddes}>
                          {dest.label || dest.vildes || `Client ${dest.coddes}`} (#{dest.value || dest.coddes})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Variety Code</label>
                    <select
                      value={formData.selectedVariety ? formData.selectedVariety.value || formData.selectedVariety.codvar : ''}
                      onChange={(e) => {
                        const selectedVar = varieties.find(v =>
                          v.value === parseInt(e.target.value) || v.codvar === parseInt(e.target.value)
                        );
                        handleDropdownChange('selectedVariety', selectedVar);
                      }}
                    >
                      <option value="">Select Variety...</option>
                      {varieties.map(variety => (
                        <option key={variety.value || variety.codvar} value={variety.value || variety.codvar}>
                          {variety.label || variety.nomvar || `Variety ${variety.codvar}`} (#{variety.value || variety.codvar})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Initial Fruit Count *</label>
                    <input
                      type="number"
                      name="initialFruitCount"
                      value={formData.initialFruitCount}
                      onChange={handleFormChange}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    Create Sample Test
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
          <h2>All Shelf Life</h2>
          {/* Modern Segmented Control */}
          <div className={`segmented-control ${viewMode === 'all' ? 'all-active' : ''}`}>
            <button
              className={`segmented-btn ${viewMode === 'active' ? 'active' : ''}`}
              onClick={() => setViewMode('active')}
            >
              Active
            </button>
            <button
              className={`segmented-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              All
            </button>
          </div>
        </div>

        {currentSamples.length === 0 ? (
          <div className="empty-state">
            <p>No {viewMode === 'active' ? 'active' : ''} Shelf Life found.</p>
            <p>{viewMode === 'active' ? 'Create a Shelf Life to start monitoring.' : 'No shelf life records found.'}</p>
          </div>
        ) : (
          <>
            <div className="samples-list">
              {paginatedSamples.map(sample => (
                <div key={sample.id} className="sample-item">
                  <div className="sample-header">
                    <h4>Reception #{sample.numrec}</h4>
                    <span className={`status-badge ${sample.status === 0 ? 'active' : 'closed'}`}>
                      {sample.status === 0 ? 'Active' : 'Closed'}
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
                    <p><strong>Day:</strong> {calculateDays(sample.startDate)}</p>
                    <p><strong>Client:</strong> {getDestinationName(sample.coddes)}</p>
                    <p><strong>Variety:</strong> {getVarietyName(sample.codvar)}</p>
                    <p><strong>Fruits:</strong> {sample.initialFruitCount}</p>
                    <p><strong>Status:</strong> {sample.isCheckedToday ? 'Checked Today ✅' : 'Pending Check'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modern Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedSamples.length)} of {sortedSamples.length} results
                </div>

                <div className="pagination">
                  <button
                    className="pagination-nav"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <span className="nav-arrow">‹</span>
                    Previous
                  </button>

                  <div className="pagination-numbers">
                    {renderPageNumbers().map((pageNumber, index) => (
                      pageNumber === '...' ? (
                        <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                          …
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
                    Next
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
