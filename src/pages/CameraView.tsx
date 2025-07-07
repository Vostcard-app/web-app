// src/components/CameraView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';

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

  // Device detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIPhone = /iPhone/.test(navigator.userAgent);

  const setPhoto = location.state?.setPhoto;

  useEffect(() => {
    const startCamera = async () => {
      try {
        // Enhanced video constraints for better iPhone compatibility
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        };

        // For iPhone, prioritize portrait orientation
        if (isIPhone) {
          videoConstraints.width = { ideal: 1080, max: 1080 };
          videoConstraints.height = { ideal: 1920, max: 1920 };
          console.log('📱 iPhone detected - using portrait video constraints');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: false
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Log actual video track settings
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('📱 Video track settings:', {
            width: settings.width,
            height: settings.height,
            facingMode: settings.facingMode,
            frameRate: settings.frameRate
          });
        }

      } catch (err) {
        console.error('Error accessing camera:', err);
        // Fallback to basic constraints if enhanced ones fail
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          console.log('📱 Using fallback camera constraints');
        } catch (fallbackErr) {
          console.error('Fallback camera access also failed:', fallbackErr);
        }
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
          // Continue without location - user can add it later
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
  }, [isIPhone]);

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageUrl = canvas.toDataURL('image/png');
      if (setPhoto) {
        setPhoto(imageUrl);
      }
    }
    navigate(-1);
  };

  const handleStartRecording = () => {
    if (streamRef.current) {
      // Enhanced MIME type detection with better fallbacks
      const getSupportedMimeType = () => {
        const types = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 + AAC (best compatibility)
          'video/mp4;codecs=avc1.42E01E', // H.264 video only
          'video/webm;codecs=vp9,opus', // VP9 + Opus
          'video/webm;codecs=vp9', // VP9 video only
          'video/webm;codecs=vp8,opus', // VP8 + Opus
          'video/webm;codecs=vp8', // VP8 video only
          'video/webm;codecs=h264,opus', // H.264 in WebM + Opus
          'video/webm;codecs=h264', // H.264 in WebM
          'video/webm', // WebM fallback
          'video/mp4', // MP4 fallback
          '' // Let browser decide
        ];
        
        for (const type of types) {
          if (type === '' || MediaRecorder.isTypeSupported(type)) {
            console.log('📹 Selected MIME type:', type || 'browser default');
            return type || undefined;
          }
        }
        console.warn('⚠️ No supported MIME types found, using browser default');
        return undefined;
      };

      const mimeType = getSupportedMimeType();
      
      // Create MediaRecorder with improved options
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      // Add bitrate for better quality/size balance
      try {
        options.videoBitsPerSecond = 2500000; // 2.5 Mbps
      } catch (err) {
        console.log('📹 Bitrate setting not supported, using default');
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMimeType = mimeType || 'video/webm';
        const blob = new Blob(recordedChunks.current, { type: finalMimeType });
        
        console.log('📹 Video recording completed:', {
          size: blob.size,
          type: blob.type,
          isIPhone,
          chunks: recordedChunks.current.length
        });

        // Pass location to setVideo if available
        if (userLocation) {
          setVideo(blob, userLocation);
          console.log('📍 Video saved with location:', userLocation);
        } else {
          setVideo(blob);
          console.log('📍 Video saved without location');
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
      {/* 🔘 Close Button */}
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

      {/* Device info for debugging */}
      {isIPhone && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10
        }}>
          📱 iPhone Mode
        </div>
      )}

      {/* 🎥 Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          flex: 1,
          width: '100%',
          objectFit: 'cover',
        }}
      />

      {/* 🔴 Record Button */}
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
          />
        ) : (
          <div
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            style={{
              backgroundColor: isRecording ? 'white' : 'red',
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
            {isRecording && (
              <div
                style={{
                  backgroundColor: 'red',
                  width: 24,
                  height: 24,
                  borderRadius: 4,
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