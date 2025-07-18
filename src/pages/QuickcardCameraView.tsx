import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdCameraswitch } from 'react-icons/md';
import { useVostcard } from '../context/VostcardContext';
import CameraPermissionModal from '../components/CameraPermissionModal';
import './QuickcardCameraView.css';

const QuickcardCameraView: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const { createQuickcard } = useVostcard();
  
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Portrait dimensions - FIXED 9:16 aspect ratio for quickcards
  const PORTRAIT_WIDTH = 720;
  const PORTRAIT_HEIGHT = 1280;

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

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('📱 Starting quickcard camera...');
        
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.onloadedmetadata = () => {
            console.log('📱 Quickcard camera metadata loaded');
            setCameraReady(true);
          };
        }

      } catch (err) {
        console.error('❌ Quickcard camera failed:', err);
        const error = err as Error;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setShowPermissionModal(true);
        } else if (error.name === 'NotFoundError') {
          alert('No camera found. Please check your device.');
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
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  // Canvas animation loop - ALWAYS renders portrait 9:16 with proper orientation handling
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

  // Capture photo with proper orientation
  const capturePhoto = () => {
    if (!canvasRef.current || !userLocation) {
      alert('Camera not ready or location not available');
      return;
    }

    setIsCapturing(true);

    // Get the current frame from the canvas (which has proper orientation)
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        console.log('📸 Quickcard photo captured with proper orientation:', {
          size: blob.size,
          dimensions: `${PORTRAIT_WIDTH}x${PORTRAIT_HEIGHT}`,
          location: userLocation
        });
        
        // Create quickcard with photo and location
        createQuickcard(blob, userLocation);
        
        // Navigate to step 3 for quickcard editing
        navigate('/create-step3');
      } else {
        console.error('❌ Failed to capture photo');
        alert('Failed to capture photo. Please try again.');
        setIsCapturing(false);
      }
    }, 'image/jpeg', 0.9); // High quality JPEG
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

  return (
    <div className="quickcard-camera-container">
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

      {/* Canvas - PORTRAIT 9:16 display with proper orientation */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          objectFit: 'contain'
        }}
      />

      {/* Mode indicator */}
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
        📱 Quickcard Camera
      </div>

      {/* Location status */}
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

      {/* Camera facing mode indicator */}
      <div
        style={{
          position: 'absolute',
          top: '160px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        {facingMode === 'user' ? '🤳 Front Camera' : '📷 Back Camera'}
      </div>

      {/* Controls */}
      <div className="quickcard-controls">
        {/* Close Button */}
        <button
          className="control-button"
          onClick={closeCamera}
          style={{ marginRight: 15 }}
        >
          <AiOutlineClose size={24} color="white" />
        </button>

        {/* Capture Button */}
        <button
          className="capture-button"
          onClick={capturePhoto}
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
          {isCapturing ? '⏳' : '📸'}
        </button>

        {/* Switch Camera Button */}
        <button
          className="control-button"
          onClick={handleSwitchCamera}
          disabled={!cameraReady}
          style={{ marginLeft: 15 }}
        >
          <MdCameraswitch size={24} color="white" />
        </button>
      </div>
    </div>
  );
};

export default QuickcardCameraView; 