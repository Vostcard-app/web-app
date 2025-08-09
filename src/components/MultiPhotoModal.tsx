import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlay, FaPause, FaTv, FaStopCircle } from 'react-icons/fa';

interface PhotoWithMetadata {
  url: string;
  title?: string;
  postTitle?: string;
  description?: string;
}

interface MultiPhotoModalProps {
  photos: string[] | PhotoWithMetadata[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  audioDuration?: number;
}

const MultiPhotoModal: React.FC<MultiPhotoModalProps> = ({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  title,
  autoPlay = false,
  autoPlayInterval = 5000,
  audioDuration
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [autoPlayTimer, setAutoPlayTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Casting states
  const [castAvailable, setCastAvailable] = useState(false);
  const [casting, setCasting] = useState(false);
  const [presentationRequest, setPresentationRequest] = useState<any>(null);
  const [presentationConnection, setPresentationConnection] = useState<any>(null);
  
  // Mobile detection for better casting UX
  const [isMobile, setIsMobile] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  // Helper functions to handle both string arrays and PhotoWithMetadata arrays
  const getPhotoUrl = (index: number): string => {
    const photo = photos[index];
    return typeof photo === 'string' ? photo : photo.url;
  };

  const getPhotoMetadata = (index: number): PhotoWithMetadata | null => {
    const photo = photos[index];
    return typeof photo === 'string' ? null : photo;
  };

  const getPhotoUrls = (): string[] => {
    return photos.map(photo => typeof photo === 'string' ? photo : photo.url);
  };

  // Calculate optimal interval based on audio duration if provided
  const getAutoPlayInterval = () => {
    if (audioDuration && photos.length > 1) {
      // Divide audio duration by number of photos for even distribution
      return Math.max((audioDuration * 1000) / photos.length, 2000); // Minimum 2 seconds per photo
    }
    return autoPlayInterval;
  };

  // Auto-advance functionality
  useEffect(() => {
    if (!isOpen || !autoPlay || photos.length <= 1 || isPaused) {
      if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
        setAutoPlayTimer(null);
      }
      return;
    }

    const interval = getAutoPlayInterval();
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, interval);

    setAutoPlayTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, autoPlay, currentIndex, photos.length, isPaused, audioDuration, autoPlayInterval]);

  // Enhanced mobile and device detection
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // iOS Detection
      if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        setDeviceType('ios');
        setIsMobile(true);
        return;
      }
      
      // Android Detection
      if (/android/i.test(userAgent)) {
        setDeviceType('android');
        setIsMobile(true);
        return;
      }
      
      // Other mobile devices
      if (/blackberry|iemobile|opera mini/i.test(userAgent)) {
        setIsMobile(true);
        setDeviceType('android'); // Default to android-like behavior
        return;
      }
      
      // Desktop
      setDeviceType('desktop');
      setIsMobile(false);
    };
    
    detectDevice();
  }, []);

  // Initialize casting capability
  useEffect(() => {
    if (isOpen) {
      // On mobile, always show cast button for better UX
      if (isMobile) {
        setCastAvailable(true); // Always show on mobile for testing
      }
      
      // Try to initialize Presentation API if available
      if ('PresentationRequest' in window) {
        try {
          const request = new (window as any).PresentationRequest([
            'https://www.youtube.com/tv',
            'https://cast.google.com/tv'
          ]);
          setPresentationRequest(request);
          
          // Check if casting is available
          request.getAvailability().then((availability: any) => {
            setCastAvailable(availability.value || isMobile); // Always true on mobile
            availability.onchange = () => setCastAvailable(availability.value || isMobile);
          }).catch(() => {
            setCastAvailable(isMobile); // Show on mobile even if API fails
          });
        } catch (error) {
          console.log('Presentation API not supported');
          setCastAvailable(isMobile); // Show on mobile even if not supported
        }
      } else {
        // No Presentation API, but show on mobile anyway
        setCastAvailable(isMobile);
      }
    }
  }, [isOpen, isMobile]);

  // Reset index when modal opens or photos change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setShowControls(true);
      setIsPaused(false);
      // Auto-hide controls after 5 seconds (longer for better accessibility)
      const timeout = setTimeout(() => setShowControls(false), 5000);
      setControlsTimeout(timeout);
    }
  }, [isOpen, initialIndex]);

  // Always show controls when casting is available (for better accessibility)
  useEffect(() => {
    if (castAvailable && isOpen) {
      setShowControls(true);
      // Don't auto-hide controls when casting is available
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
        setControlsTimeout(null);
      }
    }
  }, [castAvailable, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          pauseAutoPlay();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          pauseAutoPlay();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case ' ':
          e.preventDefault();
          toggleAutoPlay();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      if (controlsTimeout) clearTimeout(controlsTimeout);
      if (autoPlayTimer) clearTimeout(autoPlayTimer);
    };
  }, [isOpen]);

  if (!isOpen || photos.length === 0) return null;

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % photos.length;
    setCurrentIndex(newIndex);
    showControlsTemporarily();
    sendCastUpdate({ type: 'INDEX_CHANGED', index: newIndex });
  };

  const goToPrevious = () => {
    const newIndex = (currentIndex - 1 + photos.length) % photos.length;
    setCurrentIndex(newIndex);
    showControlsTemporarily();
    sendCastUpdate({ type: 'INDEX_CHANGED', index: newIndex });
  };

  const pauseAutoPlay = () => {
    setIsPaused(true);
    // Resume after 5 seconds of no interaction
    setTimeout(() => setIsPaused(false), 5000);
  };

  const toggleAutoPlay = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    showControlsTemporarily();
    sendCastUpdate({ type: 'PLAY_STATE_CHANGED', playing: !newPausedState });
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => setShowControls(false), 3000);
    setControlsTimeout(timeout);
  };

  // Platform-specific casting guidance
  const getCastingInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return {
          title: '📺 Cast to TV - iOS',
          instructions: `To cast this slideshow from your iPhone/iPad:

🎯 RECOMMENDED METHODS:

1️⃣ AirPlay (Apple TV/Smart TV):
   • Swipe down from top-right corner (Control Center)
   • Tap "Screen Mirroring" 
   • Select your Apple TV or AirPlay-compatible TV
   • Return to this slideshow

2️⃣ Google Home App (Chromecast):
   • Open Google Home app
   • Tap "Cast my screen"
   • Select your Chromecast
   • Return to this slideshow

3️⃣ Smart TV Apps:
   • Use your TV's native casting app
   • Look for "Screen Share" or "Mirroring"

💡 TIP: Make sure your device and TV are on the same WiFi network!`
        };
      
      case 'android':
        return {
          title: '📺 Cast to TV - Android',
          instructions: `To cast this slideshow from your Android device:

🎯 RECOMMENDED METHODS:

1️⃣ Built-in Casting:
   • Swipe down twice (Quick Settings)
   • Tap "Cast", "Smart View", or "Screen Share"
   • Select your TV or Chromecast
   • Return to this slideshow

2️⃣ Google Home App (Chromecast):
   • Open Google Home app
   • Tap "Cast my screen"
   • Select your Chromecast device
   • Return to this slideshow

3️⃣ Samsung Smart View:
   • Open Smart View app (Samsung devices)
   • Select your Samsung TV
   • Start screen mirroring

4️⃣ Miracast/WiFi Direct:
   • Settings → Connected devices → Cast
   • Select your Miracast-compatible TV

💡 TIP: Make sure your device and TV are on the same WiFi network!`
        };
      
      default:
        return {
          title: '📺 Cast to TV - Desktop',
          instructions: `To cast this slideshow from your computer:

🎯 RECOMMENDED METHODS:

1️⃣ Chrome Browser:
   • Click the three dots menu (⋮)
   • Select "Cast..."
   • Choose your Chromecast or smart TV
   • Select "Cast tab" or "Cast desktop"

2️⃣ Edge Browser:
   • Click the three dots menu (⋯)
   • Select "Cast media to device"
   • Choose your casting device

3️⃣ Windows 10/11:
   • Press Windows + K
   • Select your wireless display
   • Or use "Connect" app

💡 TIP: Make sure your computer and TV are on the same WiFi network!`
        };
    }
  };

  // Enhanced casting function with platform-specific support
  const startCasting = async () => {
    // Try Presentation API first (Chrome/Edge)
    if (presentationRequest) {
      try {
        const connection = await presentationRequest.start();
        setPresentationConnection(connection);
        setCasting(true);
        
        // Send initial slideshow data to the receiver
        const slideshowData = {
          type: 'SLIDESHOW_START',
          photos: getPhotoUrls(), // Convert to string array for casting
          currentIndex,
          autoPlay,
          autoPlayInterval: getAutoPlayInterval(),
          title
        };
        
        connection.send(JSON.stringify(slideshowData));
        
        // Listen for messages from the receiver
        connection.onmessage = (event: any) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'INDEX_CHANGED') {
              setCurrentIndex(message.index);
            } else if (message.type === 'PLAY_STATE_CHANGED') {
              setIsPaused(!message.playing);
            }
          } catch (error) {
            console.error('Error parsing cast message:', error);
          }
        };
        
        // Handle connection close
        connection.onclose = () => {
          setCasting(false);
          setPresentationConnection(null);
        };
        
        connection.onterminate = () => {
          setCasting(false);
          setPresentationConnection(null);
        };
        
        return; // Success - exit early
      } catch (error) {
        console.log('Presentation API failed, showing manual instructions');
      }
    }

    // Fallback: Show platform-specific instructions
    const castingInfo = getCastingInstructions();
    alert(castingInfo.instructions);
  };

  const stopCasting = () => {
    if (presentationConnection) {
      presentationConnection.terminate();
      setCasting(false);
      setPresentationConnection(null);
    }
  };

  // Send updates to cast receiver
  const sendCastUpdate = (data: any) => {
    if (casting && presentationConnection) {
      try {
        presentationConnection.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending cast update:', error);
      }
    }
  };

  const handleImageTap = () => {
    setShowControls(!showControls);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    if (!showControls) {
      // If showing controls, auto-hide after 3 seconds
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setControlsTimeout(timeout);
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    pauseAutoPlay(); // Pause auto-advance when user starts swiping
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && photos.length > 1) {
      goToNext();
    }
    if (isRightSwipe && photos.length > 1) {
      goToPrevious();
    }
  };

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 2001,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
      >
        <FaTimes color="white" size={20} />
      </button>

      {/* Left Side - Cast Button */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 2001,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        {/* Cast Button - Always show for debugging, with different styles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Cast Button - Show if available OR in development */}
          {(castAvailable || process.env.NODE_ENV === 'development') && (
            <button
              onClick={casting ? stopCasting : startCasting}
              disabled={!castAvailable}
              style={{
                backgroundColor: casting ? 'rgba(255, 59, 48, 0.8)' : 
                               castAvailable ? 'rgba(0, 122, 255, 0.8)' : 'rgba(128, 128, 128, 0.5)',
                border: 'none',
                borderRadius: '20px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: castAvailable ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s ease',
                opacity: castAvailable ? 1 : 0.6
              }}
              title={casting ? 'Stop Casting' : 
                     deviceType === 'ios' ? 'Cast via AirPlay or Screen Mirroring' :
                     deviceType === 'android' ? 'Cast via Google Cast or Screen Share' :
                     'Cast to Device'}
            >
              {casting ? <FaStopCircle color="white" size={18} /> : <FaTv color="white" size={18} />}
            </button>
          )}

          {/* Debug: Show casting availability status (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <div>Cast: {castAvailable ? 'Available' : 'Not Available'}</div>
              <div>Device: {deviceType.toUpperCase()}</div>
              <div>API: {'PresentationRequest' in window ? 'Supported' : 'Not Supported'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Center - Auto-play indicator removed for cleaner shared view */}



      {/* Main Image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: 'black'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleImageTap}
      >
        <img
          src={getPhotoUrl(currentIndex)}
          alt={`Photo ${currentIndex + 1}`}
          style={{
            width: '100vw',
            height: '100vh',
            objectFit: 'contain',
            userSelect: 'none',
            imageRendering: '-webkit-optimize-contrast',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            borderRadius: '18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
            border: '4px solid white',
            background: '#f8f9fa',
            opacity: 1,
            transition: 'opacity 0.7s cubic-bezier(.4,0,.2,1)',
            animation: 'fadeInPhoto 0.7s cubic-bezier(.4,0,.2,1)'
          } as React.CSSProperties}
          draggable={false}
          loading="eager"
          fetchPriority="high"
          onError={(e) => {
            console.error('Failed to load image:', getPhotoUrl(currentIndex));
            (e.target as HTMLImageElement).src = getPhotoUrl(currentIndex) + '?retry=' + Date.now();
          }}
          onLoad={(e) => {
            console.log('✅ Image loaded successfully:', {
              src: getPhotoUrl(currentIndex),
              naturalWidth: (e.target as HTMLImageElement).naturalWidth,
              naturalHeight: (e.target as HTMLImageElement).naturalHeight,
              displayWidth: (e.target as HTMLImageElement).width,
              displayHeight: (e.target as HTMLImageElement).height
            });
          }}
        />
      </div>

      {/* Post Title Overlay */}
      {(() => {
        const metadata = getPhotoMetadata(currentIndex);
        const postTitle = metadata?.postTitle || metadata?.title;
        
        if (postTitle) {
          return (
            <div
              style={{
                position: 'absolute',
                bottom: '140px', // Position above the controls
                left: '20px',
                right: '20px',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 2001,
                opacity: showControls ? 1 : 0.8, // Slightly visible even when controls are hidden
                transition: 'opacity 0.3s ease',
                pointerEvents: 'none' // Don't interfere with touch events
              }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: '500',
                  textAlign: 'center',
                  maxWidth: '90%',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {postTitle}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Enhanced Bottom Controls */}
      {photos.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px', // Moved higher to avoid being cut off
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            zIndex: 2001,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '25px',
            padding: '12px 20px',
            // Ensure controls are always visible on all screen sizes
            maxWidth: '90vw',
            minHeight: '60px',
            width: 'auto'
          }}
        >
          {/* Previous Button */}
          <button
            onClick={goToPrevious}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              transition: 'background-color 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Previous Image"
          >
            <FaChevronLeft size={16} />
          </button>

          {/* Play/Pause Button */}
          {autoPlay && (
            <button
              onClick={toggleAutoPlay}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                transition: 'background-color 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={isPaused ? 'Resume Slideshow' : 'Pause Slideshow'}
            >
              {isPaused ? <FaPlay size={18} /> : <FaPause size={18} />}
            </button>
          )}

          {/* Pagination Dots */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Previous Image"
            >
              <FaChevronLeft size={16} />
            </button>

            {/* Play/Pause Button */}
            {autoPlay && (
              <button
                onClick={toggleAutoPlay}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isPaused ? 'Resume Slideshow' : 'Pause Slideshow'}
              >
                {isPaused ? <FaPlay size={18} /> : <FaPause size={18} />}
              </button>
            )}

            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  pauseAutoPlay();
                  setCurrentIndex(index);
                  showControlsTemporarily();
                  sendCastUpdate({ type: 'INDEX_CHANGED', index });
                }}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                title={`Go to image ${index + 1}`}
              />
            ))}
          </div>

          {/* Progress Indicator */}
          <div
            style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              minWidth: '60px',
              textAlign: 'center',
              flexShrink: 0
            }}
          >
            {currentIndex + 1} / {photos.length}
          </div>

          {/* Next Button */}
          <button
            onClick={goToNext}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              transition: 'background-color 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Next Image"
          >
            <FaChevronRight size={16} />
          </button>
        </div>
      )}




    </div>
  );
};

// Add fade-in animation keyframes for slideshow photos
// This must be outside the component
if (typeof window !== 'undefined' && !document.getElementById('fadeInPhoto-keyframes')) {
  const style = document.createElement('style');
  style.id = 'fadeInPhoto-keyframes';
  style.innerHTML = `@keyframes fadeInPhoto { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(style);
}

export default MultiPhotoModal; 