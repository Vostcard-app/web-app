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

  // Zoom state and pinch-to-zoom logic
  const [zoom, setZoom] = useState(1); // Standard focal length
  const lastPinchDistance = useRef<number | null>(null);

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
        const videoConstraints: MediaTrackConstraints = {
          facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        };

        if (isIPhone) {
          videoConstraints.width = { ideal: 1080, max: 1080 };
          videoConstraints.height = { ideal: 1920, max: 1920 };
          console.log('📱 iPhone detected - using portrait video constraints');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: false
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('📱 Video track settings:', {
            width: settings.width,
            height: settings.height,
            facingMode: settings.facingMode,
            frameRate: settings.frameRate
          });
        }

      } catch (err) {
        console.error('Error accessing camera:', err);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          console.log('📱 Using fallback camera constraints');
        } catch (fallbackErr) {
          console.error('Fallback camera access also failed:', fallbackErr);
        }
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode, isIPhone]);

  // Reset zoom to 1 when camera is switched
  useEffect(() => {
    setZoom(1);
  }, [facingMode]);

  // Pinch-to-zoom handlers
  function getDistance(touch1: Touch, touch2: Touch) {
    return Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (e.touches.length === 2) {
      const dist = getDistance(e.touches[0], e.touches[1]);
      lastPinchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      const dist = getDistance(e.touches[0], e.touches[1]);
      const delta = dist - lastPinchDistance.current;
      if (Math.abs(delta) > 2) {
        setZoom(z => {
          let next = z + delta * 0.005;
          next = Math.max(1, Math.min(2, next)); // Clamp between 1 and 2
          return next;
        });
        lastPinchDistance.current = dist;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (e.touches.length < 2) {
      lastPinchDistance.current = null;
    }
  };

  const handleStartRecording = () => {
    if (streamRef.current) {
      // Enhanced MIME type detection with better fallbacks
      const getSupportedMimeType = () => {
        const types = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 + AAC (best compatibility)
          'video/mp4;codecs=avc1.42E01E', // H.264 video only
          'video/webm;codecs=vp9,opus', // VP9 + Opus
          'video/webm;codecs=vp9', // VP9 video only
          'video/webm;codecs=vp8,opus', // VP8 + Opus
          'video/webm;codecs=vp8', // VP8 video only
          'video/webm;codecs=h264,opus', // H.264 in WebM + Opus
          'video/webm;codecs=h264', // H.264 in WebM
          'video/webm', // WebM fallback
          'video/mp4', // MP4 fallback
          '' // Let browser decide
        ];
        
        for (const type of types) {
          if (type === '' || MediaRecorder.isTypeSupported(type)) {
            console.log('📹 Selected MIME type:', type || 'browser default');
            return type || undefined;
          }
        }
        console.warn('⚠️ No supported MIME types found, using browser default');
        return undefined;
      };

      const mimeType = getSupportedMimeType();
      
      // Create MediaRecorder with improved options
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      // Add bitrate for better quality/size balance
      try {
        options.videoBitsPerSecond = 2500000; // 2.5 Mbps
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
        const finalMimeType = mimeType || 'video/webm';
        const blob = new Blob(recordedChunks.current, { type: finalMimeType });
        
        console.log('📹 Video recording completed:', {
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
        console.error('📹 MediaRecorder error:', event);
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

  // Zoom control handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 1));

  return (
    <div className="scrolling-camera-container">
      {/* Recording Timer - Always visible and centered */}
      <div className="recording-timer">
        {isRecording && <div className="recording-dot"></div>}
        <span>{recordingTime}</span>
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

      {/* Camera Preview with Pinch-to-Zoom */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-preview"
        style={{
          touchAction: 'none', // Prevent browser pinch-zoom
          transform: isIPhone && facingMode === 'user'
            ? `scaleX(-1)`
            : `scale(1)`,
          transition: 'transform 0.2s'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={e => { handleTouchMove(e); e.preventDefault(); }} // Prevent default pinch-zoom
        onTouchEnd={handleTouchEnd}
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
          position: 'absolute',
          bottom: 100,
          width: '100%',
          height: 66,
          zIndex: 3,
        }}
      >
        {/* Dismiss Button */}
        <button className="bottom-control-button" onClick={() => navigate(-1)}>
          <AiOutlineClose size={24} color="white" />
        </button>

        {/* Record Button */}
        <button
          className="record-button"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          style={{
            borderRadius: '50%'
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
        <button className="bottom-control-button" onClick={handleSwitchCamera}>
          <MdCameraswitch size={24} color="white" />
        </button>
      </div>
    </div>
  );
};

export default ScrollingCameraView;