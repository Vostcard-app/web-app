import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaLocationArrow, FaExclamationTriangle } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { currentVostcard, setVideo, clearVostcard } = useVostcard();
  const video = currentVostcard?.video;
  const [isMobile, setIsMobile] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');

  // Debug location data when component mounts
  useEffect(() => {
    console.log('📍 Step 1 - Current Vostcard data:', {
      id: currentVostcard?.id,
      hasVideo: !!currentVostcard?.video,
      hasGeo: !!currentVostcard?.geo,
      geo: currentVostcard?.geo,
      title: currentVostcard?.title,
      photosCount: currentVostcard?.photos?.length,
      categoriesCount: currentVostcard?.categories?.length
    });
  }, [currentVostcard]);

  // Check location permission on component mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Function to check location permission
  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    try {
      // Check if we can get the current position without prompting
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      console.log('Location permission granted, current position:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      setLocationPermission('granted');
    } catch (error: any) {
      console.log('Location permission check failed:', error);
      
      // Check if it's a permission denied error
      if (error.code === 1) {
        setLocationPermission('denied');
      } else {
        setLocationPermission('prompt');
      }
    }
  };

  // Function to request location permission
  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocationPermission('checking');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location permission granted:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationPermission('granted');
      },
      (error) => {
        console.error('Location permission denied:', error);
        setLocationPermission('denied');
        
        if (error.code === 1) {
          alert('Location permission is required to create Vostcards. Please enable location services in your browser settings and try again.');
        } else {
          alert('Could not get your location. Please check your location settings and try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

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
    if (locationPermission !== 'granted') {
      alert('Location permission is required to record a Vostcard. Please enable location services first.');
      return;
    }
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

  // Function to start over (clear context and go back to home)
  const handleStartOver = () => {
    console.log('🔄 Starting over - clearing Vostcard context');
    clearVostcard();
    navigate('/');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleStartOver}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Start Over
          </button>
          <FaHome
            size={28}
            color="white"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
        </div>
      </div>

      {/* 📍 Location Permission Status */}
      {locationPermission !== 'granted' && (
        <div
          style={{
            backgroundColor: locationPermission === 'denied' ? '#ffebee' : '#fff3e0',
            border: `1px solid ${locationPermission === 'denied' ? '#f44336' : '#ff9800'}`,
            borderRadius: '8px',
            margin: '16px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {locationPermission === 'denied' ? (
            <FaExclamationTriangle color="#f44336" />
          ) : (
            <FaLocationArrow color="#ff9800" />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {locationPermission === 'denied' 
                ? 'Location Permission Required' 
                : 'Enable Location Services'
              }
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {locationPermission === 'denied' 
                ? 'Location is required to create Vostcards. Please enable location services in your browser settings.'
                : 'Location services are needed to record where your Vostcard was created.'
              }
            </div>
          </div>
          <button
            onClick={requestLocationPermission}
            style={{
              backgroundColor: locationPermission === 'denied' ? '#f44336' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {locationPermission === 'denied' ? 'Enable' : 'Allow'}
          </button>
        </div>
      )}

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
            onClick={locationPermission === 'granted' ? handleRecord : undefined}
            style={{
              width: 192,
              height: 272,
              backgroundColor: '#F2F2F2',
              borderRadius: 16,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              color: locationPermission === 'granted' ? '#002B4D' : '#999',
              fontSize: 18,
              cursor: locationPermission === 'granted' ? 'pointer' : 'not-allowed',
              padding: 10,
              opacity: locationPermission === 'granted' ? 1 : 0.6,
            }}
          >
            {locationPermission === 'granted' 
              ? 'Record a 30 Second Video'
              : 'Enable Location to Record'
            }
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
          onClick={locationPermission === 'granted' ? handleRecord : undefined}
          style={{
            backgroundColor: locationPermission === 'granted' ? 'red' : '#ccc',
            width: 70,
            height: 70,
            borderRadius: '50%',
            border: '6px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: locationPermission === 'granted' ? 'pointer' : 'not-allowed',
            opacity: locationPermission === 'granted' ? 1 : 0.6,
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
          onClick={locationPermission === 'granted' ? () => navigate('/scrolling-camera') : undefined}
          disabled={locationPermission !== 'granted'}
          style={{
            backgroundColor: locationPermission === 'granted' ? '#002B4D' : '#ccc',
            color: 'white',
            border: 'none',
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            fontSize: 18,
            cursor: locationPermission === 'granted' ? 'pointer' : 'not-allowed',
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