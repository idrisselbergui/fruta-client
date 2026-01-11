import React, { useState, useEffect } from 'react';
import { getActiveSamples, getAllSamples, getDestinations, getVarietes } from '../apiService';
import DailyCheckModal from './DailyCheckModal';
import './SampleDashboard.css';
import './DailyCheckModal.css';

const SampleDashboard = () => {
  const [activeSamples, setActiveSamples] = useState([]);
  const [allSamples, setAllSamples] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;


  const fetchSamples = async () => {
    try {
      setLoading(true);
      const [activeSamplesData, allSamplesData, destinationsData, varietiesData] = await Promise.all([
        getActiveSamples(),
        getAllSamples(),
        getDestinations(),
        getVarietes()
      ]);
      setActiveSamples(activeSamplesData || []);
      setAllSamples(allSamplesData || []);
      setDestinations(destinationsData || []);
      setVarieties(varietiesData || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (sample) => {
    setSelectedSample(sample);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSample(null);
  };

  const handleSave = async () => {
    await fetchSamples(); // Refresh the samples list
  };

  useEffect(() => {
    fetchSamples();
  }, []);

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

  // Sort samples by startDate (newest first) - always use allSamples
  const sortedSamples = [...allSamples].sort((a, b) =>
    new Date(b.startDate) - new Date(a.startDate)
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedSamples.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedSamples.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
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

  if (loading) {
    return <div className="loading">Loading samples...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="sample-dashboard">
      <h2>Quality Control Dashboard</h2>

      {sortedSamples.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Samples Found</h3>
          <p>There are currently no samples in the system.</p>
          <p>Create sample tests to start quality monitoring.</p>
        </div>
      ) : (
        <>
          <div className="samples-grid">
            {currentItems.map((sample) => (
              <div key={sample.id} className="sample-card">
                <div className="card-header">
                  <h3>Reception {sample.numrec}</h3>
                  <span className={`status-badge ${sample.status === 0 ? 'active' : 'closed'}`}>
                    {sample.status === 0 ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Client:</strong> {getDestinationName(sample.coddes)}</p>
                  <p><strong>Variety:</strong> {getVarietyName(sample.codvar)}</p>
                  <p><strong>Day {calculateDays(sample.startDate)}</strong></p>
                  <p><strong>Fruits:</strong> {sample.initialFruitCount}</p>
                </div>
                <div className="card-footer">
                  <button
                    className={`check-button ${sample.isCheckedToday ? 'done' : 'active'}`}
                    disabled={sample.isCheckedToday}
                    onClick={() => openModal(sample)}
                  >
                    {sample.isCheckedToday ? 'Done ✅' : 'Add Daily Check'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modern Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedSamples.length)} of {sortedSamples.length} results
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

      <DailyCheckModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        sample={selectedSample}
        destinations={destinations}
        varieties={varieties}
      />
    </div>
  );
};

export default SampleDashboard;
