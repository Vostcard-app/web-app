import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { MdFlipCameraIos } from 'react-icons/md';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { useScriptContext } from '../context/ScriptContext';

const RECORD_DURATION = 30; // seconds

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentVostcard, currentVostcard, setVideo, setScript } = useVostcard();
  const { user } = useAuth();
  const { currentScript } = useScriptContext();

  // Get script from URL or context
  const params = new URLSearchParams(location.search);
  const scriptFromUrl = params.get('script');
  const scriptText = scriptFromUrl || currentScript || '';

  // Camera and recording refs/states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(RECORD_DURATION);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);

  // For script overlay animation
  const overlayRef = useRef<HTMLDivElement>(null);

  // Start camera on mount or when facing mode changes
  useEffect(() => {
    const startCamera = async () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacingMode },
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError('Error accessing camera/microphone.');
        console.error(err);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line
  }, [cameraFacingMode]);

  // Flip camera
  const toggleCamera = () => {
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Handle recording
  const handleRecord = () => {
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }
    if (!user) {
      alert('❌ Please log in again.');
      navigate('/');
      return;
    }
    if (!stream) {
      alert('Camera not ready.');
      return;
    }

    // Geolocation (optional, can be removed if not needed)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (currentVostcard) {
          setCurrentVostcard({
            ...currentVostcard,
            geo,
            createdAt: new Date().toISOString(),
          });
        }
      },
      (error) => {
        console.warn('Failed to capture location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );

    // Start recording
    const recordedChunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      setVideo(blob);
      setScript(scriptText); // Save script in context for next step
      navigate('/create-step1');
    };

    mediaRecorder.start();
    setRecording(true);

    // Start countdown and stop after RECORD_DURATION
    setCountdown(RECORD_DURATION);
    let time = RECORD_DURATION;
    const interval = setInterval(() => {
      time -= 1;
      setCountdown(time);
      if (time <= 0) {
        mediaRecorder.stop();
        setRecording(false);
        clearInterval(interval);
      }
    }, 1000);

    // Start script overlay animation
    if (overlayRef.current) {
      overlayRef.current.style.transition = 'none';
      overlayRef.current.style.transform = 'translateY(100%)';
      setTimeout(() => {
        if (overlayRef.current) {
          overlayRef.current.style.transition = `transform ${RECORD_DURATION}s linear`;
          overlayRef.current.style.transform = 'translateY(-100%)';
        }
      }, 50);
    }
  };

  // Reset overlay animation when not recording
  useEffect(() => {
    if (!recording && overlayRef.current) {
      overlayRef.current.style.transition = 'none';
      overlayRef.current.style.transform = 'translateY(100%)';
    }
  }, [recording, scriptText]);

  return (
    <div
      style={{
        backgroundColor: 'black',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* 📷 Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      />

      {/* 📜 Scrolling Script Overlay */}
      {scriptText && (
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            width: '100%',
            height: '200px',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <div
            ref={overlayRef}
            style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '2px 2px 5px black',
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
              willChange: 'transform',
              transform: 'translateY(66%)',
            }}
          >
            {scriptText}
          </div>
        </div>
      )}

      {/* ⏱️ Countdown */}
      {recording && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: 48,
            fontWeight: 'bold',
            zIndex: 3,
          }}
        >
          {countdown}
        </div>
      )}

      {/* 🔘 Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 4,
        }}
      >
        {/* Close Button */}
        <AiOutlineClose
          size={40}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')}
        />

        {/* Record Button */}
        <div
          onClick={handleRecord}
          style={{
            backgroundColor: 'red',
            width: 90,
            height: 90,
            borderRadius: '50%',
            border: '6px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: recording ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 12px rgba(0,0,0,0.5)',
            opacity: recording ? 0.7 : 1,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              width: 32,
              height: 32,
              borderRadius: recording ? 4 : '50%',
            }}
          />
        </div>

        {/* Flip Camera Button */}
        <MdFlipCameraIos
          size={40}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={toggleCamera}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,0,0,0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            zIndex: 10,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default ScrollingCameraView;