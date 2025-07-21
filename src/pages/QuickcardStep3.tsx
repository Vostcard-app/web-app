import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft, FaMicrophone, FaStop } from 'react-icons/fa';
import { auth } from '../firebase/firebaseConfig';

const QuickcardStep3: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentVostcard,
    updateVostcard,
    saveQuickcard,
    postQuickcard, // Add this import
    clearVostcard,
  } = useVostcard();
  const { title = '', description = '', categories = [], photos = [] } = currentVostcard || {};

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  
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
  
  const availableCategories = [
    'None',
    'Landmark',
    'Fun Fact',
    'Macabre',
    'Architecture',
    'Historical',
    'Museum',
    'Gallery',
    'Restaurant',
    'Nature',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  
  // Quickcard validation (simpler than regular vostcards)
  const validationState = {
    hasTitle: title.trim() !== '',
    hasDescription: description.trim() !== '',
    hasCategories: (categories?.length || 0) > 0,
    hasPhotos: (photos?.length || 0) >= 1,  // Quickcards only need 1 photo
  };

  // Check if quickcard is ready for posting (all validation must pass)
  const isReadyForPosting = validationState.hasTitle && 
    validationState.hasDescription && 
    validationState.hasCategories && 
    validationState.hasPhotos;

  // Create specific missing items list
  const missingItems: string[] = [];
  if (!validationState.hasTitle) missingItems.push('Title');
  if (!validationState.hasDescription) missingItems.push('Description');
  if (!validationState.hasCategories) missingItems.push('Categories');
  if (!validationState.hasPhotos) missingItems.push('Photos (need at least 1)');

  console.log('🔍 Quickcard Step 3 Validation State:', {
    title: title,
    titleValid: validationState.hasTitle,
    description: description,
    descriptionValid: validationState.hasDescription,
    categories: categories,
    categoriesValid: validationState.hasCategories,
    photosCount: photos.length,
    photosValid: validationState.hasPhotos,
    isQuickcard: true,
    isReadyForPosting
  });

  // Check Firebase Auth
  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      if (user) {
        setAuthStatus(`✅ Authenticated: ${user.email}`);
      } else {
        setAuthStatus('❌ Not authenticated');
      }
    };

    checkAuth();
    
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribe();
  }, []);

  // Initialize audio state from current vostcard
  useEffect(() => {
    const vostcardWithAudio = currentVostcard as any;
    if (vostcardWithAudio?.audio && vostcardWithAudio.audio instanceof Blob) {
      setAudioBlob(vostcardWithAudio.audio);
      // We don't have the original recording time, so just set it to 0
      setRecordingTime(0);
    }
  }, [currentVostcard]);

  const handleCategoryToggle = (category: string) => {
    if (categories.includes(category)) {
      updateVostcard({ categories: categories.filter((c) => c !== category) });
    } else {
      updateVostcard({ categories: [...categories, category] });
    }
  };

  const handleSavePrivately = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please sign in to save your quickcard.");
      navigate('/login');
      return;
    }
    
    try {
      console.log('💾 Starting quickcard private save...');
      
      // Save the quickcard privately
      await saveQuickcard();
      
      // Show success message
      alert('Your Quickcard has been saved privately and is available in your Quickcards list.');
      
      // Navigate to quickcards list
      navigate('/quickcards');
      
    } catch (error) {
      console.error('❌ Error saving quickcard privately:', error);
      alert('Failed to save quickcard. Please try again.');
    }
  };

  const handlePostToMap = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please sign in to post your quickcard.");
      navigate('/login');
      return;
    }
    
    if (!isReadyForPosting) {
      alert(`Please complete the following before posting: ${missingItems.join(', ')}`);
      return;
    }
    
    try {
      console.log('📍 Starting quickcard post to map...');
      
      // Post the quickcard to the public map
      await postQuickcard();
      
      // Show success message
      alert('🎉 Quickcard posted successfully! It will appear on the map for everyone to see.');
      
      // Navigate to home to see it on the map
      navigate('/home', { state: { freshLoad: true } });
      
    } catch (error) {
      console.error('❌ Error posting quickcard:', error);
      alert('Failed to post quickcard. Please try again.');
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      console.log('🎤 Attempting to start audio recording...');
      setRecordingError(null);
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }
      
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setIsRecording(false);
        
        // Save audio to vostcard context
        updateVostcard({ 
          audio: audioBlob, 
          hasAudio: true 
        } as any);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        console.log('✅ Audio recording completed:', {
          size: audioBlob.size,
          type: audioBlob.type,
          duration: recordingTime
        });
      };
      
      // Add error handling for MediaRecorder
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setRecordingError('Recording error occurred. Please try again.');
        setIsRecording(false);
      };
      
      // Start recording
      console.log('🎤 Starting MediaRecorder...');
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('✅ Audio recording started successfully');
      
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

  const clearRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setRecordingError(null);
    
    // Clear audio from vostcard context
    updateVostcard({ 
      audio: null, 
      hasAudio: false 
    } as any);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        
        // Optionally check microphone permissions (but don't request them yet)
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            console.log('🎤 Microphone permission status:', permission.state);
            
            if (permission.state === 'denied') {
              setRecordingError('🎤 Microphone permission denied. Please enable microphone access in your browser settings.');
            }
          } catch (e) {
            // Permission API might not be supported, that's okay
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  return (
    <div style={{ 
      backgroundColor: 'white', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent'
    }}>
      
      {/* 🔵 Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        touchAction: 'manipulation',
        position: 'relative',
        zIndex: 1000
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}>
          Vōstcard
        </div>
        <FaArrowLeft
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(-1)}
        />
      </div>

      {/* 📝 Form */}
      <div style={{ 
        padding: 16, 
        flex: 1, 
        overflowY: 'auto',
        paddingBottom: 180, // Increased space for two buttons
        touchAction: 'manipulation'
      }}>
        <div>
          <label style={labelStyle}>
            Title {validationState.hasTitle && <span style={{color: 'green'}}>✅</span>}
          </label>
          <input
            value={title}
            onChange={(e) => updateVostcard({ title: e.target.value })}
            placeholder="Enter Title"
            style={{
              ...inputStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Description {validationState.hasDescription && <span style={{color: 'green'}}>✅</span>}
          </label>
          <textarea
            value={description}
            onChange={(e) => updateVostcard({ description: e.target.value })}
            placeholder="Enter Description"
            rows={4}
            style={{
              ...textareaStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Categories {validationState.hasCategories && <span style={{color: 'green'}}>✅</span>}
          </label>
          <div
            onClick={() => setIsCategoryModalOpen(true)}
            style={{
              ...categorySelectStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
          >
            Select Categories
          </div>

          {categories.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {categories.map((cat) => (
                <div key={cat} style={{ 
                  backgroundColor: '#eee', 
                  padding: '6px 10px', 
                  borderRadius: 6, 
                  marginBottom: 4,
                  touchAction: 'manipulation',
                  fontSize: '18px'
                }}>
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🎤 Optional Audio Recording */}
        <div style={{ marginTop: 20 }}>

          {/* Audio Status */}
          <div style={{
            backgroundColor: isRecording ? '#ffeb3b' : audioBlob ? '#4caf50' : '#f5f5f5',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '10px',
            textAlign: 'center',
            border: '1px solid #ddd'
          }}>
            {isRecording ? (
              <div>
                <div style={{ 
                  color: '#d32f2f', 
                  fontWeight: 'bold', 
                  marginBottom: '4px' 
                }}>
                  🔴 Recording...
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatTime(recordingTime)}
                </div>
              </div>
            ) : audioBlob ? (
              <div>
                <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                  ✅ Audio Recording Ready
                </div>
                <div style={{ fontSize: '14px' }}>
                  Duration: {formatTime(recordingTime)}
                </div>
              </div>
            ) : (
              <div style={{ color: '#666' }}>
                Optional: Record audio to enhance your quickcard
              </div>
            )}
          </div>

          {/* Recording Error */}
          {recordingError && (
            <div style={{
              backgroundColor: '#ffebee',
              color: '#d32f2f',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '14px',
              marginBottom: '10px',
              border: '1px solid #ffcdd2'
            }}>
              {recordingError}
            </div>
          )}

          {/* Recording Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: audioBlob ? '1fr 1fr' : '1fr',
            gap: '10px'
          }}>
            <button 
              onClick={() => {
                console.log('🎤 Recording button clicked, isRecording:', isRecording);
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              disabled={!!recordingError}
              style={{
                backgroundColor: isRecording ? '#f44336' : '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: recordingError ? 'not-allowed' : 'pointer',
                opacity: recordingError ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                touchAction: 'manipulation'
              }}
            >
              {isRecording ? (
                <>
                  <FaStop size={16} />
                  Stop Recording
                </>
              ) : (
                <>
                  <FaMicrophone size={16} />
                  {audioBlob ? 'Record Again' : 'Start Recording'}
                </>
              )}
            </button>
            
            {audioBlob && (
              <button 
                onClick={clearRecording}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                Clear Audio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🔘 Fixed Bottom Buttons */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 16,
        borderTop: '1px solid #e0e0e0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        zIndex: 100,
        touchAction: 'manipulation'
      }}>
        {!isReadyForPosting && (
          <div style={missingTextStyle}>
            Missing: {missingItems.join(', ')}
          </div>
        )}

        {/* Save Privately Button */}
        <button
          onClick={handleSavePrivately}
          style={{
            ...saveButtonStyle,
            backgroundColor: '#002B4D', // Always enabled for private save
            touchAction: 'manipulation'
          }}
        >
          Save Privately
        </button>

        {/* Post to Map Button */}
        <button
          onClick={handlePostToMap}
          disabled={!isReadyForPosting}
          style={{
            ...postButtonStyle,
            backgroundColor: isReadyForPosting ? '#28a745' : '#aaa', // Green when ready
            touchAction: 'manipulation'
          }}
        >
          Post to Map
        </button>
      </div>

      {/* ✅ Category Modal */}
      {isCategoryModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Select Categories</h3>
            {availableCategories.map((cat) => (
              <div
                key={cat}
                style={categoryItemStyle}
                onClick={() => handleCategoryToggle(cat)}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(cat)}
                  readOnly
                />
                <span style={{ marginLeft: 8 }}>{cat}</span>
              </div>
            ))}
            <button
              style={doneButtonStyle}
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 4
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
  marginBottom: 16
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 100
};

const categorySelectStyle: React.CSSProperties = {
  backgroundColor: '#eee',
  padding: '12px',
  borderRadius: 8,
  cursor: 'pointer',
  marginBottom: 8
};

const saveButtonStyle: React.CSSProperties = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer',
  marginBottom: 10
};

const postButtonStyle: React.CSSProperties = {
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer'
};

const missingTextStyle: React.CSSProperties = {
  color: 'orange',
  marginTop: 8,
  marginBottom: 8,
  textAlign: 'center'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 998,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 12,
  width: '80%',
  maxWidth: 400,
  position: 'relative',
  zIndex: 999
};

const categoryItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 10,
  cursor: 'pointer',
};

const doneButtonStyle: React.CSSProperties = {
  marginTop: 20,
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 8,
  cursor: 'pointer',
};

export default QuickcardStep3; 