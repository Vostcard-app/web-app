// src/components/ScrollingCameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSyncAlt, FaTimes } from 'react-icons/fa';
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
      setVideo(blobUrl); // ✅ Save video
      navigate('/create-step1'); // ✅ Return to step 1 after recording stops
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
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Top Buttons */}
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <FaTimes
          color="white"
          size={28}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            stopCamera();
            navigate(-1);
          }}
        />
      </div>

      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <FaSyncAlt
          color="white"
          size={28}
          style={{ cursor: 'pointer' }}
          onClick={toggleCamera}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 70,
        }}
      >
        <FaHome
          color="white"
          size={28}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            stopCamera();
            navigate('/');
          }}
        />
      </div>

      {/* Countdown */}
      <div
        style={{
          position: 'absolute',
          top: 25,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 12,
          fontSize: 36,
          fontWeight: 'bold',
        }}
      >
        {countdown}
      </div>

      {/* Record Button */}
      <div
        onClick={recording ? stopRecording : startRecording}
        style={{
          position: 'absolute',
          bottom: 60, // ✅ moved higher by 20px
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
        {recording ? (
          <div style={{ backgroundColor: 'white', width: 24, height: 24 }} />
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
    </div>
  );
};

export default ScrollingCameraView;