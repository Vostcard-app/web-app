import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlay, FaPause, FaTv, FaStopCircle } from 'react-icons/fa';

interface MultiPhotoModalProps {
  photos: string[];
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

  // Initialize casting capability
  useEffect(() => {
    if (isOpen && 'PresentationRequest' in window) {
      try {
        const request = new (window as any).PresentationRequest([
          'https://www.youtube.com/tv',
          'https://cast.google.com/tv'
        ]);
        setPresentationRequest(request);
        
        // Check if casting is available
        request.getAvailability().then((availability: any) => {
          setCastAvailable(availability.value);
          availability.onchange = () => setCastAvailable(availability.value);
        }).catch(() => {
          setCastAvailable(false);
        });
      } catch (error) {
        console.log('Presentation API not supported');
        setCastAvailable(false);
      }
    }
  }, [isOpen]);

  // Reset index when modal opens or photos change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setShowControls(true);
      setIsPaused(false);
      // Auto-hide controls after 3 seconds
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setControlsTimeout(timeout);
    }
  }, [isOpen, initialIndex]);

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

  // Casting functions
  const startCasting = async () => {
    if (!presentationRequest) return;
    
    try {
      const connection = await presentationRequest.start();
      setPresentationConnection(connection);
      setCasting(true);
      
      // Send initial slideshow data to the receiver
      const slideshowData = {
        type: 'SLIDESHOW_START',
        photos,
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
      
    } catch (error) {
      console.error('Failed to start casting:', error);
      alert('Unable to connect to cast device. Please try again.');
    }
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

      {/* Enhanced Control Bar */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2001,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        {/* Auto-play indicator */}
        {autoPlay && (
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {casting ? '📺' : (isPaused ? '⏸️' : '▶️')} 
            {casting ? 'Casting' : `Slideshow ${isPaused ? 'Paused' : 'Playing'}`}
          </div>
        )}

        {/* Cast Button */}
        {castAvailable && (
          <button
            onClick={casting ? stopCasting : startCasting}
            style={{
              backgroundColor: casting ? 'rgba(255, 59, 48, 0.8)' : 'rgba(0, 122, 255, 0.8)',
              border: 'none',
              borderRadius: '20px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            title={casting ? 'Stop Casting' : 'Cast to Device'}
          >
            {casting ? <FaStopCircle color="white" size={18} /> : <FaTv color="white" size={18} />}
          </button>
        )}
      </div>



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
          src={photos[currentIndex]}
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
            console.error('Failed to load image:', photos[currentIndex]);
            (e.target as HTMLImageElement).src = photos[currentIndex] + '?retry=' + Date.now();
          }}
          onLoad={(e) => {
            console.log('✅ Image loaded successfully:', {
              src: photos[currentIndex],
              naturalWidth: (e.target as HTMLImageElement).naturalWidth,
              naturalHeight: (e.target as HTMLImageElement).naturalHeight,
              displayWidth: (e.target as HTMLImageElement).width,
              displayHeight: (e.target as HTMLImageElement).height
            });
          }}
        />
      </div>

      {/* Enhanced Bottom Controls */}
      {photos.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            zIndex: 2001,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none'
          }}
        >
          {/* Manual Navigation Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '25px',
              padding: '12px 20px'
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

            {/* Progress Indicator */}
            <div
              style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                minWidth: '60px',
                textAlign: 'center'
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
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Next Image"
            >
              <FaChevronRight size={16} />
            </button>
          </div>

          {/* Pagination Dots */}
          <div
            style={{
              display: 'flex',
              gap: '8px'
            }}
          >
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
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                  transform: index === currentIndex ? 'scale(1.2)' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (index !== currentIndex) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== currentIndex) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                  }
                }}
              />
            ))}
          </div>
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