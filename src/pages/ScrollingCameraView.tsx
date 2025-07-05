import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdFlipCameraIos } from 'react-icons/md';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { useScriptContext } from '../context/ScriptContext';

interface ScrollingCameraViewProps {}

const ScrollingCameraView: React.FC<ScrollingCameraViewProps> = () => {
  const navigate = useNavigate();
  const { setCurrentVostcard, currentVostcard, setVideo } = useVostcard();
  const { user } = useAuth();
  const { currentScript } = useScriptContext();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [countdown, setCountdown] = useState(30);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  };

  const toggleCamera = () => {
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraFacingMode]);

  const handleRecord = () => {
    if (!user) {
      alert('❌ Please log in again.');
      navigate('/');
      return;
    }
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

    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      const recordedChunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream as MediaStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        setVideo(blob);
        navigate('/create-step1');
      };

      mediaRecorder.start();
      setRecording(true);

      // Countdown logic
      let time = 30;
      setCountdown(time);
      const interval = setInterval(() => {
        time -= 1;
        setCountdown(time);
        if (time <= 0) {
          mediaRecorder.stop();
          setRecording(false);
          clearInterval(interval);
        }
      }, 1000);

      // Start script scrolling animation
      if (scrollRef.current && currentScript) {
        scrollRef.current.animate(
          [
            { transform: 'translateY(100%)' },
            { transform: 'translateY(-100%)' },
          ],
          {
            duration: 30000, // Match countdown duration
            iterations: 1,
            easing: 'linear',
          }
        );
      }
    }
  };

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
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 📜 Scrolling Script */}
      {currentScript && (
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
          }}
        >
          <div
            ref={scrollRef}
            style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '2px 2px 5px black',
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {currentScript}
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
          }}
        >
          {countdown}
        </div>
      )}

      {/* 🔘 Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(20% + 20px)',
          display: 'flex',
          width: '100%',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        <AiOutlineClose
          size={40}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')}
        />

        {/* ⭕ Record Button */}
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
                width: 24,
                height: 24,
                borderRadius: '50%',
              }}
            />
          )}
        </div>

        <MdFlipCameraIos
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