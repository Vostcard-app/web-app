// src/components/LandingPage.tsx

import React, { useState } from 'react';
import roadSign from '../assets/underconstruction.jpg'; // ✅ Make sure this filename is correct

const LandingPage: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [tapCount, setTapCount] = useState(0);

  const handleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 3) {
      onUnlock();
    } else {
      setTimeout(() => setTapCount(0), 1500); // Reset after 1.5 seconds if not completed
    }
  };

  return (
    <div style={containerStyle} onClick={handleTap}>
      <img src={roadSign} alt="Under Construction" style={imageStyle} />
      <div style={textStyle}>Under Construction</div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  height: '100vh',
  width: '100vw',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
};

const imageStyle: React.CSSProperties = {
  width: '300px',
  height: '300px',
  objectFit: 'contain',
};

const textStyle: React.CSSProperties = {
  marginTop: 20,
  fontSize: 24,
  fontWeight: 'bold',
  color: '#333',
};

export default LandingPage;