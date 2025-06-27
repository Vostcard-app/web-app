import React, { useEffect, useRef, useState } from 'react';

const ScrollingCameraView = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      setCameraActive(false);
    };
  }, []);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', background: 'black' }}>
      
      {/* ✅ Toast Message */}
      {cameraActive && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 1000,
          }}
        >
          Camera is active. Tap the red button to record.
        </div>
      )}

      {/* 🎥 Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 🔴 Record Button */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'red',
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          border: '6px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => console.log('Record button clicked')}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '50%',
            width: 24,
            height: 24,
          }}
        />
      </div>
    </div>
  );
};

export default ScrollingCameraView;