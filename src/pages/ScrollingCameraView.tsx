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
        const isMobile = isIOS || isAndroid;
        
        console.log('📱 Device detection:', { isIOS, isAndroid, isMobile, userAgent: navigator.userAgent });
        
        // Multiple constraint strategies to force portrait
        const constraintStrategies = [
          // Strategy 1: Force portrait with exact constraints
          {
            name: 'Exact Portrait',
            constraints: {
              facingMode,
              width: { exact: 720 },
              height: { exact: 1280 }
            }
          },
          // Strategy 2: Ideal portrait with min/max
          {
            name: 'Ideal Portrait',
            constraints: {
              facingMode,
              width: { ideal: 720, min: 480, max: 720 },
              height: { ideal: 1280, min: 854, max: 1280 }
            }
          },
          // Strategy 3: Aspect ratio focused
          {
            name: 'Aspect Ratio Portrait',
            constraints: {
              facingMode,
              aspectRatio: { exact: 9/16 }
            }
          },
          // Strategy 4: Mobile-specific portrait
          {
            name: 'Mobile Portrait',
            constraints: {
              facingMode,
              width: { ideal: 720 },
              height: { ideal: 1280 },
              aspectRatio: { ideal: 9/16 }
            }
          }
        ];
        
        let stream = null;
        let usedStrategy = null;
        
        // Try each strategy until one works and gives us portrait
        for (const strategy of constraintStrategies) {
          try {
            console.log(`📱 Trying strategy: ${strategy.name}`, strategy.constraints);
            
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: strategy.constraints,
              audio: false
            });
            
            // Check if we got portrait
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              const settings = videoTrack.getSettings();
              const isPortrait = settings.width && settings.height ? settings.height > settings.width : false;
              
              console.log(`📱 Strategy ${strategy.name} result:`, {
                width: settings.width,
                height: settings.height,
                isPortrait: isPortrait,
                aspectRatio: settings.width && settings.height ? (settings.width / settings.height).toFixed(3) : 'unknown'
              });
              
              if (isPortrait) {
                usedStrategy = strategy;
                console.log(`✅ SUCCESS: ${strategy.name} gave us portrait video!`);
                break;
              } else {
                console.log(`❌ FAILED: ${strategy.name} gave us landscape, trying next strategy...`);
                // Stop this stream and try next strategy
                stream.getTracks().forEach(track => track.stop());
                stream = null;
              }
            }
                     } catch (error) {
             console.log(`❌ Strategy ${strategy.name} failed:`, error instanceof Error ? error.message : String(error));
             if (stream) {
               stream.getTracks().forEach(track => track.stop());
               stream = null;
             }
           }
        }
        
        // If no strategy worked, try one final fallback
        if (!stream) {
          console.log('🔄 All strategies failed, trying final fallback...');
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode },
              audio: false
            });
            usedStrategy = { name: 'Final Fallback', constraints: { facingMode } };
          } catch (error) {
            console.error('❌ Final fallback also failed:', error);
            throw error;
          }
        }
        
        if (stream) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          // Final check and warning
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            const isPortrait = settings.width && settings.height ? settings.height > settings.width : false;
            
            console.log(`📱 FINAL RESULT using ${usedStrategy?.name}:`, {
              width: settings.width,
              height: settings.height,
              aspectRatio: settings.width && settings.height ? (settings.width / settings.height).toFixed(3) : 'unknown',
              isPortrait: isPortrait,
              orientation: isPortrait ? 'PORTRAIT ✅' : 'LANDSCAPE ❌'
            });
            
            if (!isPortrait) {
              console.warn('⚠️⚠️⚠️ CRITICAL: Video is still LANDSCAPE! This will appear sideways when played back!');
              console.warn('⚠️ Device may not support portrait video capture. Consider device rotation or different approach.');
            }
          }
        }

      } catch (err) {
        console.error('❌ All camera access attempts failed:', err);
        alert('Camera access failed. Please check permissions and try again.');
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