import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', message = '' }) => {
  return (
    <div className="spinner-container">
      <div className={`loading-spinner ${size}`}>
        <div className="spinner-inner"></div>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;