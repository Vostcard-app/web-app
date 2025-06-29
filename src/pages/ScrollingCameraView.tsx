import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdFlipCameraIos } from 'react-icons/md';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';

const ScrollingCameraView: React.FC = () => {
  const navigate = useNavigate();
  const { setVideo, setGeo, currentVostcard } = useVostcard();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState(30);

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
      // Capture location when recording starts
      const captureLocation = () => {
        console.log('Starting location capture...');
        
        if (!navigator.geolocation) {
          console.error('Geolocation not supported');
          alert('Geolocation is not supported by your browser.');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const geo = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            console.log('✅ Location captured successfully at recording start:', geo);
            console.log('Setting geo in context...');
            setGeo(geo);
            
            // Verify the geo was set in context
            setTimeout(() => {
              console.log('Current Vostcard after setting geo:', currentVostcard);
            }, 100);
          },
          (error) => {
            console.error('❌ Error getting location:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
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
          },
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout
            maximumAge: 60000
          }
        );
      };

      // Capture location immediately when recording starts
      console.log('🎬 Recording starting - capturing location...');
      captureLocation();

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
        
        setVideo(blob);
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