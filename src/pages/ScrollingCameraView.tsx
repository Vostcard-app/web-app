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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get script from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const scriptParam = urlParams.get('script');
    if (scriptParam) {
      setScript(decodeURIComponent(scriptParam));
    }
  }, [location.search]);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const handleStartRecording = () => {
    if (streamRef.current) {
      const getSupportedMimeType = () => {
        const types = [
          'video/mp4;codecs=h264',
          'video/webm;codecs=h264',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm'
        ];
        
        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            return type;
          }
        }
        return 'video/webm';
      };

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
      });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        setVideo(blob);
        // Navigate back to script tool with the script preserved
        navigate(`/script-tool?script=${encodeURIComponent(script)}`);
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
      <div className="bottom-controls">
        {/* Dismiss Button */}
        <button className="bottom-control-button" onClick={handleDismiss}>
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