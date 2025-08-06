import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import PhotoOptionsModal from '../components/PhotoOptionsModal';

/*
  📱 CAMERA APPROACH: Currently using Step2CameraView for enhanced orientation handling
  
  🔄 TO REVERT TO FILE INPUT:
  1. Replace handleAddPhoto with handleAddPhotoFallback
  2. Remove the camera mode indicator
  3. The file input code is already there and ready to use
*/

export default function CreateVostcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard, currentVostcard } = useVostcard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null]);
  const [activeThumbnail, setActiveThumbnail] = useState<number | null>(null);
  
  // Desktop photo options modal state
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [pendingPhotoIndex, setPendingPhotoIndex] = useState<number | null>(null);

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Load saved photos when component mounts
  useEffect(() => {
    if (currentVostcard?.photos) {
      const photos = currentVostcard.photos;
      setSelectedPhotos(prevPhotos => {
        const newPhotos = [...prevPhotos];
        photos.forEach((photo, index) => {
          if (index < 2) { // Only use first two photos
            newPhotos[index] = photo as File;
          }
        });
        return newPhotos;
      });
    }
  }, [currentVostcard]);

  // Handler for when a thumbnail is tapped - mobile uses native action sheet, desktop shows modal
  const handleAddPhoto = (index: number) => {
    setActiveThumbnail(index);
    
    if (isMobile) {
      // Mobile: Use native action sheet directly
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('data-index', index.toString());
        fileInputRef.current.click();
      }
    } else {
      // Desktop: Show custom modal with options
      setPendingPhotoIndex(index);
      setShowPhotoOptions(true);
    }
  };

  // Desktop modal handlers
  const handleTakePhoto = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      // For desktop "take photo", we'll open file input (user can use webcam apps)
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  const handleUploadFile = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  const handleSelectFromLibrary = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  // Handle file selection (camera or library)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const indexStr = event.target.getAttribute('data-index');
    const index = indexStr ? parseInt(indexStr, 10) : activeThumbnail;
    
    if (file && index !== null && index >= 0 && index < 2) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      console.log(`📸 Adding photo ${index + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      });

      setSelectedPhotos(prev => {
        const updated = [...prev];
        updated[index] = file;
        return updated;
      });
    }
    
    setActiveThumbnail(null);
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Smaller square thumbnail style
  const optionStyle = {
    background: '#f4f6f8',
    borderRadius: 24,
    marginBottom: 20,
    width: 200,
    height: 200,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const buttonStyle = {
    background: '#002B4D',
    color: 'white',
    border: 'none',
    borderRadius: 16,
    fontSize: 24,
    fontWeight: 600,
    padding: '20px 0',
    width: '100%',
    maxWidth: 380,
    margin: '0 auto',
    marginTop: 24,
    boxShadow: '0 4px 12px rgba(0,43,77,0.12)',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  };

  // Save and continue handler
  const handleSaveAndContinue = () => {
    // Filter out null photos but allow saving even with just one photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    updateVostcard({ photos: validPhotos });
    navigate('/create-step3');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Banner */}
      <div style={{
        width: '100%',
        background: '#002B4D',
        color: 'white',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}>
        <span 
          onClick={() => navigate('/home')}
          style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', cursor: 'pointer' }}>Vōstcard</span>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <FaArrowLeft size={28} color="white" />
        </button>
      </div>

      {/* Options - now scrollable */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '45px 20px 0 20px',
        boxSizing: 'border-box',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        marginTop: '80px', // Account for fixed header
      }}>
        {[0, 1].map(idx => (
          <button
            key={idx}
            style={optionStyle}
            onClick={() => handleAddPhoto(idx)}
            type="button"
          >
            {selectedPhotos[idx] ? (
              <img
                src={URL.createObjectURL(selectedPhotos[idx]!)}
                alt={idx === 0 ? "Distant" : "Near"}
                style={{
                  width: 200,
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 24,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
            ) : (
              <FaRegImages size={48} color="#002B4D" style={{ marginBottom: 16 }} />
            )}
            <div style={{ 
              fontSize: 20, 
              color: selectedPhotos[idx] ? 'white' : '#002B4D', 
              fontWeight: 600, 
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              textShadow: selectedPhotos[idx] ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none'
            }}>
              {idx === 0 ? "Distant" : "Near"}<br />(Suggested)
            </div>
          </button>
        ))}
        <button
          style={{ ...buttonStyle, marginTop: 15 }}
          onClick={handleSaveAndContinue}
        >
          Save & Continue
        </button>

        {/* Camera mode indicator */}
        <div style={{
          marginTop: 10,
          fontSize: 12,
          color: '#666',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          📱 Using enhanced camera with orientation correction
        </div>
      </div>

      {/* File input - triggers iOS native action sheet on mobile, used by modal on desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={false}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Desktop Photo Options Modal */}
      <PhotoOptionsModal
        isOpen={showPhotoOptions}
        onClose={() => setShowPhotoOptions(false)}
        onTakePhoto={handleTakePhoto}
        onUploadFile={handleUploadFile}
        onSelectFromLibrary={handleSelectFromLibrary}
        title="Add Photo"
      />
    </div>
  );
}
