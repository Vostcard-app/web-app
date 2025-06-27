import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdFlipCameraIos } from 'react-icons/md';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo } = useVostcard();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
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
    stream?.getTracks().forEach((track) => track.stop());
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const startRecording = () => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideo(url);
      navigate('/create-step1');
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) {
          return prev - 1;
        } else {
          clearInterval(countdownInterval);
          stopRecording();
          return 0;
        }
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setCountdown(30); // Reset timer when finished
  };

  return (
    <div
      style={{
        backgroundColor: 'black',
        height: '100vh',
        width: '100vw',
        position: 'relative',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 🔢 Countdown Always Visible */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: 64,
          fontWeight: 'bold',
        }}
      >
        {countdown}
      </div>

      {/* ❌ Close Button */}
      <AiOutlineClose
        onClick={() => {
          if (isRecording) stopRecording();
          navigate('/create-step1');
        }}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: 'white',
          fontSize: 32,
          cursor: 'pointer',
        }}
      />

      {/* 🔄 Flip Camera */}
      <MdFlipCameraIos
        onClick={flipCamera}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          color: 'white',
          fontSize: 32,
          cursor: 'pointer',
        }}
      />

      {/* 🔴 Record Button */}
      <div
        onClick={() => {
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
        }}
        style={{
          position: 'absolute',
          bottom: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
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
        {isRecording ? (
          <div
            style={{
              backgroundColor: 'white',
              width: 24,
              height: 24,
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
    </div>
  );
};

export default ScrollingCameraView;