// src/components/CreateVostcardStep1.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaVideo } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { video, setVideo } = useVostcard();

  const handleRecord = () => {
    navigate('/scrolling-camera');
  };

  const handleSave = () => {
    navigate('/create-step2');
  };

  const handleScriptTool = () => {
    navigate('/script-tool');
  };

  return (
    <div style={containerStyle}>
      {/* 🔵 Header */}
      <div style={headerStyle}>
        <div style={headerTextStyle}>Vōstcard</div>
        <FaHome
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
      </div>

      {/* 🎥 Record Button */}
      <div style={contentStyle}>
        <div onClick={handleRecord} style={recordButtonStyle}>
          <FaVideo size={50} color="white" />
        </div>

        <div style={recordTextStyle}>Record a 30 Second Video</div>
      </div>

      {/* 💾 Save Button */}
      <div style={buttonWrapperStyle}>
        <button
          onClick={handleSave}
          style={{
            ...saveButtonStyle,
            backgroundColor: video ? '#002B4D' : 'gray',
            cursor: video ? 'pointer' : 'not-allowed',
          }}
          disabled={!video}
        >
          Save
        </button>
      </div>

      {/* 🟧 Script Tool Button */}
      <div style={buttonWrapperStyle}>
        <button
          onClick={handleScriptTool}
          style={scriptButtonStyle}
        >
          Use Script Tool
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

const headerStyle: React.CSSProperties = {
  backgroundColor: '#002B4D',
  height: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
};

const headerTextStyle: React.CSSProperties = {
  color: 'white',
  fontSize: 28,
  fontWeight: 'bold',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 20,
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

const buttonWrapperStyle: React.CSSProperties = {
  padding: '0 16px 10px',
};

const saveButtonStyle: React.CSSProperties = {
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
};

const scriptButtonStyle: React.CSSProperties = {
  backgroundColor: 'orange',
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer',
};

export default CreateVostcardStep1;