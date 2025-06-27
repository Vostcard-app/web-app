import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { FaSync } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo } = useVostcard();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = async () => {
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
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const toggleCamera = () => {
    stopCamera();
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const startRecording = () => {
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideo(url);
      navigate('/create-step1');
    };

    mediaRecorder.start();
    setIsRecording(true);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
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
    setCountdown(30);
  };

  const handleDismiss = () => {
    stopCamera();
    navigate('/create-step1');
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line
  }, [cameraFacingMode]);

  return (
    <div style={{ backgroundColor: 'black', height: '100vh', width: '100vw', position: 'relative' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
      />

      {/* 🔢 Countdown Timer */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: 48,
          fontWeight: 'bold',
        }}
      >
        {countdown}
      </div>

      {/* 🔘 Buttons Group */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        {/* ❌ Dismiss */}
        <AiOutlineClose
          onClick={handleDismiss}
          size={40}
          color="white"
          style={{ cursor: 'pointer' }}
        />

        {/* ⭕ Record */}
        <div
          onClick={() => (isRecording ? stopRecording() : startRecording())}
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
          {isRecording ? (
            <div
              style={{
                width: 28,
                height: 28,
                backgroundColor: 'red',
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

        {/* 🔄 Switch Camera */}
        <FaSync
          onClick={toggleCamera}
          size={36}
          color="white"
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  );
};

export default ScrollingCameraView;