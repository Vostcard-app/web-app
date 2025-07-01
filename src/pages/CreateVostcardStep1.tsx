import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaLocationArrow, FaExclamationTriangle } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import './CreateVostcardStep1.css';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { currentVostcard, setVideo, clearVostcard, saveVostcard } = useVostcard();
  const video = currentVostcard?.video;
  const [isMobile, setIsMobile] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [videoLoadError, setVideoLoadError] = useState(false);

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

  // Function to lock screen orientation to portrait
  const lockOrientationToPortrait = async () => {
    if ('screen' in window && 'orientation' in window.screen) {
      try {
        // @ts-ignore - Screen Orientation API
        await window.screen.orientation.lock('portrait');
        console.log('🔒 Screen orientation locked to portrait');
      } catch (error) {
        console.log('⚠️ Could not lock screen orientation:', error);
      }
    }
  };

  // Function to unlock screen orientation
  const unlockOrientation = async () => {
    if ('screen' in window && 'orientation' in window.screen) {
      try {
        // @ts-ignore - Screen Orientation API
        await window.screen.orientation.unlock();
        console.log('🔓 Screen orientation unlocked');
      } catch (error) {
        console.log('⚠️ Could not unlock screen orientation:', error);
      }
    }
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
    setVideoLoadError(false); // Clear any previous errors
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight, 'Orientation:', isLandscape ? 'landscape' : 'portrait');
  };

  const handleRecord = async () => {
    if (locationPermission !== 'granted') {
      alert('Location permission is required to record a Vostcard. Please enable location services first.');
      return;
    }
    
    // Lock orientation to portrait before recording
    await lockOrientationToPortrait();
    
    navigate('/scrolling-camera');
  };

  const handleSaveAndContinue = async () => {
    if (!video) {
      alert('Please record a video first.');
      return;
    }
    
    try {
      console.log('💾 Step 1 - Starting save and continue process...');
      
      // Save to Firebase
      await saveVostcard();
      console.log('💾 Step 1 - Save completed successfully, proceeding to Step 2');
      navigate('/create-step2');
    } catch (error) {
      console.error('💾 Step 1 - Error in handleSaveAndContinue:', error);
      alert('Failed to save Vostcard. Please try again.');
    }
  };

  const videoURL = video ? URL.createObjectURL(video) : null;

  // Debug video URL creation
  useEffect(() => {
    console.log('🎥 Video debug info:', {
      hasVideo: !!video,
      videoSize: video?.size,
      videoType: video?.type,
      videoURL: videoURL,
      userAgent: navigator.userAgent,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    });
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

    // iOS-specific video handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      return {
        ...baseStyles,
        width: '100%',
        height: '100%',
        // iOS Safari specific properties
        webkitPlaysinline: 'true',
        playsInline: true,
        muted: true, // iOS requires muted for autoplay
        autoplay: false,
        controls: true
      };
    }

    // For landscape thumbnail, we don't need rotation
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
    <div className="step1-container">
      {/* 🔵 Header */}
      <div className="header">
        <h1>Vōstcard</h1>
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
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {videoURL ? (
          <div
            style={{
              width: '272px',
              height: '192px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 16,
              backgroundColor: '#F2F2F2',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <video
              src={videoURL}
              style={getVideoStyles()}
              onLoadedMetadata={handleVideoLoad}
              onError={() => setVideoLoadError(true)}
            />
            {videoLoadError && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  textAlign: 'center',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  Video recorded successfully
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  Tap to continue
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              width: '272px',
              height: '192px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 16,
              backgroundColor: '#F2F2F2',
              border: '2px dashed #ccc',
            }}
          >
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
              No video recorded
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>
              Tap "Record" to start
            </div>
          </div>
        )}
      </div>

      {/* 🔘 Buttons */}
      <div style={{ marginTop: 'auto', padding: '20px' }}>
        {!video ? (
          <button
            onClick={handleRecord}
            className="save-button"
          >
            Record
          </button>
        ) : (
          <>
            <button
              onClick={handleSaveAndContinue}
              className="save-button"
              style={{ marginBottom: '12px' }}
            >
              Save & Continue
            </button>
            <button
              onClick={handleRecord}
              style={{
                backgroundColor: 'transparent',
                color: '#002B4D',
                border: '2px solid #002B4D',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Record Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateVostcardStep1;