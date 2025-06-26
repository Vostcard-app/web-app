// src/components/CreateVostcardStep2.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2: React.FC = () => {
  const navigate = useNavigate();
  const { photo1, photo2, setPhoto1, setPhoto2, setActivePhoto } = useVostcard();

  const handleSelectPhoto = (which: 'photo1' | 'photo2') => {
    const choice = window.confirm('Take Photo? Click OK\nChoose From Gallery? Click Cancel');
    if (choice) {
      setActivePhoto(which);
      navigate('/camera');
    } else {
      const fakeUrl = URL.createObjectURL(new Blob());
      if (which === 'photo1') {
        setPhoto1(fakeUrl);
      } else {
        setPhoto2(fakeUrl);
      }
    }
  };

  const handleSaveAndContinue = () => {
    navigate('/create-step3');
  };

  return (
    <div style={{ backgroundColor: 'white', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 🔵 Banner */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px'
      }}>
        <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>Vōstcard</div>
        <FaArrowLeft
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(-1)}
        />
      </div>

      {/* 📸 Photo Buttons */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24
      }}>
        {/* Button 1 */}
        <div
          onClick={() => handleSelectPhoto('photo1')}
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

        {/* Button 2 */}
        <div
          onClick={() => handleSelectPhoto('photo2')}
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
            cursor: 'pointer'
          }}
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

const photoButtonStyle: React.CSSProperties = {
  width: '80%',
  height: 140,
  backgroundColor: '#F2F2F2',
  borderRadius: 16,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const photoTextStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#002B4D',
  fontSize: 20,
  fontWeight: 600
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: 16
};

export default CreateVostcardStep2;