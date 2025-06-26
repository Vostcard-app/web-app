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

  const handleSaveAndContinue = () => {
    navigate('/create-step2');
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
        <FaHome
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
      </div>

      {/* 📷 Video Thumbnail */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {video ? (
          <video
            src={video}
            controls
            style={{
              width: '70%',
              height: 'auto',
              borderRadius: 12,
              border: '2px solid #ccc'
            }}
          />
        ) : (
          <div style={{ color: '#999' }}>No video recorded yet.</div>
        )}
      </div>

      {/* 🎥 Record and Text */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 30 }}>

        {/* Record Button */}
        <div
          onClick={handleRecord}
          style={{
            backgroundColor: 'red',
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: '6px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: 8
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '50%',
            width: 18,
            height: 18
          }} />
        </div>

        <div style={{ fontSize: 16, marginBottom: 20 }}>Record a 30 Second Video</div>

        {/* Save & Continue */}
        <button
          onClick={handleSaveAndContinue}
          disabled={!video}
          style={{
            backgroundColor: video ? '#0077ff' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            cursor: video ? 'pointer' : 'not-allowed',
            width: '90%',
            maxWidth: 350
          }}
        >
          Save & Continue
        </button>

      </div>
    </div>
  );
};

export default CreateVostcardStep1;