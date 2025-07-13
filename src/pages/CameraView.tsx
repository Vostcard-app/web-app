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
        // Device detection for specific handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;
        
        console.log('📱 Device detection:', { isIOS, isAndroid, isMobile, userAgent: navigator.userAgent });
        
        // Multiple constraint strategies to force portrait
        const constraintStrategies = [
          // Strategy 1: Force portrait with exact constraints
          {
            name: 'Exact Portrait',
            constraints: {
              width: { exact: 720 },
              height: { exact: 1280 },
              frameRate: { ideal: 30, max: 30 }
            }
          },
          // Strategy 2: Ideal portrait with min/max
          {
            name: 'Ideal Portrait',
            constraints: {
              width: { ideal: 720, min: 480, max: 720 },
              height: { ideal: 1280, min: 854, max: 1280 },
              frameRate: { ideal: 30, max: 30 }
            }
          },
          // Strategy 3: Aspect ratio focused
          {
            name: 'Aspect Ratio Portrait',
            constraints: {
              aspectRatio: { exact: 9/16 },
              frameRate: { ideal: 30, max: 30 }
            }
          },
          // Strategy 4: Mobile-specific portrait
          {
            name: 'Mobile Portrait',
            constraints: {
              width: { ideal: 720 },
              height: { ideal: 1280 },
              aspectRatio: { ideal: 9/16 },
              frameRate: { ideal: 30, max: 30 }
            }
          }
        ];
        
        let stream = null;
        let usedStrategy = null;
        
        // Try each strategy until one works and gives us portrait
        for (const strategy of constraintStrategies) {
          try {
            console.log(`📱 Trying strategy: ${strategy.name}`, strategy.constraints);
            
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: strategy.constraints,
              audio: false
            });
            
            // Check if we got portrait
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              const settings = videoTrack.getSettings();
              const isPortrait = settings.width && settings.height ? settings.height > settings.width : false;
              
              console.log(`📱 Strategy ${strategy.name} result:`, {
                width: settings.width,
                height: settings.height,
                isPortrait: isPortrait,
                aspectRatio: settings.width && settings.height ? (settings.width / settings.height).toFixed(3) : 'unknown',
                frameRate: settings.frameRate
              });
              
              if (isPortrait) {
                usedStrategy = strategy;
                console.log(`✅ SUCCESS: ${strategy.name} gave us portrait video!`);
                break;
              } else {
                console.log(`❌ FAILED: ${strategy.name} gave us landscape, trying next strategy...`);
                // Stop this stream and try next strategy
                stream.getTracks().forEach(track => track.stop());
                stream = null;
              }
            }
          } catch (error) {
            console.log(`❌ Strategy ${strategy.name} failed:`, error instanceof Error ? error.message : String(error));
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              stream = null;
            }
          }
        }
        
        // If no strategy worked, try one final fallback
        if (!stream) {
          console.log('🔄 All strategies failed, trying final fallback...');
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: true,
              audio: false
            });
            usedStrategy = { name: 'Final Fallback', constraints: { video: true } };
          } catch (error) {
            console.error('❌ Final fallback also failed:', error);
            throw error;
          }
        }
        
        if (stream) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          // Final check and warning
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            const isPortrait = settings.width && settings.height ? settings.height > settings.width : false;
            
            console.log(`📱 FINAL RESULT using ${usedStrategy?.name}:`, {
              width: settings.width,
              height: settings.height,
              aspectRatio: settings.width && settings.height ? (settings.width / settings.height).toFixed(3) : 'unknown',
              isPortrait: isPortrait,
              orientation: isPortrait ? 'PORTRAIT ✅' : 'LANDSCAPE ❌',
              frameRate: settings.frameRate,
              facingMode: settings.facingMode
            });
            
            if (!isPortrait) {
              console.warn('⚠️⚠️⚠️ CRITICAL: Video is still LANDSCAPE! This will appear sideways when played back!');
              console.warn('⚠️ Device may not support portrait video capture. Consider device rotation or different approach.');
            }
          }
        }

      } catch (err) {
        console.error('❌ All camera access attempts failed:', err);
        alert('Camera access failed. Please check permissions and try again.');
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
        📱 Portrait 16:9 Mode
      </div>

      {/* 🎥 Video Preview - Always Portrait 16:9 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Ensure video is always displayed in portrait 16:9 format
          aspectRatio: '9/16',
          maxWidth: '100%',
          maxHeight: '100%'
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