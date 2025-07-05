import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { currentVostcard } = useVostcard();
  const video = currentVostcard?.video ?? null;

  console.log('➡️ currentVostcard:', currentVostcard);
  console.log('🎥 video object:', video);

  const videoURL = useMemo(() => {
    if (video instanceof Blob) {
      const url = URL.createObjectURL(video);
      console.log('Generated Blob URL:', url);
      return url;
    } else if (typeof video === 'string') {
      console.log('Using stored video URL:', video);
      return video;
    }
    return null;
  }, [video]);

  useEffect(() => {
    return () => {
      if (videoURL && video instanceof Blob) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, [videoURL, video]);

  const handleRecord = () => {
    if (!currentVostcard?.username) {
      console.warn('⚠️ Username missing. Using fallback Anonymous username.');
      currentVostcard.username = 'Anonymous';
    }
    navigate('/scrolling-camera');
  };

  const handleSaveAndContinue = () => {
    console.log('✅ handleSaveAndContinue called');
    console.log('🎥 Video object at save:', video);

    if (!video) {
      alert('❌ No video found. Please record a video first.');
      return;
    }

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
      {/* 🔵 Header */}
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
        {videoURL ? (
          <video
            src={videoURL}
            controls
            style={{
              width: '192px',
              height: '272px',
              borderRadius: 16,
              backgroundColor: '#F2F2F2',
              objectFit: 'cover',
            }}
            onError={() => console.error('❌ Error loading video at', videoURL)}
          />
        ) : (
          <div
            onClick={handleRecord}
            style={{
              width: 192,
              height: 272,
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
          marginBottom: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {/* ⭕ Record Button */}
        <div
          onClick={() => navigate('/scrolling-camera')}
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
          onClick={() => navigate('/script-tool')}
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