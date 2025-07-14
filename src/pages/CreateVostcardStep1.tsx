import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { currentVostcard } = useVostcard();
  const video = currentVostcard?.video ?? null;
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  console.log('➡️ currentVostcard:', currentVostcard);
  console.log('🎥 video object:', video);

  const videoURL = useMemo(() => {
    if (video instanceof Blob) {
      try {
        const url = URL.createObjectURL(video);
        console.log('Generated Blob URL:', url, {
          size: video.size,
          type: video.type
        });
        setVideoError(null);
        return url;
      } catch (error) {
        console.error('❌ Error creating video URL:', error);
        setVideoError('Failed to create video URL');
        return null;
      }
    } else if (typeof video === 'string') {
      console.log('Using stored video URL:', video);
      setVideoError(null);
      return video;
    }
    console.log('No video available:', video);
    return null;
  }, [video, retryCount]);

  useEffect(() => {
    return () => {
      if (videoURL && video instanceof Blob) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, [videoURL, video]);

  const handleRecord = () => {
    if (currentVostcard && !currentVostcard.username) {
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

    if (videoError) {
      alert('❌ Video has errors. Please record a new video.');
      return;
    }

    navigate('/create-step2');
  };

  const handleVideoError = (error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = error.target as HTMLVideoElement;
    const errorMessage = target.error?.message || 'Unknown video error';
    
    console.error('❌ Video playback error:', {
      error: target.error,
      message: errorMessage,
      code: target.error?.code,
      videoURL,
      videoType: video?.type || typeof video
    });

    setVideoError(`Video playback error: ${errorMessage}`);
    setIsVideoLoading(false);
  };

  const handleVideoLoadStart = () => {
    console.log('📹 Video loading started');
    setIsVideoLoading(true);
    setVideoError(null);
  };

  const handleVideoLoadedData = () => {
    console.log('📹 Video data loaded successfully');
    setIsVideoLoading(false);
    setVideoError(null);
  };

  const handleVideoCanPlay = () => {
    console.log('📹 Video can play');
    setIsVideoLoading(false);
    setVideoError(null);
  };

  const handleVideoLoadedMetadata = () => {
    console.log('📹 Video metadata loaded');
    setIsVideoLoading(false);
    setVideoError(null);
  };

  const handleVideoTimeUpdate = () => {
    console.log('📹 Video time update - playback working');
    setIsVideoLoading(false);
    setVideoError(null);
  };

  // Add timeout fallback to prevent infinite loading
  useEffect(() => {
    if (isVideoLoading) {
      const timeout = setTimeout(() => {
        console.log('⏰ Video loading timeout - forcing completion');
        setIsVideoLoading(false);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isVideoLoading]);

  const handleRetryVideo = () => {
    console.log('🔄 Retrying video load');
    setRetryCount(prev => prev + 1);
    setVideoError(null);
    setIsVideoLoading(true);
  };

  const handleRecordNew = () => {
    console.log('🎬 Recording new video');
    setVideoError(null);
    setRetryCount(0);
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
          size={50}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* 🎥 Thumbnail */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}
      >
        {videoURL ? (
          <div style={{ position: 'relative', width: '192px', height: '272px' }}>
            <video
              key={`video-${retryCount}-${videoURL}`}
              src={videoURL}
              controls
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 16,
                backgroundColor: '#F2F2F2',
                objectFit: 'cover',
              }}
              onError={handleVideoError}
              onLoadStart={handleVideoLoadStart}
              onLoadedData={handleVideoLoadedData}
              onCanPlay={handleVideoCanPlay}
              onLoadedMetadata={(e) => {
                handleVideoLoadedMetadata();
                const video = e.currentTarget;
                const { videoWidth, videoHeight } = video;
                
                console.log('📱 Video preview metadata:', {
                  videoWidth,
                  videoHeight,
                  isPortrait: videoHeight > videoWidth,
                  aspectRatio: videoWidth && videoHeight ? (videoWidth / videoHeight).toFixed(3) : 'unknown'
                });
                
                // If video is landscape, rotate it to portrait for preview
                if (videoWidth > videoHeight) {
                  console.log('🔄 Video is landscape, rotating to portrait for preview');
                  video.style.transform = 'rotate(90deg)';
                  video.style.width = '100vh';
                  video.style.height = '100vw';
                } else {
                  console.log('✅ Video is already portrait for preview');
                  video.style.transform = 'none';
                }
              }}
              onTimeUpdate={handleVideoTimeUpdate}
              playsInline
              preload="metadata"
            />
            
            {/* Loading indicator */}
            {isVideoLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                color: 'white',
                fontSize: '14px'
              }}>
                Loading video...
              </div>
            )}
            
            {/* Error overlay */}
            {videoError && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 0, 0, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                color: 'white',
                fontSize: '12px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: '10px' }}>❌ {videoError}</div>
                <button
                  onClick={handleRetryVideo}
                  style={{
                    backgroundColor: 'white',
                    color: 'red',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginBottom: '6px'
                  }}
                >
                  Retry
                </button>
                <button
                  onClick={handleRecordNew}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: '1px solid white',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Record New
                </button>
              </div>
            )}
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
            backgroundColor: '#FFD700',  // Changed to gold
            color: '#000000',  // Changed to black for better contrast on gold
            border: 'none',
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            fontSize: 18,
            cursor: 'pointer',
            fontWeight: 600,  // Made text slightly bolder
          }}
        >
          Use Script Tool
        </button>

        {/* ✅ Save & Continue */}
        <button
          onClick={handleSaveAndContinue}
          disabled={!video || !!videoError}
          style={{
            backgroundColor: (video && !videoError) ? '#002B4D' : '#888',
            color: 'white',
            border: 'none',
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            fontSize: 18,
            cursor: (video && !videoError) ? 'pointer' : 'not-allowed',
          }}
        >
          {videoError ? 'Fix Video to Continue' : 'Save & Continue'}
        </button>
        
        {/* Error message */}
        {videoError && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center',
            width: '100%',
            marginTop: '8px'
          }}>
            Video Error: {videoError}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateVostcardStep1;