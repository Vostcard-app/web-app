import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

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
  autoPlayInterval = 3000,
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
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    showControlsTemporarily();
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    showControlsTemporarily();
  };

  const pauseAutoPlay = () => {
    setIsPaused(true);
    // Resume after 5 seconds of no interaction
    setTimeout(() => setIsPaused(false), 5000);
  };

  const toggleAutoPlay = () => {
    setIsPaused(!isPaused);
    showControlsTemporarily();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => setShowControls(false), 3000);
    setControlsTimeout(timeout);
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

      {/* Auto-play indicator */}
      {autoPlay && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            zIndex: 2001,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isPaused ? '⏸️' : '▶️'} Slideshow {isPaused ? 'Paused' : 'Playing'}
        </div>
      )}



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
            objectFit: 'cover',
            userSelect: 'none',
            imageRendering: '-webkit-optimize-contrast',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
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

      {/* Pagination Dots */}
      {photos.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 2001,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none'
          }}
        >
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                pauseAutoPlay();
                setCurrentIndex(index);
                showControlsTemporarily();
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
      )}




    </div>
  );
};

export default MultiPhotoModal; 