import React, { useState, useRef, useEffect } from 'react';

const CollapsibleCard = ({ title, children, defaultOpen = false, open, onToggle, className = '', maxContentHeight = 800, isLoading = false }) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const internalSetIsOpen = (newState) => {
    setInternalOpen(newState);
  };
  const contentRef = useRef(null);

  const toggleOpen = () => {
    if (onToggle) {
      onToggle(!isOpen);
    } else {
      setInternalOpen(!isOpen);
    }
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    marginBottom: '1.5rem',
    overflow: 'hidden',
    transition: 'box-shadow 0.3s ease',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, rgba(0, 123, 255, 0.02) 0%, rgba(0, 123, 255, 0.01) 100%)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none',
    borderBottom: isOpen ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#2d3748',
  };

  const toggleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#007bff',
    transition: 'transform 0.3s ease',
    lineHeight: 1,
    transform: isOpen ? 'rotate(180deg)' : 'none',
  };

  const contentStyle = {
    padding: isOpen ? '1.5rem' : 0,
    maxHeight: isOpen ? `${maxContentHeight}px` : '0',
    overflowY: isOpen ? 'auto' : 'hidden',
    overflowX: 'hidden',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isOpen ? 1 : 0,
  };

  // Optional: Dynamically adjust maxHeight if content is shorter/longer (uncomment if needed)
  // useEffect(() => {
  //   if (isOpen && contentRef.current) {
  //     const scrollHeight = contentRef.current.scrollHeight;
  //     if (scrollHeight < maxContentHeight) {
  //       contentStyle.maxHeight = `${scrollHeight}px`;
  //     }
  //   }
  // }, [isOpen, children]);

  return (
    <div className={`collapsible-card ${className}`} style={cardStyle}>
      <div 
        className={`collapsible-card-header ${!isOpen ? 'closed' : 'open'}`} 
        style={headerStyle}
        onClick={toggleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleOpen(); }}
        aria-expanded={isOpen}
        aria-controls="collapsible-content"
      >
        <h3 className="card-title" style={titleStyle}>{title}</h3>
        <span className="collapsible-card-toggle" aria-hidden="true" style={toggleStyle}>
          {isOpen ? '−' : '+'}
        </span>
      </div>
      <div 
        id="collapsible-content"
        className={`collapsible-card-content ${isOpen ? 'open' : 'closed'}`}
        style={contentStyle}
        role="region"
        aria-labelledby="collapsible-header"
        ref={contentRef}
      >
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCard;
