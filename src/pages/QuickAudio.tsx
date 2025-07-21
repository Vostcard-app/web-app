import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMicrophone, FaStop, FaArrowLeft, FaCheck, FaRedo } from 'react-icons/fa';

const QuickAudio: React.FC = () => {
  const navigate = useNavigate();
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [testingMicrophone, setTestingMicrophone] = useState(false);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Check microphone availability on mount
  useEffect(() => {
    const checkMicrophoneSupport = async () => {
      try {
        // Log browser and environment info
        console.log('🎤 Browser info:', {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          protocol: window.location.protocol,
          isSecureContext: window.isSecureContext,
          hostname: window.location.hostname
        });

        // Check if we're in a secure context (required for getUserMedia in most browsers)
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
          console.error('❌ Not in secure context - getUserMedia requires HTTPS');
          setRecordingError('🔒 Audio recording requires HTTPS. Please use a secure connection.');
          return;
        }

        // Detect Safari and iOS
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        console.log('🎤 Browser detection:', { isSafari, isIOS });

        if (isIOS && isSafari) {
          console.log('⚠️ Safari on iOS detected - MediaRecorder may have limitations');
          // Set a warning but don't block - we'll try anyway
        }

        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
          console.error('❌ MediaRecorder not available');
          setRecordingError('🎤 Audio recording not supported in this browser. Try Chrome or Firefox.');
          return;
        }
        
        console.log('✅ MediaRecorder available:', {
          MediaRecorder: !!window.MediaRecorder,
          constructor: MediaRecorder.toString()
        });
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('❌ getUserMedia not available');
          setRecordingError('🎤 Microphone access not supported in this browser.');
          return;
        }
        
        console.log('✅ getUserMedia available');
        
        // Check microphone permissions
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            console.log('🎤 Microphone permission status:', permission.state);
            
            if (permission.state === 'denied') {
              setRecordingError('🎤 Microphone permission denied. Please enable microphone access in your browser settings.');
            }
          } catch (e) {
            console.log('🎤 Permission API not supported, will request permission when recording');
          }
        }
        
        // Test basic MediaRecorder creation (without stream)
        try {
          // Create a dummy AudioContext to test basic audio support
          if (window.AudioContext || (window as any).webkitAudioContext) {
            console.log('✅ AudioContext available');
          } else {
            console.log('❌ AudioContext not available');
          }
        } catch (audioError) {
          console.log('❌ Error testing audio context:', audioError);
        }
        
      } catch (error) {
        console.error('🎤 Error checking microphone support:', error);
        setRecordingError('🎤 Unable to check microphone support.');
      }
    };
    
    checkMicrophoneSupport();
  }, []);

  const startRecording = async () => {
    try {
      console.log('🎤 === STARTING NEW RECORDING ===');
      console.log('🎤 Current state:', { 
        isRecording, 
        audioBlob: !!audioBlob, 
        recordingTime,
        chunks: audioChunksRef.current.length 
      });
      
      // Clear any previous state
      setRecordingError(null);
      setAudioBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];
      
      // Request microphone permission
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      console.log('✅ Microphone permission granted, stream obtained');
      console.log('🎤 Stream details:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        }))
      });
      
      // Check if stream has any audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('❌ No audio tracks in stream');
        setRecordingError('No audio tracks available. Please check microphone permissions.');
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      console.log('✅ Audio tracks found:', audioTracks.length);
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Determine best MIME type with Safari-specific handling
      console.log('🎤 Checking MIME type support...');
      
      // Detect Safari/iOS for special handling
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      let supportedTypes;
      if (isIOS && isSafari) {
        // Safari iOS has limited support - prioritize what works
        supportedTypes = [
          'audio/mp4',
          'audio/wav',
          '', // Let browser choose as fallback
        ];
        console.log('🎤 Using Safari iOS optimized MIME types');
      } else {
        // Prioritize basic audio/webm over codecs-specific versions for better compatibility
        supportedTypes = [
          'audio/webm',           // More compatible than opus-specific
          'audio/mp4',
          'audio/webm;codecs=opus', // Try opus after basic webm
          'audio/ogg;codecs=opus', 
          'audio/wav',
          'audio/mpeg'
        ];
      }
      
      let mimeType = '';
      for (const type of supportedTypes) {
        if (type === '') {
          // Empty string means let browser choose
          console.log(`🎤 browser default: ✅ Using as fallback`);
          if (!mimeType) mimeType = type;
          continue;
        }
        
        const supported = MediaRecorder.isTypeSupported(type);
        console.log(`🎤 ${type}: ${supported ? '✅ Supported' : '❌ Not supported'}`);
        if (supported && !mimeType) {
          mimeType = type;
        }
      }
      
      console.log('🎤 Selected MIME type:', mimeType || 'browser default');
      
      // Create MediaRecorder with minimal options to avoid compatibility issues
      let mediaRecorderOptions: MediaRecorderOptions = {};
      
      if (mimeType) {
        mediaRecorderOptions.mimeType = mimeType;
      }
      
      // REMOVED: audioBitsPerSecond - this was causing Chrome to immediately stop recording
      // Let the browser choose the optimal bitrate instead
      
      console.log('🎤 MediaRecorder options:', mediaRecorderOptions);
      console.log('🎤 Creating MediaRecorder...');
      
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      console.log('✅ MediaRecorder created successfully');
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        console.log('🎤 Data available:', {
          size: event.data.size,
          type: event.data.type,
          totalChunks: audioChunksRef.current.length + 1
        });
        
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('✅ Audio chunk added, total chunks:', audioChunksRef.current.length);
        } else {
          console.log('❌ Received empty audio chunk');
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('🎤 MediaRecorder stopped, chunks:', audioChunksRef.current.length);
        console.log('🎤 Stop event details:', {
          wasRecording: isRecording,
          recordingTime,
          streamActive: !!streamRef.current,
          streamTracks: streamRef.current ? streamRef.current.getTracks().length : 0
        });
        
        // Only create audio blob if we have data and we intended to stop
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          console.log('✅ Audio recording completed:', {
            size: audioBlob.size,
            type: audioBlob.type,
            duration: recordingTime,
            chunks: audioChunksRef.current.length
          });
          setAudioBlob(audioBlob);
        } else {
          console.log('❌ No audio chunks available, recording may have failed');
          console.log('❌ Possible causes:');
          console.log('   - MediaRecorder stopped immediately after starting');
          console.log('   - Microphone permission denied');
          console.log('   - Browser compatibility issue');
          console.log('   - Audio format not supported');
          
          // Provide more specific error based on timing and browser
          const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          
          if (recordingTime < 2) {
            const safariAdvice = (isIOS && isSafari) 
              ? ' Safari on iOS has limited MediaRecorder support - try Chrome, Firefox, or Edge instead.'
              : ' Check browser microphone permissions.';
            setRecordingError(`Recording stopped too quickly.${safariAdvice}`);
          } else {
            setRecordingError('No audio was captured during recording. Please check your microphone and try again.');
          }
        }
        
        setIsRecording(false);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log('🎤 Stopping track:', {
              kind: track.kind,
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState
            });
            track.stop();
          });
          streamRef.current = null;
        }
      };
      
      // Add error handling for MediaRecorder
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        console.error('❌ MediaRecorder error details:', {
          error: event.error,
          type: event.type,
          target: event.target
        });
        setRecordingError('Recording error occurred. Please try again.');
        setIsRecording(false);
      };

      // Add state change handler for debugging
      mediaRecorder.onstart = () => {
        console.log('✅ MediaRecorder started - onstart event fired');
        console.log('🎤 MediaRecorder state in onstart:', mediaRecorder.state);
        
        // Double-check that we're actually recording
        if (mediaRecorder.state !== 'recording') {
          console.log('🚨 WARNING: onstart fired but state is not "recording"!');
          console.log('🚨 This suggests immediate failure after start');
        }
      };

      // Add pause handler
      mediaRecorder.onpause = () => {
        console.log('⏸️ MediaRecorder paused');
      };

      // Add resume handler  
      mediaRecorder.onresume = () => {
        console.log('▶️ MediaRecorder resumed');
      };
      
      // Start recording
      console.log('🎤 Starting MediaRecorder...');
      console.log('🎤 MediaRecorder state before start:', mediaRecorder.state);
      
      // Give MediaRecorder a moment to initialize before starting
      console.log('🎤 Waiting brief moment for MediaRecorder to initialize...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // Use standard timing - the audioBitsPerSecond was the real issue
        const dataInterval = 1000;
        
        console.log('🎤 Starting MediaRecorder with interval:', dataInterval);
        console.log('🎤 MediaRecorder state before start:', mediaRecorder.state);
        
        mediaRecorder.start(dataInterval);
        
        console.log('🎤 MediaRecorder.start() called successfully');
        console.log('🎤 MediaRecorder state immediately after start:', mediaRecorder.state);
        
        setIsRecording(true);
        setRecordingTime(0);
        recordingStartTimeRef.current = Date.now();
        
        // Start timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        
        // Immediate state verification after start
        setTimeout(() => {
          console.log('🎤 Recording state check (10ms):', {
            mediaRecorderState: mediaRecorder.state,
            isRecording: isRecording,
            chunks: audioChunksRef.current.length
          });
          
          if (mediaRecorder.state !== 'recording') {
            console.log('❌ CRITICAL: MediaRecorder not in recording state after 10ms!');
            console.log('❌ This indicates MediaRecorder immediately failed/stopped');
            console.log('❌ Likely cause: MIME type or audio configuration rejection');
          }
        }, 10);

        // Check recording state after brief delays
        setTimeout(() => {
          console.log('🎤 Recording state check (100ms):', {
            mediaRecorderState: mediaRecorder.state,
            isRecording: isRecording,
            chunks: audioChunksRef.current.length
          });
        }, 100);

        setTimeout(() => {
          console.log('🎤 Recording state check (1s):', {
            mediaRecorderState: mediaRecorder.state,
            isRecording: isRecording,
            chunks: audioChunksRef.current.length
          });
          
          // If MediaRecorder stopped unexpectedly within 1 second
          if (mediaRecorder.state === 'inactive' && isRecording) {
            const timeSinceStart = Date.now() - recordingStartTimeRef.current;
            console.log(`❌ MediaRecorder stopped unexpectedly after ${timeSinceStart}ms`);
            
            const browserSpecificAdvice = (isIOS && isSafari) 
              ? 'Safari on iOS has known audio recording limitations. Try using Chrome or Firefox instead.'
              : 'This may be a browser compatibility issue.';
            setRecordingError(`Recording stopped unexpectedly after ${Math.round(timeSinceStart/1000)}s. ${browserSpecificAdvice}`);
            setIsRecording(false);
          }
        }, 1000);

        setTimeout(() => {
          console.log('🎤 Recording state check (3s):', {
            mediaRecorderState: mediaRecorder.state,
            isRecording: isRecording,
            chunks: audioChunksRef.current.length
          });
          
          // If we're still recording but have no chunks after 3 seconds, there's an issue
          if (mediaRecorder.state === 'recording' && audioChunksRef.current.length === 0) {
            console.log('⚠️ Recording active but no chunks received after 3 seconds');
          }
        }, 3000);
        
        console.log('✅ Audio recording started successfully');
      } catch (startError) {
        console.error('❌ Error calling mediaRecorder.start():', startError);
        setRecordingError(`Failed to start recording: ${startError instanceof Error ? startError.message : 'Unknown error'}`);
        
        // Clean up stream if start failed
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      
      if (error instanceof Error) {
        console.log('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        if (error.name === 'NotAllowedError') {
          setRecordingError('🎤 Microphone permission denied. Please click "Allow" when prompted and try again.');
        } else if (error.name === 'NotFoundError') {
          setRecordingError('🎤 No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotSupportedError') {
          setRecordingError('🎤 Audio recording not supported in this browser. Try using Chrome or Firefox.');
        } else if (error.message.includes('MediaRecorder')) {
          setRecordingError('🎤 MediaRecorder not supported in this browser. Try using Chrome or Firefox.');
        } else {
          setRecordingError(`🎤 Recording failed: ${error.message}`);
        }
      } else {
        setRecordingError('🎤 Failed to start recording. Please check your microphone permissions.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      console.log('🛑 Stopped audio recording');
    }
  };

  const reRecord = () => {
    console.log('🎤 Re-recording: clearing previous audio');
    setAudioBlob(null);
    setRecordingTime(0);
    setRecordingError(null);
    
    // Clear audio chunks
    audioChunksRef.current = [];
    
    // Stop any existing audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    console.log('✅ Re-record state cleared');
  };

  // Fallback recording with no MIME type specified
  const startRecordingFallback = async () => {
    try {
      console.log('🎤 === FALLBACK RECORDING (NO MIME TYPE) ===');
      setRecordingError(null);
      setAudioBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      console.log('✅ Fallback: Stream obtained');
      streamRef.current = stream;

      // Create MediaRecorder with NO options - let browser choose everything
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      console.log('🎤 Fallback: Created MediaRecorder with no options');
      console.log('🎤 Fallback: MediaRecorder state:', mediaRecorder.state);

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('🎤 Fallback data available:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🎤 Fallback recording stopped, chunks:', audioChunksRef.current.length);
        if (audioChunksRef.current.length > 0) {
          // Let browser choose the MIME type from the first chunk
          const firstChunkType = audioChunksRef.current[0].type || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: firstChunkType });
          console.log('✅ Fallback recording completed:', {
            size: audioBlob.size,
            type: firstChunkType,
            chunks: audioChunksRef.current.length
          });
          setAudioBlob(audioBlob);
        } else {
          console.log('❌ Fallback also failed - no chunks');
          setRecordingError('Recording failed even with fallback method. Your browser may not support audio recording.');
        }
        setIsRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ Fallback recording error:', event);
        setRecordingError('Fallback recording failed');
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingStartTimeRef.current = Date.now();

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('✅ Fallback recording started');

    } catch (error) {
      console.error('❌ Fallback recording failed:', error);
      setRecordingError(`Fallback recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveAudio = () => {
    if (audioBlob) {
      // Pass the audio blob back to the previous screen via navigation state
      navigate('/quickcard-step3', { 
        state: { 
          audioBlob,
          recordingTime 
        } 
      });
    }
  };

  const playAudio = () => {
    if (audioBlob) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio();
      audioRef.current = audio;
      audio.src = URL.createObjectURL(audioBlob);
      audio.play();
      
      audio.onended = () => {
        audioRef.current = null;
      };
    }
  };

  const testMicrophone = async () => {
    setTestingMicrophone(true);
    setRecordingError(null);
    
    try {
      console.log('🎤 === TESTING MICROPHONE ACCESS ===');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      console.log('✅ Test: Microphone access granted');
      console.log('🎤 Test: Stream active:', stream.active);
      console.log('🎤 Test: Audio tracks:', stream.getAudioTracks().length);
      
      // Test stream for a moment then stop
      setTimeout(() => {
        console.log('🎤 Test: Stopping test stream');
        stream.getTracks().forEach(track => track.stop());
        setTestingMicrophone(false);
        console.log('✅ Test completed - microphone appears to be working');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Test: Microphone test failed:', error);
      setRecordingError(`Microphone test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTestingMicrophone(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isRecording]);

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        padding: '15px 16px 24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <FaArrowLeft color="#fff" size={20} />
          </button>
          <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>
            Quick Audio
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        {/* Recording Visualization */}
        <div style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          backgroundColor: isRecording ? '#ff4444' : audioBlob ? '#4CAF50' : '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '30px',
          border: `8px solid ${isRecording ? '#ff6666' : audioBlob ? '#66BB6A' : '#bbb'}`,
          boxShadow: isRecording ? '0 0 30px rgba(255, 68, 68, 0.3)' : 'none',
          transition: 'all 0.3s ease'
        }}>
          {isRecording ? (
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎤</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {formatTime(recordingTime)}
              </div>
            </div>
          ) : audioBlob ? (
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {formatTime(recordingTime)}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎤</div>
              <div style={{ fontSize: '16px' }}>Ready to record</div>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          fontSize: '18px',
          color: '#333'
        }}>
          {isRecording ? (
            <div>
              <div style={{ fontWeight: 'bold', color: '#ff4444' }}>Recording...</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Tap stop when finished</div>
            </div>
          ) : audioBlob ? (
            <div>
              <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>Recording Complete!</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Duration: {formatTime(recordingTime)}</div>
            </div>
          ) : recordingError ? (
            <div style={{ color: '#ff4444', fontSize: '16px' }}>
              {recordingError}
              {recordingError.includes('stopped too quickly') && (
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '14px', 
                  color: '#666',
                  fontStyle: 'italic' 
                }}>
                  💡 Try the "Test Microphone" button first, then try the "Fallback Method" button below, or use a different browser
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 'bold' }}>Ready to Record</div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Tap the record button to start
                {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                  <div style={{ marginTop: '5px', fontSize: '12px', fontStyle: 'italic' }}>
                    📱 iOS detected - ensure microphone permissions are enabled
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          width: '100%',
          maxWidth: '300px'
        }}>
          {!audioBlob ? (
            // Recording buttons
            <>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!!recordingError || testingMicrophone}
                style={{
                  backgroundColor: isRecording ? '#ff4444' : '#007aff',
                  color: 'white',
                  border: 'none',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: (recordingError || testingMicrophone) ? 'not-allowed' : 'pointer',
                  opacity: (recordingError || testingMicrophone) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                {isRecording ? (
                  <>
                    <FaStop size={20} />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <FaMicrophone size={20} />
                    Start Recording
                  </>
                )}
              </button>

              {/* Test Microphone Button */}
              <button
                onClick={testMicrophone}
                disabled={isRecording || testingMicrophone}
                style={{
                  backgroundColor: testingMicrophone ? '#ffc107' : '#28a745',
                  color: testingMicrophone ? '#333' : 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: (isRecording || testingMicrophone) ? 'not-allowed' : 'pointer',
                  opacity: (isRecording || testingMicrophone) ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                {testingMicrophone ? '🔄 Testing...' : '🔍 Test Microphone'}
              </button>

              {/* Fallback Recording Button - only show if there's an error */}
              {recordingError && recordingError.includes('stopped too quickly') && (
                <button
                  onClick={startRecordingFallback}
                  disabled={isRecording || testingMicrophone}
                  style={{
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: (isRecording || testingMicrophone) ? 'not-allowed' : 'pointer',
                    opacity: (isRecording || testingMicrophone) ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  🔧 Try Fallback Method
                </button>
              )}
            </>
          ) : (
            // Post-recording buttons
            <>
              <button
                onClick={playAudio}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                🔊 Play Audio
              </button>

              <button
                onClick={reRecord}
                style={{
                  backgroundColor: '#ffc107',
                  color: '#333',
                  border: 'none',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <FaRedo size={16} />
                Re-record
              </button>

              <button
                onClick={saveAudio}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <FaCheck size={16} />
                Save Audio
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickAudio; 