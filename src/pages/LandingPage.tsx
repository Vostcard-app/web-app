import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleTap = () => {
    navigate('/login');
  };

  return (
    <div className="landing-container">
      <img
        src="/underconstruction.jpg"
        alt="Vōstcard Landing"
        className="landing-image"
        onClick={handleTap}
        style={{ cursor: 'pointer' }}
      />
      <div style={{ marginTop: '20px', color: '#002B4D', fontSize: '16px' }}>
        Tap to enter
      </div>
    </div>
  );
}