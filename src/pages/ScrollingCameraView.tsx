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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { setVideo } = useVostcard();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isScriptScrolling, setIsScriptScrolling] = useState(false);
  const [script, setScript] = useState('');
  const [recordingTime, setRecordingTime] = useState(30);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [cameraReady, setCameraReady] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number>();

  // Portrait dimensions - FIXED 9:16 aspect ratio
  const PORTRAIT_WIDTH = 720;
  const PORTRAIT_HEIGHT = 1280;

  // Get script from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const scriptParam = urlParams.get('script');
    if (scriptParam) {
      setScript(decodeURIComponent(scriptParam));
    }
  }, [location.search]);

  // Get user location
  useEffect(() => {
    const getCurrentLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          console.log('📍 Location captured');
        },
        (error) => {
          console.error('❌ Error getting location:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    };
    getCurrentLocation();
  }, []);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('📱 Starting camera with audio...');
        
        // Get camera stream with explicit audio constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        streamRef.current = stream;
        
        // Debug: Check what tracks we got
        console.log('📱 Stream tracks:', {
          video: stream.getVideoTracks().length,
          audio: stream.getAudioTracks().length
        });
        
        stream.getAudioTracks().forEach(track => {
          console.log('🎵 Audio track:', {
            enabled: track.enabled,
            readyState: track.readyState,
            kind: track.kind,
            label: track.label
          });
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; // Keep muted to prevent feedback
          videoRef.current.onloadedmetadata = () => {
            console.log('📱 Video metadata loaded');
            setCameraReady(true);
          };
        }

      } catch (err) {
        console.error('❌ Camera/Audio failed:', err);
        if (err.name === 'NotAllowedError') {
          alert('Camera and microphone access denied. Please allow permissions and try again.');
        } else if (err.name === 'NotFoundError') {
          alert('No camera or microphone found. Please check your device.');
        } else {
          alert('Camera/Audio access failed. Please check permissions and try again.');
        }
      }
    };

    startCamera();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  // Canvas animation loop - ALWAYS renders portrait 9:16
  useEffect(() => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Set canvas to FIXED portrait dimensions
    canvas.width = PORTRAIT_WIDTH;
    canvas.height = PORTRAIT_HEIGHT;

    const animate = () => {
      if (!ctx || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Clear canvas with black background
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Check if camera video is landscape or portrait
      const isVideoLandscape = video.videoWidth > video.videoHeight;
      
      ctx.save();
      
      if (isVideoLandscape) {
        // Camera is landscape - rotate to portrait
        console.log('📱 Rotating landscape camera to portrait');
        
        // Move to center of canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Rotate 90 degrees clockwise
        ctx.rotate(Math.PI / 2);
        
        // Scale to fill portrait canvas (video height becomes canvas width)
        const scaleX = canvas.width / video.videoHeight;
        const scaleY = canvas.height / video.videoWidth;
        const scale = Math.max(scaleX, scaleY);
        
        ctx.scale(scale, scale);
        
        // Draw video centered (swap width/height due to rotation)
        ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
        
      } else {
        // Camera is already portrait - draw normally
        console.log('📱 Camera is portrait, drawing normally');
        
        // Scale to fill canvas while maintaining aspect ratio
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = video.videoWidth * scale;
        const scaledHeight = video.videoHeight * scale;
        
        // Center the video
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
      }
      
      ctx.restore();
      
      // Mirror for front camera
      if (facingMode === 'user') {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, -canvas.width, 0);
        ctx.restore();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraReady, facingMode]);

  const handleStartRecording = () => {
    if (!canvasRef.current) {
      alert('Camera not ready');
      return;
    }

    console.log('📹 Starting PORTRAIT recording from canvas (720x1280) with audio...');
    
    // Record from canvas - guaranteed portrait 9:16
    const canvasStream = canvasRef.current.captureStream(30);
    
    // Better MIME type selection with audio support
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }
    
    console.log('📹 Using MIME type:', mimeType);
    
    // Create a mixed stream with video from canvas and audio from original camera
    const mixedStream = new MediaStream();
    
    // Add video tracks from canvas
    canvasStream.getVideoTracks().forEach(track => {
      mixedStream.addTrack(track);
      console.log('📹 Added video track from canvas');
    });
    
    // Add audio tracks from original camera stream
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      console.log('🎵 Available audio tracks:', audioTracks.length);
      
      audioTracks.forEach(track => {
        if (track.enabled && track.readyState === 'live') {
          mixedStream.addTrack(track);
          console.log('🎵 Added audio track:', track.label);
        } else {
          console.warn('⚠️ Audio track not ready:', {
            enabled: track.enabled,
            readyState: track.readyState
          });
        }
      });
    }
    
    // Verify final stream has both audio and video
    console.log('📹 Final mixed stream:', {
      video: mixedStream.getVideoTracks().length,
      audio: mixedStream.getAudioTracks().length
    });
    
    if (mixedStream.getAudioTracks().length === 0) {
      console.warn('⚠️ No audio tracks in final stream - recording will be silent');
    }
    
    const mediaRecorder = new MediaRecorder(mixedStream, {
      mimeType,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000 // Add audio bitrate
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
      
      console.log('📹 ✅ PORTRAIT recording completed with audio:', {
        size: blob.size,
        type: blob.type,
        dimensions: `${PORTRAIT_WIDTH}x${PORTRAIT_HEIGHT} (9:16 portrait)`,
        audioTracks: mixedStream.getAudioTracks().length
      });

      // Save the portrait video
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
      alert('❌ Recording error. Please try again.');
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

    mediaRecorder.start();
    setIsRecording(true);
    setIsScriptScrolling(true);
    setRecordingTime(30);
    
    // 30 second timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev <= 1) {
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleSwitchCamera = () => {
    setCameraReady(false);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
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
      {/* Timer */}
      <div className="recording-timer">
        {isRecording && <div className="recording-dot"></div>}
        <span>{recordingTime}</span>
      </div>

      {/* Status */}
      <div style={{
        position: 'absolute',
        top: '130px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 10
      }}>
        📱 Portrait 9:16 • {userLocation ? '📍' : '📍?'} • {cameraReady ? '✅' : '⏳'}
      </div>

      {/* Close */}
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

      {/* Hidden video for camera input */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Canvas - PORTRAIT 9:16 display and recording */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          objectFit: 'contain' // Show full portrait video
        }}
      />

      {/* Script overlay */}
      {script && (
        <div className="script-overlay">
          <div 
            className={`script-text ${isScriptScrolling ? 'scrolling' : ''}`}
            style={{
              animationDuration: isScriptScrolling ? `${getAnimationDuration()}s` : undefined
            }}
            onAnimationEnd={() => setIsScriptScrolling(false)}
          >
            {script}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bottom-controls" style={{ marginBottom: 20 }}>
        <button
          className="bottom-control-button"
          onClick={() => navigate(-1)}
          style={{ marginRight: 15 }}
        >
          <AiOutlineClose size={24} color="white" />
        </button>

        <button
          className="record-button"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={!cameraReady}
          style={{
            backgroundColor: cameraReady ? 'red' : '#666',
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