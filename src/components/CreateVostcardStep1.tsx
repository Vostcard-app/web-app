// src/components/CreateVostcardStep1.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { video, setVideo } = useVostcard();

  const handleRecord = () => {
    navigate('/scrolling-camera');
  };

  const handleUseScriptTool = () => {
    navigate('/script-tool');
  };

  const handleSaveAndContinue = () => {
    if (video) {
      navigate('/create-step2');
    }
  };

  return (
    <div style={containerStyle}>
      {/* 🔵 Banner */}
      <div style={bannerStyle}>
        <div style={titleStyle}>Vōstcard</div>
        <FaHome
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
      </div>

      {/* 🎥 Video Preview */}
      <div style={contentStyle}>
        {video ? (
          <video
            src={video}
            controls
            style={videoStyle}
          />
        ) : (
          <div style={thumbnailStyle}>
            <div style={thumbnailTextStyle}>Record a 30 Second Video</div>
          </div>
        )}
      </div>

      {/* Record Button */}
      <div
        style={recordButtonStyle}
        onClick={handleRecord}
      >
        <div style={dotStyle} />
      </div>

      {/* 📜 Use Script Tool Button */}
      <button
        style={scriptButtonStyle}
        onClick={handleUseScriptTool}
      >
        Use Script Tool
      </button>

      {/* ✅ Save & Continue Button */}
      <button
        onClick={handleSaveAndContinue}
        disabled={!video}
        style={{
          ...saveButtonStyle,
          backgroundColor: video ? '#002B4D' : '#A9A9A9',
          cursor: video ? 'pointer' : 'not-allowed',
        }}
      >
        Save & Continue
      </button>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  backgroundColor: 'white',
  height: '100vh',
  width: '100vw',
  position: 'relative',
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

const contentStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 20,
};

const thumbnailStyle: React.CSSProperties = {
  width: 250,
  height: 350,
  backgroundColor: '#F2F2F2',
  borderRadius: 16,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
};

const thumbnailTextStyle: React.CSSProperties = {
  color: '#002B4D',
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: 20,
};

const videoStyle: React.CSSProperties = {
  width: 250,
  height: 350,
  objectFit: 'cover',
  borderRadius: 16,
};

const recordButtonStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 200,
  transform: 'translateX(-50%)',
  backgroundColor: 'red',
  width: 75,
  height: 75,
  borderRadius: '50%',
  border: '6px solid white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const dotStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '50%',
  width: 24,
  height: 24,
};

const scriptButtonStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 140,
  transform: 'translateX(-50%)',
  backgroundColor: '#002B4D',
  color: 'white',
  padding: '14px 24px',
  borderRadius: 10,
  fontSize: 18,
  cursor: 'pointer',
  width: '90%',
};

const saveButtonStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 80,
  transform: 'translateX(-50%)',
  color: 'white',
  padding: '14px 24px',
  borderRadius: 10,
  fontSize: 18,
  width: '90%',
  border: 'none',
};

export default CreateVostcardStep1;