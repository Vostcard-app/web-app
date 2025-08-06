import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages, FaTimes } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import PhotoOptionsModal from '../components/PhotoOptionsModal';

export default function QuickcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard, currentVostcard } = useVostcard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos (4 thumbnails for quickcards)
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null, null, null]);
  const [activeThumbnail, setActiveThumbnail] = useState<number | null>(null);
  
  // Photo options modal state
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [pendingPhotoIndex, setPendingPhotoIndex] = useState<number | null>(null);

  // Initialize empty quickcard or load saved photos when component mounts
  useEffect(() => {
    if (!currentVostcard) {
      // Create empty quickcard when arriving at this step
      console.log('📱 Initializing empty quickcard for photo selection');
      updateVostcard({
        id: `quickcard_${Date.now()}`,
        title: '',
        description: '',
        photos: [],
        categories: [],
        geo: { latitude: 0, longitude: 0 }, // Default location, user can set later
        isQuickcard: true,
        hasVideo: false,
        hasPhotos: false,
        video: null,
        state: 'private',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else if (currentVostcard?.photos) {
      // Load existing photos if quickcard already exists
      const photos = currentVostcard.photos;
      setSelectedPhotos(prevPhotos => {
        const newPhotos = [...prevPhotos];
        photos.forEach((photo, index) => {
          if (index < 4) { // Use first four photos
            newPhotos[index] = photo as File;
          }
        });
        return newPhotos;
      });
    }
  }, [currentVostcard, updateVostcard]);

  // Handler for when a thumbnail is tapped - shows photo options modal
  const handleAddPhoto = (index: number) => {
    setPendingPhotoIndex(index);
    setShowPhotoOptions(true);
  };

  // Handle photo option selection
  const handleTakePhoto = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && cameraInputRef.current) {
      cameraInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      cameraInputRef.current.click();
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
    if (pendingPhotoIndex !== null && libraryInputRef.current) {
      libraryInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      libraryInputRef.current.click();
    }
  };

  // Handle file selection from camera/gallery
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const indexStr = event.target.getAttribute('data-index');
    const index = indexStr ? parseInt(indexStr, 10) : activeThumbnail;
    
    if (file && index !== null && index >= 0 && index < 4) {
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

      const newPhotos = [...selectedPhotos];
      newPhotos[index] = file;
      setSelectedPhotos(newPhotos);
    }
    
    setActiveThumbnail(null);
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Remove a photo
  const handleRemovePhoto = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const newPhotos = [...selectedPhotos];
    newPhotos[index] = null;
    setSelectedPhotos(newPhotos);
  };

  // Styles
  const thumbnailStyle = {
    width: 140,
    height: 140,
    borderRadius: 12,
    border: '3px solid #002B4D',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginBottom: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,43,77,0.15)',
  };

  const buttonStyle = {
    backgroundColor: '#002B4D',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '16px',
    fontSize: 20,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    maxWidth: 300,
    marginTop: 24,
    boxShadow: '0 4px 12px rgba(0,43,77,0.12)',
    letterSpacing: '0.01em',
    minHeight: '54px'
  };

  // Save and continue handler
  const handleSaveAndContinue = () => {
    // Filter out null photos - quickcards need at least 1 photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    
    if (validPhotos.length === 0) {
      alert('Please add at least one photo for your Quickcard.');
      return;
    }
    
    // Save photos to context
    updateVostcard({ photos: validPhotos });
    
    console.log('📱 Quickcard photos saved:', {
      photoCount: validPhotos.length
    });
    
    navigate('/quickcard-step3');
  };

  const photoCount = selectedPhotos.filter(photo => photo !== null).length;
  const isFormComplete = photoCount > 0;

  return (
    <div style={{
      height: '100vh',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden'
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
          style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', cursor: 'pointer' }}>
          Vōstcard
        </span>
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
            cursor: 'pointer',
            fontSize: 20,
            color: 'white'
          }}
        >
          <FaArrowLeft />
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: 400,
        padding: '70px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
        overflowX: 'hidden'
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#002B4D',
          textAlign: 'center',
          marginBottom: 20,
          letterSpacing: '0.01em',
          paddingTop: '5px'
        }}>
          Add Photos
        </h1>
        


        {/* Photo Grid - 3 across layout for smaller buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginBottom: 5,
          width: '100%',
          maxWidth: 300,
          justifyItems: 'center',
          paddingTop: '5px'
        }}>
          {selectedPhotos.slice(0, 3).map((photo, idx) => (
            <button
              key={idx}
              onClick={() => handleAddPhoto(idx)}
              style={{
                width: 90,
                height: 90,
                borderRadius: 8,
                border: '2px solid #002B4D',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginBottom: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,43,77,0.1)',
                backgroundImage: photo ? `url(${URL.createObjectURL(photo)})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: photo ? 'transparent' : '#f8f9fa',
              }}
            >
              {photo ? (
                // Remove button for filled thumbnails
                <button
                  onClick={(e) => handleRemovePhoto(idx, e)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 10,
                    color: '#dc3545',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}
                >
                  <FaTimes />
                </button>
              ) : (
                // Add photo prompt for empty thumbnails
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: '#002B4D',
                  opacity: 0.7
                }}>
                  <FaRegImages size={20} style={{ marginBottom: 4 }} />
                  <span style={{ fontSize: 10, fontWeight: 600 }}>
                    Add Photo
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Fourth photo button - centered below */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 5,
          width: '100%'
        }}>
          <button
            onClick={() => handleAddPhoto(3)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 8,
              border: '2px solid #002B4D',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: 8,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,43,77,0.1)',
              backgroundImage: selectedPhotos[3] ? `url(${URL.createObjectURL(selectedPhotos[3])})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: selectedPhotos[3] ? 'transparent' : '#f8f9fa',
            }}
          >
            {selectedPhotos[3] ? (
              // Remove button for filled thumbnail
              <button
                onClick={(e) => handleRemovePhoto(3, e)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 10,
                  color: '#dc3545',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              >
                <FaTimes />
              </button>
            ) : (
              // Add photo prompt for empty thumbnail
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#002B4D',
                opacity: 0.7
              }}>
                <FaRegImages size={20} style={{ marginBottom: 4 }} />
                <span style={{ fontSize: 10, fontWeight: 600 }}>
                  Add Photo
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Photo count indicator */}
        <div style={{
          fontSize: 14,
          color: '#666',
          textAlign: 'center',
          marginBottom: 0,
          paddingTop: '2px'
        }}>
          {photoCount} of 4 photos added
        </div>

        {/* Continue button */}
        <button
          style={{
            ...buttonStyle,
            backgroundColor: isFormComplete ? '#002B4D' : '#cccccc',
            cursor: isFormComplete ? 'pointer' : 'not-allowed'
          }}
          onClick={handleSaveAndContinue}
          disabled={!isFormComplete}
        >
          Save & Continue
        </button>

        {/* Instructions */}
        <div style={{
          marginTop: 20,
          fontSize: 12,
          color: '#999',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          📱 Tap any thumbnail to add or replace a photo
        </div>
      </div>

      {/* Hidden file inputs for different photo sources */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      
      {/* Camera input - optimized for camera capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      
      {/* Library input - allows multiple file types */}
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Photo Options Modal */}
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