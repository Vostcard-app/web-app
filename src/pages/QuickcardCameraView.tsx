import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdCameraswitch, MdFlashOn, MdFlashOff, MdFlashAuto, MdSettings, MdGrid3X3, MdTimer, MdCameraAlt, MdZoomIn, MdZoomOut, MdHdrOn, MdHdrOff } from 'react-icons/md';
import { useVostcard } from '../context/VostcardContext';
import CameraPermissionModal from '../components/CameraPermissionModal';
import './QuickcardCameraView.css';

// Advanced camera interfaces
interface CameraSettings {
  flashMode: 'auto' | 'on' | 'off';
  resolution: 'HD' | 'FHD' | '4K';
  aspectRatio: '16:9' | '4:3' | '1:1';
  sceneMode: 'auto' | 'hdr' | 'night' | 'portrait';
  gridLines: boolean;
  timer: 0 | 3 | 5 | 10;
  burstMode: boolean;
  exposure: number; // -2 to +2
  whiteBalance: 'auto' | 'daylight' | 'cloudy' | 'tungsten' | 'fluorescent';
}

// Extended interface for experimental camera features
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
  focusMode?: string[];
}

interface ExtendedMediaTrackConstraints extends MediaTrackConstraints {
  zoom?: { ideal: number };
}

interface PhotoCapture {
  blob: Blob;
  timestamp: number;
  settings: CameraSettings;
}

const QuickcardCameraView: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const { createQuickcard } = useVostcard();
  
  // Basic camera states
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  
  // Advanced camera states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [timerCountdown, setTimerCountdown] = useState(0);
  const [burstPhotos, setBurstPhotos] = useState<PhotoCapture[]>([]);
  const [isFlashSupported, setIsFlashSupported] = useState(false);
  
  // Camera settings
  const [settings, setSettings] = useState<CameraSettings>({
    flashMode: 'auto',
    resolution: 'FHD',
    aspectRatio: '16:9',
    sceneMode: 'auto',
    gridLines: false,
    timer: 0,
    burstMode: false,
    exposure: 0,
    whiteBalance: 'auto'
  });

  // Dynamic dimensions based on device orientation and aspect ratio
  const getDimensions = () => {
    const baseWidth = isLandscapeMode ? 1280 : 720;
    const baseHeight = isLandscapeMode ? 720 : 1280;
    
    // Apply resolution multiplier
    const resolutionMultiplier = settings.resolution === 'HD' ? 0.75 : settings.resolution === '4K' ? 1.5 : 1;
    
    // Apply aspect ratio
    let width = baseWidth * resolutionMultiplier;
    let height = baseHeight * resolutionMultiplier;
    
    if (settings.aspectRatio === '4:3') {
      if (isLandscapeMode) {
        height = width * 3 / 4;
      } else {
        width = height * 3 / 4;
      }
    } else if (settings.aspectRatio === '1:1') {
      const size = Math.min(width, height);
      width = height = size;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  };

  // Get user location
  useEffect(() => {
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
  }, []);

  // Detect device orientation
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsLandscapeMode(isLandscape);
      console.log('📱 Device orientation:', isLandscape ? 'Landscape' : 'Portrait');
    };

    checkOrientation();
    const handleOrientationChange = () => {
      setTimeout(checkOrientation, 100);
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Volume button capture
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'AudioVolumeUp' || event.key === 'AudioVolumeDown') {
        event.preventDefault();
        if (cameraReady && userLocation && !isCapturing) {
          handleCapturePhoto();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [cameraReady, userLocation, isCapturing]);

  // Start camera with advanced constraints
  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('📱 Starting advanced quickcard camera...');
        
        // Check flash support
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Advanced constraints based on settings
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: getDimensions().width },
            height: { ideal: getDimensions().height },
            ...(zoomLevel > 1 && { zoom: { ideal: zoomLevel } } as any),
            ...(settings.whiteBalance !== 'auto' && { whiteBalanceMode: settings.whiteBalance as any }),
            ...(settings.exposure !== 0 && { exposureMode: 'manual', exposureCompensation: settings.exposure as any }),
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        // Check flash/torch support
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
        setIsFlashSupported(!!capabilities.torch);
        setMaxZoom(capabilities.zoom?.max || 3);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.onloadedmetadata = () => {
            console.log('📱 Advanced camera ready');
            setCameraReady(true);
          };
        }

      } catch (err) {
        console.error('❌ Advanced camera failed:', err);
        const error = err as Error;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setShowPermissionModal(true);
        } else {
          setShowPermissionModal(true);
        }
      }
    };

    startCamera();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode, zoomLevel, settings.resolution, settings.aspectRatio, settings.whiteBalance, settings.exposure]);

  // Canvas animation loop with zoom support
  useEffect(() => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    const dimensions = getDimensions();

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const animate = () => {
      if (!ctx || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isVideoLandscape = video.videoWidth > video.videoHeight;
      
      ctx.save();
      
      // Apply zoom
      if (zoomLevel > 1) {
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(
          (canvas.width * (1 - zoomLevel)) / (2 * zoomLevel),
          (canvas.height * (1 - zoomLevel)) / (2 * zoomLevel)
        );
      }

      // Orientation handling with zoom
      if (isLandscapeMode) {
        if (isVideoLandscape) {
          const scaleX = canvas.width / video.videoWidth;
          const scaleY = canvas.height / video.videoHeight;
          const scale = Math.max(scaleX, scaleY);
          
          const scaledWidth = video.videoWidth * scale;
          const scaledHeight = video.videoHeight * scale;
          
          const x = (canvas.width - scaledWidth) / 2;
          const y = (canvas.height - scaledHeight) / 2;
          
          ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
        } else {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI / 2);
          
          const scaleX = canvas.width / video.videoHeight;
          const scaleY = canvas.height / video.videoWidth;
          const scale = Math.max(scaleX, scaleY);
          
          ctx.scale(scale, scale);
          ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
        }
      } else {
        if (isVideoLandscape) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI / 2);
          
          const scaleX = canvas.width / video.videoHeight;
          const scaleY = canvas.height / video.videoWidth;
          const scale = Math.max(scaleX, scaleY);
          
          ctx.scale(scale, scale);
          ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
        } else {
          const scaleX = canvas.width / video.videoWidth;
          const scaleY = canvas.height / video.videoHeight;
          const scale = Math.max(scaleX, scaleY);
          
          const scaledWidth = video.videoWidth * scale;
          const scaledHeight = video.videoHeight * scale;
          
          const x = (canvas.width - scaledWidth) / 2;
          const y = (canvas.height - scaledHeight) / 2;
          
          ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
        }
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
  }, [cameraReady, facingMode, isLandscapeMode, zoomLevel, settings.resolution, settings.aspectRatio]);

  // Flash/torch control
  const toggleFlash = async () => {
    if (!streamRef.current || !isFlashSupported) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
    
    if (capabilities.torch) {
      const nextMode = settings.flashMode === 'off' ? 'on' : settings.flashMode === 'on' ? 'auto' : 'off';
      
      try {
        await videoTrack.applyConstraints({
          advanced: [{ torch: nextMode === 'on' } as any]
        });
        setSettings(prev => ({ ...prev, flashMode: nextMode }));
      } catch (err) {
        console.error('❌ Flash control failed:', err);
      }
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, maxZoom));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  // Pinch to zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      (e.currentTarget as any).dataset.initialDistance = distance;
      (e.currentTarget as any).dataset.initialZoom = zoomLevel;
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const initialDistance = parseFloat((e.currentTarget as any).dataset.initialDistance || '0');
      const initialZoom = parseFloat((e.currentTarget as any).dataset.initialZoom || '1');
      
      if (initialDistance > 0) {
        const scale = distance / initialDistance;
        const newZoom = Math.min(Math.max(initialZoom * scale, 1), maxZoom);
        setZoomLevel(newZoom);
      }
    }
  }, [maxZoom]);

  // Tap to focus
  const handleTapFocus = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !streamRef.current) return;

    const x = ((e as any).clientX - rect.left) / rect.width;
    const y = ((e as any).clientY - rect.top) / rect.height;
    
    setFocusPoint({ x: x * 100, y: y * 100 });
    
    // Apply focus constraints
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
    
    if (capabilities.focusMode) {
      try {
        videoTrack.applyConstraints({
          advanced: [{ focusMode: 'single-shot' } as any]
        });
      } catch (err) {
        console.error('❌ Focus control failed:', err);
      }
    }
    
    // Hide focus point after 2 seconds
    setTimeout(() => setFocusPoint(null), 2000);
  }, []);

  // Timer countdown
  const startTimer = (duration: number) => {
    setTimerCountdown(duration);
    const countdown = setInterval(() => {
      setTimerCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          handleCapturePhoto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Burst mode capture
  const handleBurstCapture = async () => {
    if (!canvasRef.current || !userLocation) return;
    
    const burstCount = 5;
    const burstInterval = 200; // 200ms between shots
    const captures: PhotoCapture[] = [];
    
    for (let i = 0; i < burstCount; i++) {
      await new Promise(resolve => setTimeout(resolve, i * burstInterval));
      
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          captures.push({
            blob,
            timestamp: Date.now(),
            settings: { ...settings }
          });
        }
      }, 'image/jpeg', 0.9);
    }
    
    setBurstPhotos(captures);
    
    // Use the first photo for quickcard
    if (captures.length > 0) {
      createQuickcard(captures[0].blob, userLocation);
      navigate('/quickcard-step3');
    }
  };

  // Main capture function
  const handleCapturePhoto = () => {
    if (!canvasRef.current || !userLocation) {
      alert('Camera not ready or location not available');
      return;
    }

    if (settings.timer > 0) {
      startTimer(settings.timer);
      return;
    }

    if (settings.burstMode) {
      handleBurstCapture();
      return;
    }

    setIsCapturing(true);

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const dimensions = getDimensions();
        console.log('📸 Advanced quickcard photo captured:', {
          size: blob.size,
          dimensions: `${dimensions.width}x${dimensions.height}`,
          zoom: zoomLevel,
          settings: settings,
          location: userLocation
        });
        
        createQuickcard(blob, userLocation);
        navigate('/quickcard-step3');
      } else {
        console.error('❌ Failed to capture photo');
        alert('Failed to capture photo. Please try again.');
        setIsCapturing(false);
      }
    }, 'image/jpeg', 0.9);
  };

  // Switch camera
  const handleSwitchCamera = () => {
    setCameraReady(false);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Close camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate(-1);
  };

  // Settings update handler
  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Hybrid approach: Advanced camera + Native camera option
  const [showNativeOption, setShowNativeOption] = useState(true);
  const [showFileTypeWarning, setShowFileTypeWarning] = useState(false);
  const [fileTypeWarningMessage, setFileTypeWarningMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle native camera capture
  const handleNativeCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    // Check if it's a video file
    if (file.type.startsWith('video/')) {
      setFileTypeWarningMessage('📸 Quickcards only accept photos!\n\nYou selected a video file. Please take a photo instead.');
      setShowFileTypeWarning(true);
      
      // Clear the file input for next use
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check if it's an image file
    if (!file.type.startsWith('image/')) {
      setFileTypeWarningMessage('📸 Invalid file type!\n\nPlease select a photo file.');
      setShowFileTypeWarning(true);
      
      // Clear the file input for next use
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check if location is available
    if (!userLocation) {
      setFileTypeWarningMessage('📍 Location not available!\n\nPlease enable location services and try again.');
      setShowFileTypeWarning(true);
      
      // Clear the file input for next use
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Process valid image file
    console.log('📸 Native camera photo accepted:', {
      name: file.name,
      type: file.type,
      size: file.size,
      location: userLocation
    });
    
    // Convert File to Blob for compatibility
    const blob = new Blob([file], { type: file.type });
    createQuickcard(blob, userLocation);
    navigate('/quickcard-step3');
    
    // Clear the file input for next use
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger native camera
  const useNativeCamera = () => {
    fileInputRef.current?.click();
  };

      return (
    <div className="quickcard-camera-container">
      {/* Native camera file input (hidden) - This opens the native camera app */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleNativeCapture}
      />

      {/* Camera Permission Modal */}
      <CameraPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRetry={() => {
          setShowPermissionModal(false);
          setCameraReady(false);
        }}
      />

      {/* Hidden video for camera input */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Canvas with touch controls */}
      <canvas
        ref={canvasRef}
        className="camera-canvas"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTapFocus}
        onClick={handleTapFocus}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          objectFit: 'contain',
          touchAction: 'none'
        }}
      />

      {/* Grid Lines */}
      {settings.gridLines && (
        <div className="grid-lines">
          <div className="grid-line grid-vertical" style={{ left: '33.33%' }} />
          <div className="grid-line grid-vertical" style={{ left: '66.66%' }} />
          <div className="grid-line grid-horizontal" style={{ top: '33.33%' }} />
          <div className="grid-line grid-horizontal" style={{ top: '66.66%' }} />
        </div>
      )}

      {/* Focus Point */}
      {focusPoint && (
        <div
          className="focus-point"
          style={{
            left: `${focusPoint.x}%`,
            top: `${focusPoint.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}

      {/* Timer Countdown */}
      {timerCountdown > 0 && (
        <div className="timer-countdown">
          {timerCountdown}
        </div>
      )}



      {/* Top Controls */}
      <div className="top-controls">
        <button className="control-button" onClick={closeCamera}>
          <AiOutlineClose size={20} />
        </button>
        
        <button className="control-button" onClick={() => setShowSettings(!showSettings)}>
          <MdSettings size={20} />
        </button>
        
        {isFlashSupported && (
          <button className="control-button" onClick={toggleFlash}>
            {settings.flashMode === 'off' ? <MdFlashOff size={20} /> :
             settings.flashMode === 'on' ? <MdFlashOn size={20} /> :
             <MdFlashAuto size={20} />}
          </button>
        )}

      {/* Native Camera Option */}
      {showNativeOption && (
        <div className="native-camera-option">
          <button className="native-camera-button" onClick={useNativeCamera}>
            📱 Use Native Camera
          </button>
          <div className="native-camera-hint">
            Opens your device's camera app
          </div>
        </div>
      )}

      {/* File Type Warning Modal */}
      {showFileTypeWarning && (
        <div className="file-type-warning-overlay">
          <div className="file-type-warning-modal">
            <div className="file-type-warning-content">
              <h3>⚠️ File Type Warning</h3>
              <p>{fileTypeWarningMessage}</p>
              <button 
                className="file-type-warning-ok"
                onClick={() => setShowFileTypeWarning(false)}
              >
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button className="zoom-button" onClick={handleZoomOut} disabled={zoomLevel <= 1}>
          <MdZoomOut size={20} />
        </button>
        <div className="zoom-level">{zoomLevel.toFixed(1)}x</div>
        <button className="zoom-button" onClick={handleZoomIn} disabled={zoomLevel >= maxZoom}>
          <MdZoomIn size={20} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-content">
            <h3>Camera Settings</h3>
            
            {/* Camera Mode Selection */}
            <div className="setting-group">
              <label>Camera Mode</label>
              <div className="setting-options">
                <button
                  className="setting-option active"
                  onClick={() => setShowSettings(false)}
                >
                  🎛️ Advanced Camera
                </button>
                {showNativeOption && (
                  <button
                    className="setting-option"
                    onClick={useNativeCamera}
                  >
                    📱 Native Camera
                  </button>
                )}
              </div>
            </div>
            
            {/* Resolution */}
            <div className="setting-group">
              <label>Resolution</label>
              <div className="setting-options">
                {['HD', 'FHD', '4K'].map(res => (
                  <button
                    key={res}
                    className={`setting-option ${settings.resolution === res ? 'active' : ''}`}
                    onClick={() => updateSetting('resolution', res as any)}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="setting-group">
              <label>Aspect Ratio</label>
              <div className="setting-options">
                {['16:9', '4:3', '1:1'].map(ratio => (
                  <button
                    key={ratio}
                    className={`setting-option ${settings.aspectRatio === ratio ? 'active' : ''}`}
                    onClick={() => updateSetting('aspectRatio', ratio as any)}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Scene Mode */}
            <div className="setting-group">
              <label>Scene Mode</label>
              <div className="setting-options">
                {[
                  { key: 'auto', label: 'Auto' },
                  { key: 'hdr', label: 'HDR' },
                  { key: 'night', label: 'Night' },
                  { key: 'portrait', label: 'Portrait' }
                ].map(mode => (
                  <button
                    key={mode.key}
                    className={`setting-option ${settings.sceneMode === mode.key ? 'active' : ''}`}
                    onClick={() => updateSetting('sceneMode', mode.key as any)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="setting-group">
              <label>Timer</label>
              <div className="setting-options">
                {[0, 3, 5, 10].map(time => (
                  <button
                    key={time}
                    className={`setting-option ${settings.timer === time ? 'active' : ''}`}
                    onClick={() => updateSetting('timer', time as any)}
                  >
                    {time === 0 ? 'Off' : `${time}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.gridLines}
                  onChange={(e) => updateSetting('gridLines', e.target.checked)}
                />
                Grid Lines
              </label>
            </div>

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.burstMode}
                  onChange={(e) => updateSetting('burstMode', e.target.checked)}
                />
                Burst Mode
              </label>
            </div>

            {/* Manual Controls */}
            <div className="setting-group">
              <label>Exposure: {settings.exposure}</label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={settings.exposure}
                onChange={(e) => updateSetting('exposure', parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-group">
              <label>White Balance</label>
              <select
                value={settings.whiteBalance}
                onChange={(e) => updateSetting('whiteBalance', e.target.value as any)}
              >
                <option value="auto">Auto</option>
                <option value="daylight">Daylight</option>
                <option value="cloudy">Cloudy</option>
                <option value="tungsten">Tungsten</option>
                <option value="fluorescent">Fluorescent</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="quickcard-controls">
        <button className="control-button" onClick={handleSwitchCamera}>
          <MdCameraswitch size={24} color="white" />
        </button>

        <button
          className="capture-button"
          onClick={handleCapturePhoto}
          disabled={!cameraReady || !userLocation || isCapturing}
          style={{
            backgroundColor: cameraReady && userLocation && !isCapturing ? '#007aff' : '#666',
            border: '3px solid white',
            position: 'relative',
            width: 80,
            height: 80,
            borderRadius: '50%',
            fontSize: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isCapturing ? '⏳' : 
           settings.burstMode ? '📸📸📸' :
           settings.timer > 0 ? <MdTimer size={32} /> :
           '📸'}
        </button>

        <button
          className="control-button"
          onClick={() => updateSetting('gridLines', !settings.gridLines)}
        >
          <MdGrid3X3 size={24} color={settings.gridLines ? '#007aff' : 'white'} />
        </button>
      </div>
    </div>
  );
};

export default QuickcardCameraView; 