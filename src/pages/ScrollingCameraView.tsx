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
  const [script, setScript] = useState('');
  const [recordingTime, setRecordingTime] = useState(30);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
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
        // Mobile-specific video constraints
        let videoConstraints: MediaTrackConstraints;
        
        if (isIPhone) {
          // iPhone-specific constraints for portrait recording
          videoConstraints = {
            facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            frameRate: { ideal: 30 }
          };
        } else {
          // General mobile constraints
          videoConstraints = {
            facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: 9/16
          };
        }
        
        console.log('📱 Using mobile video constraints:', videoConstraints);

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: false
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Log actual video track settings
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('📱 Video track settings:', {
            width: settings.width,
            height: settings.height,
            facingMode: settings.facingMode,
            frameRate: settings.frameRate,
            aspectRatio: settings.width && settings.height ? (settings.width / settings.height).toFixed(2) : 'unknown'
          });
          
          // For iPhone, the camera might still provide landscape, but we'll handle it in recording
          if (settings.width && settings.height) {
            if (settings.width > settings.height) {
              console.log('📱 Camera providing landscape, will record as portrait');
            } else {
              console.log('📱 Camera providing portrait, perfect!');
            }
          }
        }

      } catch (err) {
        console.error('Error accessing camera:', err);
        // Fallback for mobile devices
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode,
              // Don't specify dimensions, let the device decide
            } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          console.log('📱 Using fallback mobile camera constraints');
        } catch (fallbackErr) {
          console.error('Mobile camera access failed:', fallbackErr);
        }
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode, isIPhone]);

  const handleStartRecording = () => {
    if (streamRef.current) {
      // Mobile-optimized MIME type detection
      const getSupportedMimeType = () => {
        const types = [
          'video/mp4', // Best for mobile compatibility
          'video/webm;codecs=vp9', // VP9 fallback
          'video/webm;codecs=vp8', // VP8 fallback
          'video/webm', // WebM fallback
          '' // Let browser decide
        ];
        
        for (const type of types) {
          if (type === '' || MediaRecorder.isTypeSupported(type)) {
            console.log('📹 Selected MIME type for mobile:', type || 'browser default');
            return type || undefined;
          }
        }
        console.warn('⚠️ No supported MIME types found, using browser default');
        return undefined;
      };

      const mimeType = getSupportedMimeType();
      
      // Create MediaRecorder with mobile-optimized options
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      // Mobile-friendly bitrate
      try {
        options.videoBitsPerSecond = isIPhone ? 2000000 : 1500000; // 2Mbps for iPhone, 1.5Mbps for others
      } catch (err) {
        console.log('📹 Bitrate setting not supported, using default');
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMimeType = mimeType || 'video/mp4';
        const blob = new Blob(recordedChunks.current, { type: finalMimeType });
        
        console.log('📹 Mobile video recording completed:', {
          size: blob.size,
          type: blob.type,
          isIPhone,
          chunks: recordedChunks.current.length
        });

        // Pass location to setVideo if available
        if (userLocation) {
          setVideo(blob, userLocation);
          console.log('📍 Video saved with location:', userLocation);
        } else {
          setVideo(blob);
          console.log('📍 Video saved without location');
        }
        
        // Navigate back to the correct location based on where we came from
        if (script && script.trim()) {
          // If we have a script, we came from the script tool
          navigate(`/script-tool?script=${encodeURIComponent(script)}`);
        } else {
          // If no script, we came from create step 1
          navigate('/create-step1');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('📹 Mobile MediaRecorder error:', event);
        alert('❌ Recording error occurred. Please try again.');
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(30);
      
      // Start countdown timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev <= 1) {
            // Auto-stop recording when timer reaches 0
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                setIsRecording(false);
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

      {/* Camera Preview */}
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
          left: 0
        }}
      />

      {/* Scrolling Script Overlay */}
      {script && (
        <div className="script-overlay">
          <div className={`script-text ${isRecording ? 'scrolling' : ''}`}>
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