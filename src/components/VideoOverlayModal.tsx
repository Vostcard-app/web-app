import React, { useEffect, useRef } from 'react';

type VideoOverlayModalProps = {
  isOpen: boolean;
  src: string | null | undefined;
  onClose: () => void;
};

const VideoOverlayModal: React.FC<VideoOverlayModalProps> = ({ isOpen, src, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const stopAndCloseVideo = () => {
    try {
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.removeAttribute('src');
        v.load();
      }
    } catch {}
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopAndCloseVideo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen || !src) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={stopAndCloseVideo}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          stopAndCloseVideo();
        }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 2001,
          fontSize: '18px',
          color: 'white',
          backdropFilter: 'blur(10px)'
        }}
        aria-label="Close video"
      >
        ×
      </button>

      <div style={{
        position: 'relative',
        maxWidth: '90vw',
        maxHeight: '90vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          playsInline
          // @ts-expect-error vendor attribute
          webkit-playsinline="true"
          controlsList="nodownload nofullscreen noremoteplayback"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: 8,
            backgroundColor: '#000'
          }}
          onEnded={stopAndCloseVideo}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default VideoOverlayModal;


