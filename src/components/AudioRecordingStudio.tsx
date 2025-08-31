import React, { useState, useRef, useEffect } from 'react';

export interface AudioRecordingStudioProps {
  audioBlob: Blob | null;
  audioSource: 'recording' | 'file' | null;
  audioFileName: string | null;
  onAudioChange: (audioBlob: Blob | null, audioSource: 'recording' | 'file' | null, audioFileName: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  showUploadButton?: boolean;
  showRecordButton?: boolean;
  showClearButton?: boolean;
}

const AudioRecordingStudio: React.FC<AudioRecordingStudioProps> = ({
  audioBlob,
  audioSource,
  audioFileName,
  onAudioChange,
  disabled = false,
  required = false,
  label = 'Audio',
  showUploadButton = true,
  showRecordButton = true,
  showClearButton = true
}) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording function
  const startRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Detect Safari/iOS for iPhone compatibility
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      let supportedTypes;
      if (isIOS && isSafari) {
        // Safari iOS has limited support - prioritize what works on iPhone
        supportedTypes = [
          'audio/mp4',
          'audio/wav',
          '', // Let browser choose as fallback
        ];
        console.log('🎤 Using Safari iOS optimized MIME types for iPhone compatibility');
      } else {
        // Desktop/Android - use more compatible formats
        supportedTypes = [
          'audio/webm',
          'audio/mp4',
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
      
      console.log('🎤 Selected MIME type for iPhone compatibility:', mimeType || 'browser default');
      
      // Create MediaRecorder with iPhone-compatible options
      let mediaRecorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        mediaRecorderOptions.mimeType = mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Use the detected MIME type for the blob
        const finalMimeType = mimeType || 'audio/webm'; // fallback
        const recordedBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        onAudioChange(recordedBlob, 'recording', null);
        setIsRecording(false);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setRecordingError('Failed to start recording. Please try again.');
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file.');
      return;
    }

    onAudioChange(file, 'file', file.name);
    setRecordingTime(0);
    event.target.value = '';
  };

  // Clear recording
  const clearRecording = () => {
    onAudioChange(null, null, null);
    setRecordingTime(0);
    setRecordingError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '8px'
      }}>
        {label} {audioBlob && <span style={{color: 'green'}}>✅</span>}
        {required && <span style={{color: 'red'}}> *</span>}
      </label>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {/* Record Button */}
        {showRecordButton && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            style={{
              backgroundColor: isRecording ? '#f44336' : '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              flex: 1,
              opacity: disabled ? 0.6 : 1
            }}
          >
            {isRecording ? `🔴 Stop (${formatTime(recordingTime)})` : '🎙️ Record'}
          </button>
        )}

        {/* Upload Button */}
        {showUploadButton && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isRecording}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: (disabled || isRecording) ? 'not-allowed' : 'pointer',
              flex: 1,
              opacity: (disabled || isRecording) ? 0.6 : 1
            }}
          >
            📁 Upload
          </button>
        )}

        {/* Clear Button */}
        {showClearButton && audioBlob && (
          <button
            onClick={clearRecording}
            disabled={disabled || isRecording}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: (disabled || isRecording) ? 'not-allowed' : 'pointer',
              opacity: (disabled || isRecording) ? 0.6 : 1
            }}
          >
            🗑️ Clear
          </button>
        )}
      </div>

      {/* Audio Preview */}
      {audioBlob && (
        <div style={{
          padding: '8px',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666',
          marginBottom: '8px'
        }}>
          {audioSource === 'recording' ? 
            `🎙️ Recorded audio (${formatTime(recordingTime)})` : 
            `📁 ${audioFileName || 'Uploaded audio'}`
          }
        </div>
      )}

      {/* Recording Error */}
      {recordingError && (
        <div style={{
          padding: '8px',
          backgroundColor: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#d32f2f',
          marginTop: '8px'
        }}>
          {recordingError}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AudioRecordingStudio;
