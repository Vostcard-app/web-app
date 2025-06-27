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
        <FaHome
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
      </div>

      {/* 🎥 Thumbnail */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {video ? (
          <video
            src={video}
            controls
            style={{
              width: '250px',
              height: '350px',
              borderRadius: 16,
              backgroundColor: '#F2F2F2',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            onClick={handleRecord}
            style={{
              width: 250,
              height: 350,
              backgroundColor: '#F2F2F2',
              borderRadius: 16,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              color: '#002B4D',
              fontSize: 18,
              cursor: 'pointer',
              padding: 10,
            }}
          >
            Record a 30 Second Video
          </div>
        )}
      </div>

      {/* 🔘 Buttons */}
      <div
        style={{
          padding: '0 16px',
          marginBottom: 35,
          paddingBottom: 60, // ✅ Added padding under Save button
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {/* ⭕ Record Button */}
        <div
          onClick={handleRecord}
          style={{
            backgroundColor: 'red',
            width: 70,
            height: 70,
            borderRadius: '50%',
            border: '6px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '50%',
              width: 24,
              height: 24,
            }}
          />
        </div>

        {/* 📜 Use Script Tool */}
        <button
          onClick={() => navigate('/scrolling-camera')}
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
          Use Script Tool
        </button>

        {/* ✅ Save & Continue */}
        <button
          onClick={handleSaveAndContinue}
          disabled={!video}
          style={{
            backgroundColor: video ? '#002B4D' : '#888',
            color: 'white',
            border: 'none',
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            fontSize: 18,
            cursor: video ? 'pointer' : 'not-allowed',
          }}
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default CreateVostcardStep1;
