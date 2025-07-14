import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-container">
      <p>&copy; {new Date().getFullYear()} Frutaaaaa App. All rights reserved.</p>
    </footer>
  );
};

export default Footer;