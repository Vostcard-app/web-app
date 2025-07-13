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
  const [scrollSpeed, setScrollSpeed] = useState(1);
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

  // Start camera with SIMPLE constraints
  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('📱 Starting camera with simple constraints...');
        
        // SIMPLE, RELIABLE CONSTRAINTS - NO COMPLEX STRATEGIES
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 720 },
            height: { ideal: 1280 }
          },
          audio: false
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Log what we got
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('📱 Camera settings:', {
            width: settings.width,
            height: settings.height,
            facingMode: settings.facingMode
          });
        }

      } catch (err) {
        console.error('❌ Camera failed:', err);
        alert('Camera access failed. Please check permissions.');
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const handleStartRecording = () => {
    if (streamRef.current) {
      console.log('📹 Starting recording...');
      
      // Simple MIME type selection
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 2000000
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
        
        console.log('📹 Recording completed:', {
          size: blob.size,
          type: blob.type
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
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    return seconds.toString();
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(event.target.value);
    setScrollSpeed(newSpeed);
  };

  const getAnimationDuration = () => {
    const scriptLength = script.length;
    const wordsPerSecond = 3;
    const estimatedWords = scriptLength / 5;
    const baseDuration = Math.max(30, estimatedWords / wordsPerSecond);
    return baseDuration / scrollSpeed;
  };

  const increaseSpeed = () => setScrollSpeed(s => Math.min(2.0, +(s + 0.1).toFixed(1)));
  const decreaseSpeed = () => setScrollSpeed(s => Math.max(0.5, +(s - 0.1).toFixed(1)));

  return (
    <div className="scrolling-camera-container">
      {/* Recording Timer */}
      <div className="recording-timer">
        {isRecording && <div className="recording-dot"></div>}
        <span>{formatTime(recordingTime)}</span>
      </div>

      {/* Location indicator */}
      <div className="location-indicator">
        {userLocation ? '📍' : '📍?'}
      </div>

      {/* Top Controls */}
      <div className="top-controls">
        <button className="control-button" onClick={() => navigate(-1)}>
          <AiOutlineClose size={20} />
        </button>
      </div>

      {/* Speed Control */}
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

      {/* SIMPLE Camera Preview - NO TRANSFORMS OR ROTATIONS */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: 'black',
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
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
      <div className="bottom-controls" style={{ marginBottom: 20 }}>
        {/* Dismiss Button */}
        <button
          className="bottom-control-button"
          onClick={() => navigate(-1)}
          style={{ marginRight: 15 }}
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
          style={{ marginLeft: 15 }}
        >
          <MdCameraswitch size={24} color="white" />
        </button>
      </div>
    </div>
  );
};

export default ScrollingCameraView;