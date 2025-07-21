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
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check microphone availability on mount
  useEffect(() => {
    const checkMicrophoneSupport = async () => {
      try {
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
          setRecordingError('🎤 Audio recording not supported in this browser. Try Chrome or Firefox.');
          return;
        }
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setRecordingError('🎤 Microphone access not supported in this browser.');
          return;
        }
        
        console.log('🎤 MediaRecorder and getUserMedia are supported');
        
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
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Determine best MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        } else {
          mimeType = ''; // Let browser choose
        }
      }
      
      console.log('🎤 Using MIME type:', mimeType);
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
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
        
        // Only create audio blob if we have data and we intended to stop
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('✅ Audio recording completed:', {
            size: audioBlob.size,
            type: audioBlob.type,
            duration: recordingTime,
            chunks: audioChunksRef.current.length
          });
          setAudioBlob(audioBlob);
        } else {
          console.log('❌ No audio chunks available, recording may have failed');
          setRecordingError('Recording failed - no audio captured. Please try again.');
        }
        
        setIsRecording(false);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      // Add error handling for MediaRecorder
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setRecordingError('Recording error occurred. Please try again.');
        setIsRecording(false);
      };
      
      // Start recording
      console.log('🎤 Starting MediaRecorder...');
      console.log('🎤 MediaRecorder state before start:', mediaRecorder.state);
      
      try {
        mediaRecorder.start(1000); // Collect data every second
        console.log('🎤 MediaRecorder.start() called successfully');
        console.log('🎤 MediaRecorder state after start:', mediaRecorder.state);
        
        setIsRecording(true);
        setRecordingTime(0);
        
        // Start timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        
        // Check recording state after a brief delay
        setTimeout(() => {
          console.log('🎤 Recording state check:', {
            mediaRecorderState: mediaRecorder.state,
            isRecording: isRecording,
            chunks: audioChunksRef.current.length
          });
        }, 100);
        
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
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 'bold' }}>Ready to Record</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Tap the record button to start</div>
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
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!recordingError}
              style={{
                backgroundColor: isRecording ? '#ff4444' : '#007aff',
                color: 'white',
                border: 'none',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: recordingError ? 'not-allowed' : 'pointer',
                opacity: recordingError ? 0.6 : 1,
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