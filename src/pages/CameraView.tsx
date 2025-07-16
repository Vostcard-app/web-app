// src/components/CameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';

// Custom Stop Recording Icon Component
const StopRecordingIcon: React.FC = () => (
  <div style={{ position: 'relative', width: 70, height: 70 }}>
    <svg width="70" height="70" viewBox="0 0 70 70" style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* Red circle background */}
      <circle cx="35" cy="35" r="29" fill="red" stroke="white" strokeWidth="6" />
      {/* White square in center */}
      <rect x="25" y="25" width="20" height="20" fill="white" rx="2" />
    </svg>
  </div>
);

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { setVideo } = useVostcard();
  const [isRecording, setIsRecording] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const setPhoto = location.state?.setPhoto;

  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('📱 Starting camera with simple portrait constraints...');
        
        // Simple, reliable portrait constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: 9 / 16,
            facingMode: 'environment'
          },
          audio: true  // Enable audio capture
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check what we actually got
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('📱 Camera result:', {
            width: settings.width,
            height: settings.height,
            aspectRatio: settings.aspectRatio,
            facingMode: settings.facingMode
          });
        }
        
        console.log('✅ Camera started successfully');
      } catch (err) {
        console.error('❌ Error accessing camera:', err);
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (streamRef.current) {
      try {
        console.log('🎥 Starting recording...');
        
        const mediaRecorder = new MediaRecorder(streamRef.current, {
          mimeType: 'video/webm;codecs=vp8,opus'
        });
        
        mediaRecorderRef.current = mediaRecorder;
        recordedChunks.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          console.log('📹 Recording stopped, blob size:', blob.size);
          
          // Add user location if available
          if (userLocation) {
            console.log('📍 Recording location:', userLocation);
          }
          
          // Save video to context
          if (setVideo) {
            setVideo(blob);
          }
          
          // Navigate back with video
          navigate('/create-vostcard-step-2', { 
            state: { 
              videoBlob: blob,
              userLocation: userLocation
            }
          });
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        
        console.log('✅ Recording started successfully');
      } catch (err) {
        console.error('❌ Error starting recording:', err);
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🛑 Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob && setPhoto) {
            setPhoto(blob);
            navigate('/create-vostcard-step-2', { state: { photoBlob: blob } });
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate(-1);
  };

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      {/* Close Button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.5)',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000,
          color: 'white',
          fontSize: '18px'
        }}
      >
        <AiOutlineClose />
      </button>

      {/* Timer Display */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          ● REC
        </div>
      )}

      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'rotate(0deg)'
        }}
      />

      {/* Record Button */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {setPhoto ? (
          <div
            onClick={handleCapturePhoto}
            style={{
              backgroundColor: 'white',
              width: 70,
              height: 70,
              borderRadius: '50%',
              border: '6px solid red',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                backgroundColor: 'red',
                borderRadius: '50%',
                width: 24,
                height: 24,
              }}
            />
          </div>
        ) : (
          <div
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {isRecording ? (
              <StopRecordingIcon />
            ) : (
              <div
                style={{
                  backgroundColor: 'red',
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  border: '6px solid white',
                  cursor: 'pointer',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraView;