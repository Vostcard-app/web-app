// src/components/ScrollingCameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCameraRotate } from 'react-icons/fa';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo } = useVostcard();

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const startCamera = async () => {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode },
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraFacingMode]);

  const handleCameraSwitch = () => {
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!stream) return;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(blob);
      setVideo(videoUrl);
      navigate('/create-step1');
    };

    mediaRecorder.start();
    setIsRecording(true);
    setCountdown(30);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleDismiss = () => {
    navigate('/create-step1');
  };

  return (
    <div
      style={{
        backgroundColor: 'black',
        height: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 🎥 Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
      />

      {/* ⏳ Countdown */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 48,
            fontWeight: 'bold',
          }}
        >
          {countdown}
        </div>
      )}

      {/* 🔘 Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 40px',
        }}
      >
        {/* ❌ Dismiss */}
        <AiOutlineClose
          size={36}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={handleDismiss}
        />

        {/* 🔴 Record */}
        <div
          onClick={handleRecord}
          style={{
            backgroundColor: isRecording ? 'white' : 'red',
            width: 80,
            height: 80,
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
              backgroundColor: isRecording ? 'red' : 'white',
              borderRadius: isRecording ? 4 : '50%',
              width: 24,
              height: 24,
            }}
          />
        </div>

        {/* 🔄 Camera Switch */}
        <FaCameraRotate
          size={32}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={handleCameraSwitch}
        />
      </div>
    </div>
  );
};

export default ScrollingCameraView;