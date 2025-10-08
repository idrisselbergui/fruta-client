import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="footer-container" role="contentinfo">
      <div className="footer-content">
        <p>&copy; {currentYear} Frutaaaaa App. All rights reserved.</p>
        <p className="footer-subtext">Empowering healthier choices, one fruit at a time.</p>
      </div>
    </footer>
  );
};

export default Footer;