// src/components/ScrollingCameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdCameraswitch } from 'react-icons/md';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo } = useVostcard();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: true,
    });
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const startRecording = () => {
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const blobUrl = URL.createObjectURL(blob);
      setVideo(blobUrl); 
      navigate('/create-step1');
    };

    mediaRecorder.start();
    setRecording(true);
    setCountdown(30);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          mediaRecorder.stop();
          setRecording(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: 'black' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Close Button */}
      <div style={{ ...topButtonStyle, left: 20 }} onClick={() => { stopCamera(); navigate(-1); }}>
        <AiOutlineClose size={24} />
      </div>

      {/* Swap Camera */}
      <div style={{ ...topButtonStyle, right: 40 }} onClick={toggleCamera}>
        <MdCameraswitch size={24} />
      </div>

      {/* Countdown */}
      <div style={countdownStyle}>
        {countdown}
      </div>

      {/* Record Button */}
      <div
        onClick={recording ? stopRecording : startRecording}
        style={recordButtonStyle}
      >
        {recording ? (
          <div style={stopIconStyle} />
        ) : (
          <div style={dotIconStyle} />
        )}
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

const countdownStyle: React.CSSProperties = {
  backgroundColor: 'black',
  color: 'white',
  padding: '8px 16px',
  borderRadius: 12,
  fontSize: 40,
  zIndex: 3,
  position: 'absolute',
  top: 25,
  left: '50%',
  transform: 'translateX(-50%)',
};

const recordButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '25%',  // <-- 1/4 up from bottom
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
};

const stopIconStyle: React.CSSProperties = {
  backgroundColor: 'white',
  width: 24,
  height: 24,
};

const dotIconStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '50%',
  width: 24,
  height: 24,
};

export default ScrollingCameraView;