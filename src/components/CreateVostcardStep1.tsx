import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { video, setVideo } = useVostcard();

  const handleRecordVideo = () => {
    navigate('/scrolling-camera');
  };

  const handleSaveAndContinue = () => {
    navigate('/create-step2');
  };

  const handleUseScriptTool = () => {
    navigate('/scrolling-camera');
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

      {/* 📄 Instruction Text */}
      <div
        style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 'bold',
          color: '#002B4D',
        }}
      >
        Record a 30 Second Video
      </div>

      {/* 📹 Video Preview Thumbnail (Portrait) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {video ? (
          <video
            src={video}
            controls
            style={{
              width: 200,
              height: 300,
              borderRadius: 16,
              backgroundColor: '#000',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 200,
              height: 300,
              backgroundColor: '#F2F2F2',
              borderRadius: 16,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#002B4D',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            No Video Yet
          </div>
        )}
      </div>

      {/* 🔴 Record Button */}
      <div
        onClick={handleRecordVideo}
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
          marginBottom: 10,
          alignSelf: 'center',
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

      {/* 📝 Use Script Tool */}
      <div style={{ padding: '0 16px 10px' }}>
        <button
          onClick={handleUseScriptTool}
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
      </div>

      {/* ✅ Save & Continue */}
      <div style={{ padding: '0 16px 20px' }}>
        <button
          onClick={handleSaveAndContinue}
          disabled={!video}
          style={{
            backgroundColor: video ? '#002B4D' : 'gray',
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