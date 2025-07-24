import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface MultiPhotoModalProps {
  photos: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const MultiPhotoModal: React.FC<MultiPhotoModalProps> = ({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  title
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset index when modal opens or photos change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setShowControls(true);
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
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
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
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        width: '100vw',
        height: '100vh'
      }}
    >
      {/* Close Button - Only shows when controls are visible */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 2001,
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <FaTimes />
        </button>
      </div>

      {/* Photo Counter & Title - Only shows when controls are visible */}
      {(photos.length > 1 || title) && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            color: 'white',
            zIndex: 2001,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none',
            backdropFilter: 'blur(10px)'
          }}
        >
          {title && <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}</div>}
          {photos.length > 1 && <div>{currentIndex + 1} of {photos.length}</div>}
        </div>
      )}

      {/* Previous Button - HIDDEN per user request - navigation via swipe and dots only */}

      {/* Next Button - HIDDEN per user request - navigation via swipe and dots only */}

      {/* Main Image - ENHANCED HIGH QUALITY FULL SCREEN */}
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
            // Enhanced quality settings
            imageRendering: '-webkit-optimize-contrast',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)', // Hardware acceleration
          } as React.CSSProperties}
          draggable={false}
          loading="eager"
          // Ensure highest quality loading
          fetchPriority="high"
          // Add error handling for better loading
          onError={(e) => {
            console.error('Failed to load image:', photos[currentIndex]);
            // Try reloading the image
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

      {/* Pagination Dots - Only shows when controls are visible */}
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

      {/* Swipe Instructions - Only shows initially */}
      {photos.length > 1 && showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
            textAlign: 'center',
            zIndex: 2001,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '4px 8px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}
        >
          Swipe or tap dots to navigate • Tap photo to hide controls
        </div>
      )}
    </div>
  );
};

export default MultiPhotoModal; 