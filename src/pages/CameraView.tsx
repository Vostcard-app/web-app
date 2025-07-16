// src/components/CameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { FaStop } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

// Custom Stop Recording Icon Component
const StopRecordingIcon: React.FC = () => (
  <svg width="70" height="70" viewBox="0 0 70 70">
    {/* Red circle background */}
    <circle cx="35" cy="35" r="29" fill="red" stroke="white" strokeWidth="6" />
    {/* White square in center */}
    <rect x="25" y="25" width="20" height="20" fill="white" rx="2" />
  </svg>
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
            aspectRatio: settings.width && settings.height ? (settings.width / settings.height).toFixed(3) : 'unknown'
          });
        }

      } catch (err) {
        console.error('❌ Camera failed:', err);
        alert('Camera access failed. Please check permissions.');
      }
    };

    // Get user location
    const getCurrentLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
          console.log('📍 Location captured for video:', location);
        },
        (error) => {
          console.error('❌ Error getting location:', error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 300000 
        }
      );
    };

    startCamera();
    getCurrentLocation();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob && setPhoto) {
        setPhoto(blob);
        navigate(-1);
      }
    });
  };

  const handleStartRecording = () => {
    if (streamRef.current) {
      // Simple MIME type selection
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        
        console.log('📹 Video recording completed:', {
          size: blob.size,
          type: blob.type
        });

        // Pass location to setVideo if available
        if (userLocation) {
          setVideo(blob, userLocation);
        } else {
          setVideo(blob);
        }
        navigate(-1);
      };

      mediaRecorder.onerror = (event) => {
        console.error('📹 MediaRecorder error:', event);
        alert('❌ Recording error occurred. Please try again.');
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div
      style={{
        backgroundColor: 'black',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Close Button */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 10,
        }}
      >
        <AiOutlineClose
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(-1)}
        />
      </div>

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