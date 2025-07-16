import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';
import './CameraView.css';

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { setVideo, saveLocalVostcard, loadLocalVostcard } = useVostcard();

  const [isRecording, setIsRecording] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Enhanced camera permission check
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permission.state === 'denied') {
        alert('Camera access is blocked. Please enable camera permissions in your browser settings.');
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
      setError(`Camera failed to start: ${err.message}`);
      setDebugInfo(`Error: ${err.message}`);
    }
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
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
        clearInterval(timer);
      }, 30000);

    } catch (err) {
      console.error('❌ Recording failed:', err);
      setError(`Recording failed: ${err.message}`);
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
        onClick={isRecording ? stopRecording : startRecording}
        className={isRecording ? 'stop-button' : 'record-button'}
        disabled={!streamRef.current}
        style={{
          position: 'absolute',
          bottom: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100px',
          height: '100px',
          backgroundColor: isRecording ? 'darkred' : 'red',
          borderRadius: '50%',
          border: '6px solid white',
          cursor: 'pointer',
          zIndex: 1000
        }}
      />

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