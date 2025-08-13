import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';
import CameraPermissionModal from '../components/CameraPermissionModal';
import './CameraView.css';

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { setVideo, createQuickcard } = useVostcard();

  const [isRecording, setIsRecording] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Check if we're in quickcard mode
  const searchParams = new URLSearchParams(location.search);
  const isQuickcardMode = searchParams.get('mode') === 'quickcard';

  console.log('📱 CameraView mode:', isQuickcardMode ? 'Quickcard' : 'Regular');

  // Get user location for quickcards
  useEffect(() => {
    if (isQuickcardMode) {
      const getCurrentLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            console.log('📍 Location captured for quickcard');
          },
          (error) => {
            console.error('❌ Error getting location:', error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      };
      getCurrentLocation();
    }
  }, [isQuickcardMode]);

  // Enhanced camera permission check
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permission.state === 'denied') {
        setShowPermissionModal(true);
        return false;
      }
      
      return true;
    } catch (err) {
      console.warn('⚠️ Permission check failed:', err);
      return true; // Continue anyway
    }
  };

  // Samsung-specific detection and handling
  const isSamsungDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('samsung') || userAgent.includes('sm-');
  };

  // Enhanced camera initialization with fallback constraints
  const startCamera = async () => {
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) return;

    try {
      console.log('📱 Starting camera with progressive constraints...');
      setDebugInfo('Initializing camera...');
      
      // Progressive constraint fallback for Samsung devices
      const constraintSets = [
        // Ideal constraints (try first)
        {
          video: {
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: 9 / 16,
            facingMode: 'environment'
          },
          audio: true
        },
        // Fallback for Samsung devices
        {
          video: {
            width: { max: 1920 },
            height: { max: 1080 },
            facingMode: 'environment'
          },
          audio: true
        },
        // Basic constraints
        {
          video: {
            facingMode: 'environment'
          },
          audio: true
        },
        // Absolute minimum
        {
          video: true,
          audio: true
        },
        // Video only (last resort)
        {
          video: true
        }
      ];

      let stream: MediaStream | null = null;
      let usedConstraints = null;

      // Try each constraint set
      for (const constraints of constraintSets) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          usedConstraints = constraints;
          break;
        } catch (err) {
          console.warn('⚠️ Constraint failed:', constraints, err);
          continue;
        }
      }

      if (!stream) {
        throw new Error('Unable to access camera with any constraints');
      }

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      streamRef.current = stream;
      setDebugInfo(`Camera started with: ${JSON.stringify(usedConstraints, null, 2)}`);
      setError(null);

      console.log('✅ Camera started successfully');

    } catch (err) {
      console.error('❌ Camera start failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Show permission modal for permission-related errors
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setShowPermissionModal(true);
      } else {
        setError(`Camera failed to start: ${errorMessage}`);
        setDebugInfo(`Error: ${errorMessage}`);
      }
    }
  };

  // Capture photo for quickcards
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob && userLocation) {
        console.log('📸 Photo captured for quickcard:', blob.size, 'bytes');
        console.log('📍 Location:', userLocation);
        
        // Create quickcard with photo and location
        createQuickcard(blob, userLocation);
        
        // Navigate to step 3 for quickcard editing
        navigate('/quickcard-step3');
      } else {
        console.error('❌ Failed to capture photo or location not available');
        setError('Failed to capture photo. Please try again.');
      }
    }, 'image/jpeg', 0.8);
  };

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideo(blob);
        console.log('📹 Recording saved:', blob);
        // Stop camera tracks to avoid black preview overlays
        // Comprehensive camera cleanup before navigation
        const cleanupAndNavigate = () => {
          // Stop all media tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.stop();
              console.log('🛑 Stopped track:', track.kind, track.readyState);
            });
            streamRef.current = null;
          }
          
          // Clear video element completely
          if (videoRef.current) {
            try {
              videoRef.current.pause();
              videoRef.current.srcObject = null;
              videoRef.current.load(); // Force reload to clear any cached frames
            } catch (error) {
              console.log('Video cleanup error (expected):', error);
            }
          }
          
          // Return to Step 2 (video preview) when not in quickcard photo mode
          if (!isQuickcardMode) {
            // Give iOS Safari extra time to fully release camera
            setTimeout(() => {
              navigate('/create/step2', { replace: true });
            }, 300);
          }
        };
        
        // Delay cleanup to allow recording to complete first
        setTimeout(cleanupAndNavigate, 100);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
        clearInterval(timer);
      }, 60000);

    } catch (err) {
      console.error('❌ Recording failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Recording failed: ${errorMessage}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate(-1);
  };

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="camera-container">
      {/* Camera Permission Modal */}
      <CameraPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRetry={() => {
          setShowPermissionModal(false);
          startCamera();
        }}
      />

      {/* Video Preview */}
      <video
        ref={videoRef}
        className="video-preview"
        autoPlay
        playsInline
        muted
      />

      {/* Close Button */}
      <button
        onClick={closeCamera}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        <AiOutlineClose />
      </button>

      {/* Recording Timer */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            fontSize: '18px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        >
          REC {formatTime(recordingTime)}
        </div>
      )}

      {/* Record/Stop Button */}
      <button
        onClick={isQuickcardMode ? capturePhoto : (isRecording ? stopRecording : startRecording)}
        className={isRecording ? 'stop-button' : 'record-button'}
        disabled={!streamRef.current || (isQuickcardMode && !userLocation)}
        style={{
          position: 'absolute',
          bottom: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100px',
          height: '100px',
          backgroundColor: isRecording ? 'darkred' : (isQuickcardMode ? 'blue' : 'red'),
          borderRadius: '50%',
          border: '6px solid white',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        {isQuickcardMode && (
          <div style={{ 
            color: 'white', 
            fontSize: '40px', 
            lineHeight: '1' 
          }}>
            📸
          </div>
        )}
      </button>

      {/* Hidden canvas for photo capture */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* Mode indicator */}
      {isQuickcardMode && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 255, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        >
          📱 Quickcard Mode
        </div>
      )}

      {/* Location status for quickcards */}
      {isQuickcardMode && (
        <div
          style={{
            position: 'absolute',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: userLocation ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 165, 0, 0.8)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        >
          📍 {userLocation ? 'Location Ready' : 'Getting Location...'}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            background: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '14px',
            zIndex: 1000
          }}
        >
          {error}
        </div>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            maxHeight: '200px',
            overflow: 'auto',
            zIndex: 1000
          }}
        >
          <pre>{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};

export default CameraView;