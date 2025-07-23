import React, { useState } from 'react';

const CollapsibleCard = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="collapsible-card">
      <div className={`collapsible-card-header ${!isOpen ? 'closed' : ''}`} onClick={toggleOpen}>
        <h3>{title}</h3>
        <span className="collapsible-card-toggle">{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div className="collapsible-card-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard;
