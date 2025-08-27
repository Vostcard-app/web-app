import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdCameraswitch } from 'react-icons/md';
import { useVostcard } from '../context/VostcardContext';
import { TEMP_UNIFIED_VOSTCARD_FLOW } from '../utils/flags';
import CameraPermissionModal from '../components/CameraPermissionModal';
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
  const [recordingTime, setRecordingTime] = useState(60);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [cameraReady, setCameraReady] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
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
        
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        
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
          
          // Add multiple event handlers to ensure camera is ready
          const handleVideoReady = () => {
            console.log('📱 Video is ready to play');
            setCameraReady(true);
            setCameraLoading(false);
          };
          
          videoRef.current.onloadedmetadata = () => {
            console.log('📱 Video metadata loaded');
            handleVideoReady();
          };
          
          videoRef.current.oncanplay = () => {
            console.log('📱 Video can play');
            handleVideoReady();
          };
          
          videoRef.current.onloadeddata = () => {
            console.log('📱 Video data loaded');
            handleVideoReady();
          };
          
          // Force video to play on mobile devices
          try {
            await videoRef.current.play();
            console.log('📱 Video play started');
          } catch (playError) {
            console.warn('⚠️ Video play failed (this is often normal):', playError);
          }
        }

      } catch (err) {
        console.error('❌ Camera/Audio failed:', err);
        const error = err as Error;
        
        // More detailed error handling
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          console.log('📱 Permission denied - showing modal');
          setShowPermissionModal(true);
        } else if (error.name === 'NotFoundError') {
          console.log('📱 No camera/microphone found');
          alert('No camera or microphone found. Please check your device and try again.');
        } else if (error.message === 'getUserMedia not supported') {
          console.log('📱 getUserMedia not supported');
          alert('Your browser does not support camera access. Please use a modern browser.');
        } else {
          console.log('📱 Other camera error - showing modal');
          setShowPermissionModal(true);
        }
        
        // Always stop loading on error
        setCameraLoading(false);
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
    if (!cameraReady || !videoRef.current || !canvasRef.current) {
      console.log('📱 Canvas animation not ready:', {
        cameraReady,
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current
      });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Set canvas to FIXED portrait dimensions
    canvas.width = PORTRAIT_WIDTH;
    canvas.height = PORTRAIT_HEIGHT;

    const animate = () => {
      if (!ctx || !video) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Check if video is actually loaded and has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
        console.log('📱 Video not ready yet:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });
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

      // Save the portrait video (context)
      console.log('💾 Saving video to context:', {
        blobSize: blob.size,
        blobType: blob.type,
        hasLocation: !!userLocation,
        location: userLocation
      });
      
      if (userLocation) {
        setVideo(blob, userLocation);
      } else {
        setVideo(blob);
      }
      
      console.log('✅ Video saved to context successfully');
      // Emit a custom event so listeners (e.g., edit view) can refresh their local preview immediately
      try {
        window.dispatchEvent(new CustomEvent('vostcard:video-updated', { detail: { size: blob.size, type: blob.type } }));
      } catch {}

      // Thorough cleanup: stop mixed stream and camera tracks, clear DOM elements
      const cleanupAndNavigate = () => {
        try {
          mixedStream.getTracks().forEach(t => {
            t.stop();
            console.log('🛑 Stopped mixed track:', t.kind, t.readyState);
          });
        } catch {}

        try {
          streamRef.current?.getTracks().forEach(t => {
            t.stop();
            console.log('🛑 Stopped camera track:', t.kind, t.readyState);
          });
          streamRef.current = null;
        } catch {}

        if (videoRef.current) {
          try {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
            videoRef.current.load();
          } catch {}
        }

        // Return to caller: honor ?returnTo=, else unified Step 2, else legacy
        const params = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo');
        if (returnTo) {
          setTimeout(() => navigate(returnTo, { replace: true }), 250);
        } else {
          // Always go to Step 2 after video recording (where video thumbnail should show)
          setTimeout(() => navigate('/create-step2', { replace: true }), 250);
        }
      };

      // Give the browser a moment to finalize recording buffers
      setTimeout(cleanupAndNavigate, 100);
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
    setRecordingTime(60);
    
    // 60 second timer
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
    setCameraLoading(true);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const getAnimationDuration = () => {
    if (!script || script.trim().length === 0) {
      return 27; // Default to 27 seconds if no script
    }

    // Calculate optimal scroll duration to complete at 27 seconds
    const scriptLength = script.trim().length;
    const estimatedWords = scriptLength / 5; // Average 5 characters per word
    const averageReadingSpeed = 2.5; // Words per second for comfortable reading
    const idealDuration = Math.max(20, estimatedWords / averageReadingSpeed); // At least 20 seconds for very short scripts
    
    // Set maximum duration to 57 seconds (finishing 3 seconds before recording ends)
    const maxDuration = 57;
    const calculatedDuration = Math.min(idealDuration, maxDuration);
    
    // Apply user's speed adjustment
    const finalDuration = calculatedDuration / scrollSpeed;
    
          console.log('📜 Script scroll calculation:', {
        scriptLength,
        estimatedWords,
        idealDuration: idealDuration.toFixed(1) + 's',
        maxDuration: maxDuration + 's',
        calculatedDuration: calculatedDuration.toFixed(1) + 's',
        scrollSpeed: scrollSpeed + 'x',
        finalDuration: finalDuration.toFixed(1) + 's',
        finishTime: 'Completes at 57 seconds (3s buffer before recording ends)'
      });
    
    return finalDuration;
  };

  const increaseSpeed = () => setScrollSpeed(s => Math.min(2.0, +(s + 0.1).toFixed(1)));
  const decreaseSpeed = () => setScrollSpeed(s => Math.max(0.5, +(s - 0.1).toFixed(1)));

  return (
    <div className="scrolling-camera-container">
      {/* Camera Permission Modal */}
      <CameraPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRetry={() => {
          setShowPermissionModal(false);
          setCameraReady(false);
          // The startCamera effect will re-run when facingMode changes
        }}
      />

      {/* Timer */}
      <div className="recording-timer">
        {isRecording && <div className="recording-dot"></div>}
        <span>{recordingTime}</span>
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
          <div style={{ 
            fontSize: '10px', 
            color: 'rgba(255,255,255,0.8)', 
            textAlign: 'center',
            marginTop: '4px'
          }}>
            {getAnimationDuration().toFixed(1)}s
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

      {/* Camera Loading Indicator */}
      {cameraLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          color: 'white'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            📹 Starting camera...
          </div>
          <div style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            marginTop: '10px',
            maxWidth: '300px'
          }}>
            Please allow camera and microphone access when prompted
          </div>
        </div>
      )}

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
          objectFit: 'contain', // Show full portrait video
          opacity: cameraLoading ? 0 : 1,
          transition: 'opacity 0.3s ease'
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
            border: '3px solid white',
            position: 'relative',
            width: 64,
            height: 64,
            borderRadius: '50%',
          }}
        >
          {isRecording && (
            <div
              style={{
                backgroundColor: 'white',
                width: '18px',
                height: '18px',
                borderRadius: '2px',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
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