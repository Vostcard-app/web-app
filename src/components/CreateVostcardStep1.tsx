// src/components/CreateVostcardStep1.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaVideo } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { video } = useVostcard();

  const handleRecord = () => {
    navigate('/scrolling-camera');
  };

  const handleSaveAndContinue = () => {
    navigate('/create-step2');
  };

  return (
    <div style={containerStyle}>
      {/* 🔵 Banner */}
      <div style={bannerStyle}>
        <div style={titleStyle}>Vōstcard</div>
        <FaHome
          size={24}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
      </div>

      {/* 🎥 Record Button */}
      <div style={recordSectionStyle}>
        {video ? (
          <video
            src={video}
            controls
            style={videoStyle}
          />
        ) : (
          <div onClick={handleRecord} style={recordButtonStyle}>
            <FaVideo size={40} color="white" />
          </div>
        )}
        <div style={recordTextStyle}>Record a 30-second video</div>
      </div>

      {/* ✅ Save & Continue */}
      <div style={buttonWrapperStyle}>
        <button
          onClick={handleSaveAndContinue}
          style={saveButtonStyle}
          disabled={!video}
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  backgroundColor: 'white',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
};

const bannerStyle: React.CSSProperties = {
  backgroundColor: '#002B4D',
  height: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
};

const titleStyle: React.CSSProperties = {
  color: 'white',
  fontSize: 28,
  fontWeight: 'bold',
};

const recordSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 16,
  paddingTop: 40,
  paddingBottom: 20,
};

const recordButtonStyle: React.CSSProperties = {
  width: 120,
  height: 120,
  backgroundColor: 'red',
  borderRadius: '50%',
  border: '6px solid white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
};

const recordTextStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#002B4D',
};

const videoStyle: React.CSSProperties = {
  width: 240,
  height: 240,
  borderRadius: 16,
  objectFit: 'cover',
};

const buttonWrapperStyle: React.CSSProperties = {
  padding: '0 16px 30px',
};

const saveButtonStyle: React.CSSProperties = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer',
};

export default CreateVostcardStep1;