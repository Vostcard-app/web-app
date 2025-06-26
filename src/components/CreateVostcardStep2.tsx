// src/components/CreateVostcardStep2.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2: React.FC = () => {
  const navigate = useNavigate();
  const { photo1, setPhoto1, photo2, setPhoto2 } = useVostcard();
  const [showPicker, setShowPicker] = useState<null | ((url: string) => void)>(null);

  const handleThumbnailPress = (setPhoto: (url: string) => void) => {
    setShowPicker(() => setPhoto);
  };

  const handleTakePhoto = () => {
    if (showPicker) {
      navigate('/camera', { state: { setPhoto: showPicker } });
      setShowPicker(null);
    }
  };

  const handleChooseFromGallery = () => {
    if (showPicker) {
      const fakeUrl = URL.createObjectURL(new Blob());
      showPicker(fakeUrl);
      setShowPicker(null);
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
          onClick={() => navigate(-1)}
        />
      </div>

      {/* 📸 Add Photo Buttons */}
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
        {/* Distant */}
        <div
          onClick={() => handleThumbnailPress(setPhoto1)}
          style={photoButtonStyle}
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

        {/* Near */}
        <div
          onClick={() => handleThumbnailPress(setPhoto2)}
          style={photoButtonStyle}
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
      <div style={{ padding: '0 16px 30px' }}>
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

      {/* 📋 Picker Modal */}
      {showPicker && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
              Select an option
            </div>
            <button style={modalButton} onClick={handleTakePhoto}>
              Take Photo
            </button>
            <button style={modalButton} onClick={handleChooseFromGallery}>
              Choose from Gallery
            </button>
            <button
              style={{ ...modalButton, backgroundColor: '#ccc', color: 'black' }}
              onClick={() => setShowPicker(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const photoButtonStyle: React.CSSProperties = {
  width: 280,
  height: 280,
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

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
};

const modalBox: React.CSSProperties = {
  backgroundColor: 'white',
  padding: 24,
  borderRadius: 12,
  width: 280,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const modalButton: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  cursor: 'pointer',
  marginTop: 8,
};

export default CreateVostcardStep2;