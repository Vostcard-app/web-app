// src/components/ScrollingCameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaSync } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo } = useVostcard();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
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
      console.error('Error accessing camera', err);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const handleStartRecording = () => {
    if (!stream) return;
    recordedChunks.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideo(url);
      navigate('/create-step1');
    };

    recorder.start();
    setIsRecording(true);

    // Automatically stop after 30 seconds
    setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
        setIsRecording(false);
      }
    }, 30000);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div
      style={{
        backgroundColor: 'black',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 🎥 Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 🔄 Camera Flip */}
      <div
        onClick={toggleCamera}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: 'white',
          borderRadius: '50%',
          padding: 10,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}
      >
        <FaSync size={20} color="#002B4D" />
      </div>

      {/* 🔴 Record Button */}
      <div
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        style={{
          position: 'absolute',
          bottom: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: isRecording ? '#555' : 'red',
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: '6px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            width: 24,
            height: 24,
            borderRadius: '50%',
          }}
        />
      </div>
    </div>
  );
};

export default ScrollingCameraView;