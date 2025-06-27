import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import roadSign from '../assets/underconstruction.jpg'; // Make sure this is the correct path

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);

  const handleTap = () => {
    const newCount = tapCount + 1;
    if (newCount >= 3) {
      navigate('/home'); // ✅ Navigate to HomeView after 3 taps
    } else {
      setTapCount(newCount);
      setTimeout(() => setTapCount(0), 1500); // Reset if not tapped quickly enough
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