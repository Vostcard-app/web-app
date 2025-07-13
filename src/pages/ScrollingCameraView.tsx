import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdCameraswitch } from 'react-icons/md';
import { useVostcard } from '../context/VostcardContext';
import './ScrollingCameraView.css';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { setVideo } = useVostcard();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isScriptScrolling, setIsScriptScrolling] = useState(false);
  const [script, setScript] = useState('');
  const [recordingTime, setRecordingTime] = useState(30);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scrollSpeed, setScrollSpeed] = useState(1); // Speed multiplier (0.5x to 2x)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Device detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIPhone = /iPhone/.test(navigator.userAgent);

  // Get script from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const scriptParam = urlParams.get('script');
    if (scriptParam) {
      setScript(decodeURIComponent(scriptParam));
    }
  }, [location.search]);

  // Get user location on mount
  useEffect(() => {
    const getCurrentLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
          console.log('📍 Location captured for video:', location);
        },
        (error) => {
          console.error('❌ Error getting location:', error);
          // Continue without location - user can add it later
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 300000 
        }
      );
    };

    getCurrentLocation();
  }, []);

  // Start camera with improved constraints for iPhone
  useEffect(() => {
    const startCamera = async () => {
      try {
        // Device detection for specific handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        console.log('📱 Device detection:', { isIOS, isAndroid, userAgent: navigator.userAgent });
        
        let videoConstraints: MediaTrackConstraints;
        
        if (isIOS) {
          // For iOS devices, use specific constraints that work better for portrait
          videoConstraints = {
            facingMode,
            width: { exact: 720 },   // Force exact width for iOS
            height: { exact: 1280 }, // Force exact height for iOS
          };
          console.log('📱 Using iOS-specific portrait constraints');
        } else if (isAndroid) {
          // For Android devices
          videoConstraints = {
            facingMode,
            width: { ideal: 720, max: 720 },
            height: { ideal: 1280, min: 1280 },
            aspectRatio: { exact: 9/16 } // Try exact aspect ratio for Android
          };
          console.log('📱 Using Android-specific portrait constraints');
        } else {
          // For desktop/other devices
          videoConstraints = {
            facingMode,
            width: { ideal: 720, min: 480, max: 1080 },
            height: { ideal: 1280, min: 854, max: 1920 },
            aspectRatio: { ideal: 9/16 }
          };
          console.log('📱 Using desktop portrait constraints');
        }
        
        console.log('📱 Requesting portrait camera capture:', videoConstraints);

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: false
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check what we actually got
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          const actualAspectRatio = settings.width && settings.height ? (settings.width / settings.height).toFixed(3) : 'unknown';
          const isPortrait = settings.width && settings.height ? settings.height > settings.width : false;
          
          console.log('📱 Camera capture obtained:', {
            width: settings.width,
            height: settings.height,
            aspectRatio: actualAspectRatio,
            resolution: `${settings.width}x${settings.height}`,
            isPortrait: isPortrait,
            orientation: isPortrait ? 'PORTRAIT ✅' : 'LANDSCAPE ❌',
            deviceType: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'
          });
          
          // Warn if we got landscape instead of portrait
          if (!isPortrait) {
            console.warn('⚠️ Camera is recording in LANDSCAPE mode - video will appear sideways!');
            console.warn('⚠️ This may be a device limitation. Consider rotating device or using different constraints.');
          }
        }

      } catch (err) {
        console.error('Failed to get portrait camera capture:', err);
        // Fallback to most basic constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              facingMode
            }
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          console.log('📱 Using most basic camera fallback');
        } catch (fallbackErr) {
          console.error('All camera access failed:', fallbackErr);
        }
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const handleStartRecording = () => {
    if (streamRef.current) {
      console.log('📹 Recording directly from camera stream (portrait)');
      
      // Simple recording - directly from camera stream
      const getSupportedMimeType = () => {
        const types = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4;codecs=avc1.42E01E',
          'video/mp4'
        ];
        
        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            console.log('📹 Using MIME type:', type);
            return type;
          }
        }
        console.log('📹 Using default MIME type');
        return 'video/webm'; // fallback
      };

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 2000000
      };

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        
        console.log('📹 PORTRAIT video recorded directly from camera:', {
          size: blob.size,
          type: blob.type,
          mimeType: mimeType
        });

        // Save video
        if (userLocation) {
          setVideo(blob, userLocation);
        } else {
          setVideo(blob);
        }
        
        // Navigate back
        if (script && script.trim()) {
          navigate(`/script-tool?script=${encodeURIComponent(script)}`);
        } else {
          navigate('/create-step1');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('📹 Recording error:', event);
        alert('❌ Recording error occurred. Please try again.');
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsScriptScrolling(true);
      setRecordingTime(30);
      
      // Start countdown timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev <= 1) {
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                setIsRecording(false);
                // Note: Don't stop script scrolling - let it continue until finished
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
              }
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    // Note: Don't stop script scrolling - let it continue until finished
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format time as just seconds
  const formatTime = (seconds: number) => {
    return seconds.toString();
  };

  // Switch camera
  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Dismiss/close camera
  const handleDismiss = () => {
    navigate(-1);
  };

  // Handle speed control change
  const handleSpeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(event.target.value);
    setScrollSpeed(newSpeed);
  };

  // Calculate animation duration based on script length only (independent of video duration)
  const getAnimationDuration = () => {
    const scriptLength = script.length;
    const wordsPerSecond = 3; // Average reading speed
    const estimatedWords = scriptLength / 5; // Rough estimate: 5 characters per word
    const baseDuration = Math.max(30, estimatedWords / wordsPerSecond); // Minimum 30 seconds
    return baseDuration / scrollSpeed;
  };

  const increaseSpeed = () => setScrollSpeed(s => Math.min(2.0, +(s + 0.1).toFixed(1)));
  const decreaseSpeed = () => setScrollSpeed(s => Math.max(0.5, +(s - 0.1).toFixed(1)));

  return (
    <div className="scrolling-camera-container">
      {/* Recording Timer - Always visible and centered */}
      <div className="recording-timer">
        {isRecording && <div className="recording-dot"></div>}
        <span>{formatTime(recordingTime)}</span>
      </div>

      {/* Location indicator */}
      <div className="location-indicator">
        {userLocation ? '📍' : '📍?'}
      </div>

      {/* Device info for debugging */}
      {isIPhone && (
        <div style={{
          position: 'absolute',
          top: '160px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10
        }}>
          📱 iPhone Mode
        </div>
      )}

      {/* Top Controls */}
      <div className="top-controls">
        {/* Close Button */}
        <button className="control-button" onClick={() => navigate(-1)}>
          <AiOutlineClose size={20} />
        </button>
      </div>

      {/* Speed Control - Only show when script is present */}
      {script && (
        <div className="speed-control">
          <label>Speed</label>
          <div className="speed-control-vertical">
            <button onClick={decreaseSpeed} disabled={scrollSpeed <= 0.5}>–</button>
            <div className="speed-value">{scrollSpeed.toFixed(1)}x</div>
            <button onClick={increaseSpeed} disabled={scrollSpeed >= 2.0}>+</button>
          </div>
        </div>
      )}

      {/* Camera Preview - Always Portrait 16:9 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-preview"
        style={{
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: 'black',
          // Ensure video is always displayed in portrait 16:9 format
          aspectRatio: '9/16',
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      />

      {/* Scrolling Script Overlay */}
      {script && (
        <div className="script-overlay">
          <div 
            className={`script-text ${isScriptScrolling ? 'scrolling' : ''}`}
            style={{
              animationDuration: isScriptScrolling ? `${getAnimationDuration()}s` : undefined
            }}
            onAnimationEnd={() => {
              console.log('Script animation finished');
              setIsScriptScrolling(false);
            }}
          >
            {script}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div
        className="bottom-controls"
        style={{
          marginBottom: 20, // Keeps the controls up by 20px
        }}
      >
        {/* Dismiss Button */}
        <button
          className="bottom-control-button"
          onClick={handleDismiss}
          style={{
            marginRight: 15, // <-- Move dismiss icon 15px to the left
          }}
        >
          <AiOutlineClose size={24} color="white" />
        </button>

        {/* Record Button */}
        <button
          className="record-button"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          style={{
            backgroundColor: 'red',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
          }}
        >
          {isRecording && (
            <div
              style={{
                backgroundColor: 'white',
                width: '16px',
                height: '16px',
                borderRadius: '2px',
              }}
            />
          )}
        </button>

        {/* Camera Switch Button */}
        <button
          className="bottom-control-button"
          onClick={handleSwitchCamera}
          style={{
            marginLeft: 15, // <-- Move camera chooser 15px to the right
          }}
        >
          <MdCameraswitch size={24} color="white" />
        </button>
      </div>
    </div>
  );
};

export default ScrollingCameraView;