// src/components/ScrollingCameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { FaTimes, FaSync } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ScrollingCameraView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const navigate = useNavigate();
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // 🎥 Start the camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
  };

  // 🔴 Handle Recording Logic (fake recording for countdown)
  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setCountdown(30);
    } else {
      setIsRecording(true);
      let count = 30;
      const interval = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          setIsRecording(false);
          setCountdown(30);
        }
      }, 1000);
    }
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleExit = () => {
    stopCamera();
    navigate(-1);
  };

  return (
    <div style={containerStyle}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={videoStyle}
      />

      {/* ❌ Exit Button */}
      <div style={{ ...buttonStyle, left: 20, top: 20 }} onClick={handleExit}>
        <FaTimes size={24} color="white" />
      </div>

      {/* 🔄 Flip Camera */}
      <div style={{ ...buttonStyle, right: 20, top: 20 }} onClick={handleFlipCamera}>
        <FaSync size={24} color="white" />
      </div>

      {/* ⏳ Countdown */}
      {isRecording && (
        <div style={countdownStyle}>
          {countdown}
        </div>
      )}

      {/* 🔴 Record Button */}
      <div
        style={recordButtonStyle}
        onClick={handleRecord}
      >
        <div style={recordDotStyle} />
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  backgroundColor: 'black',
  overflow: 'hidden',
};

const videoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const buttonStyle: React.CSSProperties = {
  position: 'absolute',
  backgroundColor: 'rgba(0,0,0,0.5)',
  borderRadius: '50%',
  padding: 10,
  cursor: 'pointer',
  zIndex: 2,
};

const countdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'white',
  fontSize: 32,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  padding: '4px 12px',
  borderRadius: 8,
  zIndex: 2,
};

const recordButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 100, // 🔥 Increased from 60 to 100 to avoid nav bar
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
  zIndex: 2,
};

const recordDotStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  backgroundColor: 'white',
  borderRadius: '50%',
};

export default ScrollingCameraView;