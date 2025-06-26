// src/components/LandingPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);

  const handleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 3) {
      navigate('/'); // Navigate to HomeView
    }

    // Reset tap count after 3 seconds of inactivity
    setTimeout(() => setTapCount(0), 3000);
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 20,
      }}
    >
      <h1 style={{ fontSize: 36, color: '#002B4D' }}>🚧 Under Construction 🚧</h1>
      <p style={{ fontSize: 18, color: '#555' }}>
        The Vōstcard web app is currently under construction.
      </p>

      {/* Tappable Image */}
      <img
        src="/roadsign.png"
        alt="Road Sign"
        onClick={handleTap}
        style={{
          marginTop: 40,
          width: 150,
          height: 150,
          cursor: 'pointer',
        }}
      />
      <p style={{ marginTop: 8, fontSize: 14, color: '#999' }}>
        (Psst... Tap the sign 3 times 😉)
      </p>
    </div>
  );
};

export default LandingPage;