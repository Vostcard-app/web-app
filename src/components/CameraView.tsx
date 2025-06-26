// src/components/CameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdCameraswitch } from 'react-icons/md';

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const setPhoto = location.state?.setPhoto;

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
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

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const photoData = canvas.toDataURL('image/png');
      if (setPhoto) {
        setPhoto(photoData);
      }
      stopCamera();
      navigate(-1);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: 'black',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* 🔴 Close Button */}
      <div
        onClick={() => {
          stopCamera();
          navigate(-1);
        }}
        style={{ ...topButtonStyle, left: 20 }}
      >
        <AiOutlineClose size={24} />
      </div>

      {/* 🔄 Toggle Camera */}
      <div
        onClick={toggleCamera}
        style={{ ...topButtonStyle, right: 20 }}
      >
        <MdCameraswitch size={24} />
      </div>

      {/* 📸 Capture Button */}
      <div
        onClick={takePhoto}
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'red',
          width: 70,
          height: 70,
          borderRadius: '50%',
          border: '6px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
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

const topButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 25,
  backgroundColor: 'white',
  borderRadius: '50%',
  width: 48,
  height: 48,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'black',
  cursor: 'pointer',
  zIndex: 3,
};

export default CameraView;