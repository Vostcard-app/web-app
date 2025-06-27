// src/components/ScrollingCameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCameraswitch } from 'react-icons/md';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const { setVideo } = useVostcard();

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [cameraFacingMode]);

  const startCamera = async () => {
    stopCamera();

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode },
        audio: true,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Error accessing camera', err);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const toggleCamera = () => {
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleRecord = () => {
    if (recording) {
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
      const url = URL.createObjectURL(blob);
      setVideo(url);
      navigate('/create-step1');
    };

    mediaRecorder.start();
    setRecording(true);
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
    setRecording(false);
    setCountdown(0);
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
      {/* 🔵 Camera Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* ⏱️ Countdown Timer */}
      {recording && (
        <div
          style={{
            position: 'absolute',
            top: 100,
            width: '100%',
            textAlign: 'center',
            fontSize: 48,
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          {countdown}
        </div>
      )}

      {/* 🔘 Bottom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 80,
        }}
      >
        {/* ❌ Dismiss */}
        <div
          onClick={() => navigate('/create-step1')}
          style={{ cursor: 'pointer' }}
        >
          <AiOutlineClose size={36} color="white" />
        </div>

        {/* 🔴 Record Button */}
        <div
          onClick={handleRecord}
          style={{
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
          {recording ? (
            <div
              style={{
                backgroundColor: 'white',
                width: 24,
                height: 24,
                borderRadius: 4,
              }}
            />
          ) : (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '50%',
                width: 24,
                height: 24,
              }}
            />
          )}
        </div>

        {/* 🔄 Swap Camera */}
        <div onClick={toggleCamera} style={{ cursor: 'pointer' }}>
          <MdCameraswitch size={36} color="white" />
        </div>
      </div>
    </div>
  );
};

export default ScrollingCameraView;