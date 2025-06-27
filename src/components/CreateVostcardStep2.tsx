// src/components/CreateVostcardStep2.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2: React.FC = () => {
  const navigate = useNavigate();
  const { photo1, setPhoto1, photo2, setPhoto2 } = useVostcard();

  const handleSelectPhoto = (setPhoto: (url: string) => void) => {
    const choice = window.confirm('Take Photo? Click OK\nChoose From Gallery? Click Cancel');
    if (choice) {
      navigate('/camera', { state: { setPhoto } });
    } else {
      const fakeUrl = URL.createObjectURL(new Blob());
      setPhoto(fakeUrl);
    }
  };

  const handleSaveAndContinue = () => {
    navigate('/create-step3');
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 🔵 Banner */}
      <div
        style={{
          backgroundColor: '#002B4D',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>
          Vōstcard
        </div>
        <FaArrowLeft
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')} // 🔙 Back to Step 1
        />
      </div>

      {/* 📸 Thumbnails */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* 📷 Distant Photo */}
        <div
          onClick={() => handleSelectPhoto(setPhoto1)}
          style={photoBoxStyle}
        >
          {photo1 ? (
            <img src={photo1} alt="Distant" style={imageStyle} />
          ) : (
            <div style={photoTextStyle}>
              <div>Distant</div>
              <div style={{ fontSize: 14, color: '#555' }}>(Suggested)</div>
            </div>
          )}
        </div>

        {/* 📷 Near Photo */}
        <div
          onClick={() => handleSelectPhoto(setPhoto2)}
          style={photoBoxStyle}
        >
          {photo2 ? (
            <img src={photo2} alt="Near" style={imageStyle} />
          ) : (
            <div style={photoTextStyle}>
              <div>Near</div>
              <div style={{ fontSize: 14, color: '#555' }}>(Suggested)</div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Save & Continue */}
      <div
        style={{
          padding: '0 16px',
          marginBottom: '10vh', // ⬆️ About 1/5 up from bottom
        }}
      >
        <button
          onClick={handleSaveAndContinue}
          style={{
            backgroundColor: '#002B4D',
            color: 'white',
            border: 'none',
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

const photoBoxStyle: React.CSSProperties = {
  width: 250,
  height: 250, // 🔲 Square thumbnails
  backgroundColor: '#F2F2F2',
  borderRadius: 16,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const photoTextStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#002B4D',
  fontSize: 20,
  fontWeight: 600,
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: 16,
};

export default CreateVostcardStep2;