import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { FaCameraRotate } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo } = useVostcard();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [cameraFacingMode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (recording && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    if (countdown === 0) {
      stopRecording();
    }
    return () => clearTimeout(timer);
  }, [recording, countdown]);

  const startCamera = async () => {
    stopCamera();
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: cameraFacingMode },
      audio: true,
    });
    setStream(newStream);
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const startRecording = () => {
    if (stream) {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideo(url);
        navigate('/create-step1');
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setCountdown(30);
      setRecording(true);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const toggleCamera = () => {
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div
      style={{
        backgroundColor: 'black',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 🎥 Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
      />

      {/* 🔢 Countdown Timer */}
      {recording && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: 48,
            fontWeight: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 16px',
            borderRadius: 12,
          }}
        >
          {countdown}
        </div>
      )}

      {/* 🔘 Buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 40px',
        }}
      >
        {/* ❌ Dismiss */}
        <AiOutlineClose
          size={40}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')}
        />

        {/* ⭕ Record */}
        <div
          onClick={recording ? stopRecording : startRecording}
          style={{
            backgroundColor: 'red',
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
          {recording ? (
            <div
              style={{
                width: 24,
                height: 24,
                backgroundColor: 'white',
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
        <FaCameraRotate
          size={40}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={toggleCamera}
        />
      </div>
    </div>
  );
};

export default ScrollingCameraView;