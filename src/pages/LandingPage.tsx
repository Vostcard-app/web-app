import React from 'react';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  let tapCount = 0;

  const handleTap = () => {
    tapCount += 1;
    if (tapCount >= 3) {
      navigate('/login');
    }
  };

  return (
    <div className="landing-container">
      <img
        src="/underconstruction.jpg"
        alt="Under Construction"
        className="landing-image"
        onClick={handleTap}
      />
      <div className="landing-message">
        (Tap the sign 3 times to enter)
      </div>
    </div>
  );
}

export default LandingPage;