// src/components/ScrollingCameraView.tsx

import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaSync } from 'react-icons/fa';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (stream) {
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks((prev) => [...prev, e.data]);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        console.log('Video URL:', url);
        navigate('/create-step1', { state: { videoUrl: url } });
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecordedChunks([]);
      setIsRecording(true);
      setCountdown(30);
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    if (isRecording && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (isRecording && countdown === 0) {
      stopRecording();
    }
  }, [isRecording, countdown]);

  const handleSwapCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
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
      <div style={topBarStyle}>
        <FaTimes size={32} color="white" style={{ cursor: 'pointer' }} onClick={() => navigate('/create-step1')} />
        <div style={countdownStyle}>{countdown}</div>
        <FaSync size={32} color="white" style={{ cursor: 'pointer' }} onClick={handleSwapCamera} />
      </div>

      <div style={recordButtonContainer}>
        <div
          style={isRecording ? recordButtonActive : recordButton}
          onClick={handleRecord}
        />
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

const topBarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 30,
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0 20px',
  alignItems: 'center',
};

const countdownStyle: React.CSSProperties = {
  color: 'white',
  fontSize: 24,
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: '6px 12px',
  borderRadius: 8,
};

const recordButtonContainer: React.CSSProperties = {
  position: 'absolute',
  bottom: '25%',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
};

const recordButton: React.CSSProperties = {
  width: 80,
  height: 80,
  backgroundColor: 'red',
  borderRadius: '50%',
  border: '5px solid white',
  cursor: 'pointer',
};

const recordButtonActive: React.CSSProperties = {
  ...recordButton,
  backgroundColor: 'darkred',
};

export default ScrollingCameraView;