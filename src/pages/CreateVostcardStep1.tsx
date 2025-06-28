import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { currentVostcard, setVideo } = useVostcard();
  const video = currentVostcard?.video;
  const [isMobile, setIsMobile] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Detect if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
  }, []);

  // Detect video orientation when video loads
  const handleVideoLoad = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const isLandscape = video.videoWidth > video.videoHeight;
    setVideoOrientation(isLandscape ? 'landscape' : 'portrait');
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight, 'Orientation:', isLandscape ? 'landscape' : 'portrait');
  };

  const handleRecord = () => {
    navigate('/scrolling-camera');
  };

  const handleSaveAndContinue = () => {
    navigate('/create-step2');
  };

  const videoURL = video ? URL.createObjectURL(video) : null;

  // Debug video URL creation
  useEffect(() => {
    console.log('Video object:', video);
    console.log('Video URL:', videoURL);
  }, [video, videoURL]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (videoURL) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, [videoURL]);

  // Video styles based on device type and video orientation
  const getVideoStyles = () => {
    const baseStyles = {
      objectFit: 'cover' as const,
    };

    // If we're on mobile and the video is landscape (which is common for mobile recordings)
    if (isMobile && videoOrientation === 'landscape') {
      return {
        ...baseStyles,
        transform: 'rotate(90deg)',
        transformOrigin: 'center center',
        width: '272px', // Swap width and height for rotated video
        height: '192px',
      };
    }

    return {
      ...baseStyles,
      width: '100%',
      height: '100%',
    };
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
          <div
            style={{
              width: '192px',
              height: '272px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 16,
              backgroundColor: '#F2F2F2',
              overflow: 'hidden',
            }}
          >
            <video
              src={videoURL}
              controls
              playsInline
              preload="metadata"
              style={getVideoStyles()}
              onLoadedMetadata={handleVideoLoad}
            />
          </div>
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
          marginBottom: 80,
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