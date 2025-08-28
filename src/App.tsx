import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { useVostcard } from '../context/VostcardContext';

interface LocationState {
  photoType: 'distant' | 'near';
  photoIndex: number;
}

const Step2CameraView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateVostcard, currentVostcard } = useVostcard();
  
  // Get photo type from location state
  const state = location.state as LocationState;
  const photoType = state?.photoType || 'distant';
  const photoIndex = state?.photoIndex || 0;
  
  const [showFileTypeWarning, setShowFileTypeWarning] = useState(false);
  const [fileTypeWarningMessage, setFileTypeWarningMessage] = useState('');

  // Auto-trigger native camera when component mounts
  useEffect(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle native camera capture
  const handleNativeCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      // User cancelled - go back to Step 2
      navigate('/create-step2');
      return;
    }

    // Handle video files
    if (file.type.startsWith('video/')) {
      console.log('🎥 Video captured for vostcard:', {
        name: file.name,
        type: file.type,
        size: file.size,
        photoType,
        photoIndex
      });
      
      // Update vostcard with the video
      updateVostcard({ 
        video: file,
        hasVideo: true
      });
      
      // Navigate back to Step 2
      navigate('/create-step2', { 
        state: { 
          videoTaken: true,
          photoType,
          photoIndex
        }
      });
      
      // Clear the file input for next use
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Handle image files
    if (file.type.startsWith('image/')) {
      console.log('📸 Native camera photo captured for vostcard:', {
        name: file.name,
        type: file.type,
        size: file.size,
        photoType,
        photoIndex
      });
      
      // Update vostcard with the new photo
      const currentPhotos = currentVostcard?.photos || [];
      const newPhotos = [...currentPhotos];
      newPhotos[photoIndex] = file;
      
      updateVostcard({ photos: newPhotos });
      
      // Navigate back to Step 2
      navigate('/create-step2', { 
        state: { 
          photoTaken: true,
          photoType,
          photoIndex
        }
      });
      
      // Clear the file input for next use
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Invalid file type
    setFileTypeWarningMessage('📸 Invalid file type!\n\nPlease select a photo or video file.');
    setShowFileTypeWarning(true);
  };

  // Handle warning dismissal
  const handleWarningOk = () => {
    setShowFileTypeWarning(false);
    // Go back to Step 2
    navigate('/create-step2');
  };

  // Try native camera again
  const retryNativeCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      {/* Native camera file input - Updated to accept both images and videos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleNativeCapture}
      />

      {/* Loading/instruction screen */}
      <div style={{
        textAlign: 'center',
        color: 'white',
        padding: '20px'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          📸🎥
        </div>
        <h2 style={{ 
          margin: '0 0 10px 0',
          color: photoType === 'distant' ? '#00aaff' : '#ff6600'
        }}>
          {photoType === 'distant' ? 'Distant Media' : 'Near Media'}
        </h2>
        <p style={{ margin: '0 0 20px 0', color: '#ccc' }}>
          {photoType === 'distant' 
            ? 'Take a photo or video from far away to show the full scene'
            : 'Take a close-up photo or video to show details'
          }
        </p>
        <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>
          Your camera app should open automatically
        </p>
        
        {/* Manual camera trigger button */}
        <button
          onClick={retryNativeCamera}
          style={{
            background: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '10px'
          }}
        >
          📱 Open Camera
        </button>
        
        <div style={{ fontSize: '12px', color: '#666' }}>
          If camera doesn't open, tap the button above
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => navigate('/create-step2')}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <AiOutlineClose size={24} color="white" />
      </button>

      {/* File Type Warning Modal */}
      {showFileTypeWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            margin: '20px',
            maxWidth: '320px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
              ⚠️ File Type Warning
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#666', whiteSpace: 'pre-line' }}>
              {fileTypeWarningMessage}
            </p>
            <button 
              onClick={handleWarningOk}
              style={{
                background: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step2CameraView;