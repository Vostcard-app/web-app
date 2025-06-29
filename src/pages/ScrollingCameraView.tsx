import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdFlipCameraIos } from 'react-icons/md';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';
import { FaLocationArrow } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../firebaseConfig';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo, setGeo, currentVostcard, setCurrentVostcard } = useVostcard();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState(30);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'capturing' | 'captured' | 'error'>('idle');

  const startCamera = async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: cameraFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
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
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      // Create Vostcard first, then capture location and start recording
      const startRecordingProcess = async () => {
        console.log('🎬 Starting recording process...');
        
        // First, ensure we have a Vostcard created
        if (!currentVostcard) {
          console.log('🎬 Creating new Vostcard for recording...');
          const user = auth.currentUser;
          const username = user?.displayName || user?.email?.split('@')[0] || 'Unknown';
          
          const newVostcard = {
            id: uuidv4(),
            state: 'private' as const,
            video: null,
            title: '',
            description: '',
            photos: [],
            categories: [],
            geo: null,
            username,
            userID: user?.uid || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          setCurrentVostcard(newVostcard);
          
          // Wait for the context to update
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Now capture location
        setLocationStatus('capturing');
        
        if (!navigator.geolocation) {
          console.error('❌ Geolocation not supported');
          setLocationStatus('error');
          alert('Geolocation is not supported by your browser.');
          return;
        }

        try {
          console.log('📍 Requesting location...');
          
          // Get location
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000
            });
          });

          const geo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          console.log('✅ Location captured successfully:', geo);
          console.log('📍 Setting geo in context...');
          
          // Set the location in context
          setGeo(geo);
          setLocationStatus('captured');
          
          // Wait a moment for the context to update, then verify
          setTimeout(() => {
            console.log('📍 Verification - Current Vostcard geo:', currentVostcard?.geo);
            
            // Now start the recording
            console.log('🎬 Starting video recording...');
            startVideoRecording();
          }, 200);
          
        } catch (error: any) {
          console.error('❌ Error getting location:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          setLocationStatus('error');
          
          let errorMessage = 'Could not get your location. ';
          switch (error.code) {
            case 1:
              errorMessage += 'Location permission denied. Please enable location services in your browser settings.';
              break;
            case 2:
              errorMessage += 'Location unavailable. Please check your device location settings.';
              break;
            case 3:
              errorMessage += 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage += 'Please enable location services and try again.';
          }
          
          alert(errorMessage);
          return;
        }
      };

      // Start the recording process
      startRecordingProcess();
    }
  };

  // Separate function for starting video recording
  const startVideoRecording = () => {
    const recordedChunks: Blob[] = [];
    
    // Detect supported video formats for better mobile compatibility
    const getSupportedMimeType = () => {
      const types = [
        'video/mp4;codecs=h264',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      return 'video/webm'; // fallback
    };

    const mimeType = getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(stream as MediaStream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      console.log('🎬 Recording stopped, blob created:', blob);
      console.log('Blob size:', blob.size);
      console.log('Blob type:', blob.type);
      
      // Check if location was captured
      console.log('📍 Final location check before setting video:', currentVostcard?.geo);
      
      // Set the video first, then ensure geo is preserved
      setVideo(blob);
      
      // Double-check that geo is still there after setting video
      setTimeout(() => {
        console.log('📍 Location check after setVideo:', currentVostcard?.geo);
        if (!currentVostcard?.geo) {
          console.warn('⚠️ Geo was lost after setVideo, attempting to restore...');
          // If geo was lost, try to restore it (this shouldn't happen with the fixed context)
        }
      }, 100);
      
      navigate('/create-step1');
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

      {/* 📍 Location Status */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <FaLocationArrow size={16} />
        {locationStatus === 'idle' && 'Location: Ready'}
        {locationStatus === 'capturing' && 'Location: Capturing...'}
        {locationStatus === 'captured' && 'Location: ✅ Captured'}
        {locationStatus === 'error' && 'Location: ❌ Error'}
      </div>

      {/* ⏱️ Countdown */}
      {recording && (
        <div
          style={{
            position: 'absolute',
            top: 100,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: 28,
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
          bottom: '20%',
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