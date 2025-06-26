// src/components/CameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSyncAlt, FaTimes } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CameraView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const navigate = useNavigate();
  const { activePhoto, setPhoto1, setPhoto2, setActivePhoto } = useVostcard();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageUrl = canvas.toDataURL('image/png');

      if (activePhoto === 'photo1') {
        setPhoto1(imageUrl);
      } else if (activePhoto === 'photo2') {
        setPhoto2(imageUrl);
      }

      setActivePhoto(null);
      navigate('/create-step2');
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: 'black', position: 'relative' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 🔙 Close */}
      <div
        style={topButtonStyle({ left: 20 })}
        onClick={() => {
          stopCamera();
          navigate('/create-step2');
        }}
      >
        <FaTimes size={20} />
      </div>

      {/* 🔄 Swap */}
      <div
        style={topButtonStyle({ right: 20 })}
        onClick={toggleCamera}
      >
        <FaSyncAlt size={20} />
      </div>

      {/* 🏠 Home */}
      <div
        style={topButtonStyle({ right: 80 })}
        onClick={() => {
          stopCamera();
          navigate('/');
        }}
      >
        <FaHome size={20} />
      </div>

      {/* 📸 Capture */}
      <div
        style={captureButtonStyle}
        onClick={handleTakePhoto}
      />
    </div>
  );
};

const topButtonStyle = ({ left, right }: { left?: number; right?: number }): React.CSSProperties => ({
  position: 'absolute',
  top: 20,
  left,
  right,
  width: 48,
  height: 48,
  borderRadius: '50%',
  backgroundColor: 'white',
  color: 'black',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  zIndex: 10,
});

const captureButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 40,
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'red',
  border: '6px solid white',
  width: 70,
  height: 70,
  borderRadius: '50%',
  cursor: 'pointer',
};

export default CameraView;