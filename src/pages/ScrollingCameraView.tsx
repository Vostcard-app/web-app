import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdFlipCameraIos } from 'react-icons/md';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentVostcard, currentVostcard, setVideo } = useVostcard();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [countdown, setCountdown] = useState(30);

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
    console.log('Stream state on record:', stream);
    if (!stream) {
      console.warn('⚠️ No media stream found. Restarting camera...');
      startCamera().then(() => {
        if (videoRef.current?.srcObject) {
          console.log('✅ Camera restarted. Retrying recording...');
          handleRecord();
        } else {
          console.error('❌ Failed to restart camera stream.');
        }
      });
      return;
    }
    if (!user) {
      alert('❌ Please log in again.');
      console.error('❌ User not logged in.');
      navigate('/');
      return;
    }
    // Capture user location when recording starts
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log('📍 Location captured at ScrollingCameraView:', geo);
        if (currentVostcard) {
          setCurrentVostcard({
            ...currentVostcard,
            geo,
            createdAt: new Date().toISOString(), // 📅 Add timestamp
          });
          console.log('📅 Vostcard creation date set:', new Date().toISOString());
        }
      },
      (error) => {
        console.warn('❌ Failed to capture location at ScrollingCameraView:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
    const username = user.displayName || 'Anonymous';
    if (!stream) {
      console.warn('⚠️ No media stream found. Restarting camera...');
      startCamera().then(() => {
        if (videoRef.current?.srcObject) {
          console.log('✅ Camera restarted. Retrying recording...');
          handleRecord();
        } else {
          console.error('❌ Failed to restart camera stream.');
        }
      });
      return;
    }
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
        // Use MP4 format for better iOS compatibility
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const videoType = isIOS ? 'video/mp4' : 'video/webm';
        
        const blob = new Blob(recordedChunks, { type: videoType });
        console.log('🎥 Video Blob created:', {
          size: blob.size,
          type: blob.type,
          isIOS: isIOS,
          userAgent: navigator.userAgent
        });
        // Wait for geolocation before saving video
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const geo = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            console.log('📍 Location captured at video save:', geo);
            setVideo(blob, geo);
            console.log('🎬 Video and geo set in VostcardContext, navigating to Step 1');
            navigate('/create-step1');
          },
          (error) => {
            console.warn('❌ Failed to capture location at video save:', error);
            setVideo(blob);
            console.log('🎬 Video set in VostcardContext (no geo), navigating to Step 1');
            navigate('/create-step1');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      };

      mediaRecorder.start();
      setRecording(true);

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
    }
  };

  // Function to lock screen orientation to portrait
  const lockOrientationToPortrait = async () => {
    if ('screen' in window && 'orientation' in window.screen) {
      try {
        // @ts-ignore - Screen Orientation API
        await window.screen.orientation.lock('portrait');
        console.log('🔒 Screen orientation locked to portrait for recording');
      } catch (error) {
        console.log('⚠️ Could not lock screen orientation:', error);
      }
    }
  };

  // Function to unlock screen orientation
  const unlockOrientation = async () => {
    if ('screen' in window && 'orientation' in window.screen) {
      try {
        // @ts-ignore - Screen Orientation API
        await window.screen.orientation.unlock();
        console.log('🔓 Screen orientation unlocked');
      } catch (error) {
        console.log('⚠️ Could not unlock screen orientation:', error);
      }
    }
  };

  // Lock orientation when component mounts
  useEffect(() => {
    lockOrientationToPortrait();
    
    // Unlock orientation when component unmounts
    return () => {
      unlockOrientation();
    };
  }, []);

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

      {/* ⏱️ Countdown */}
      {recording && (
        <div
          style={{
            position: 'absolute',
            top: 100,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '20px 40px',
            borderRadius: '12px',
            fontSize: 56,
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
        {/* ❌ Dismiss */}
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

        {/* 🔄 Flip Camera */}
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