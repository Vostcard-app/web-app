import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSyncAlt, FaTimes } from 'react-icons/fa';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(30);
  const [script] = useState('Welcome to Vōstcard! Share your story in 30 seconds. Speak clearly and enjoy.');

  // 🔥 Start Camera
  useEffect(() => {
    const startCamera = async () => {
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

    startCamera();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode]);

  // 🔥 Timer countdown
  useEffect(() => {
    if (isRecording) {
      if (timer === 0) {
        stopRecording();
      }
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording, timer]);

  // 🔄 Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // 🎥 Start Recording
  const startRecording = () => {
    if (!stream) return;
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorder.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      console.log('Recorded video URL:', url);
      // 🔗 Save video URL to context or storage here
      navigate('/create-step1');
    };

    recorder.start();
    setIsRecording(true);
    setTimer(30);
  };

  // 🛑 Stop Recording
  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'black' }}>
      {/* 🎥 Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 🔡 Script Scrolling */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          width: '100%',
          textAlign: 'center',
          color: 'white',
          fontSize: 20,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            animation: 'scroll 20s linear infinite',
          }}
        >
          {script} &nbsp; {script}
        </div>
      </div>

      <style>
        {`
          @keyframes scroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}
      </style>

      {/* 🔄 Flip Camera */}
      <FaSyncAlt
        onClick={flipCamera}
        size={28}
        color="white"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          cursor: 'pointer',
        }}
      />

      {/* ❌ Dismiss */}
      <FaTimes
        onClick={() => navigate('/create-step1')}
        size={28}
        color="white"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          cursor: 'pointer',
        }}
      />

      {/* ⏱️ Timer (double size) */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: '50%',
            transform: 'translateX(50%)',
            color: 'white',
            fontSize: 48,
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '6px 16px',
            borderRadius: 12,
          }}
        >
          {timer}s
        </div>
      )}

      {/* 🔴 Record Button */}
      <div
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          backgroundColor: 'red',
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: '6px solid white',
          position: 'absolute',
          bottom: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
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
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              backgroundColor: 'white',
              width: 24,
              height: 24,
              borderRadius: '50%',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ScrollingCameraView;