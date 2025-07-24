import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages, FaTimes } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

export default function QuickcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard, currentVostcard } = useVostcard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos (4 thumbnails for quickcards)
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null, null, null]);
  const [activeThumbnail, setActiveThumbnail] = useState<number | null>(null);

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

  // Handler for when a thumbnail is tapped - opens native camera/file picker
  const handleAddPhoto = (index: number) => {
    setActiveThumbnail(index);
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-index', index.toString());
      fileInputRef.current.click();
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
    padding: '3px',
    fontSize: 18,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    maxWidth: 300,
    marginTop: 24,
    boxShadow: '0 4px 12px rgba(0,43,77,0.12)',
    letterSpacing: '0.01em',
  };

  // Save and continue handler
  const handleSaveAndContinue = () => {
    // Filter out null photos - quickcards need at least 1 photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    
    if (validPhotos.length === 0) {
      alert('Please add at least one photo for your Quickcard.');
      return;
    }
    
    updateVostcard({ photos: validPhotos });
    navigate('/quickcard-step3');
  };

  const photoCount = selectedPhotos.filter(photo => photo !== null).length;

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
        alignItems: 'center'
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#002B4D',
          textAlign: 'center',
          marginBottom: 8,
          letterSpacing: '0.01em',
          paddingTop: '5px'
        }}>
          Add Photos
        </h1>
        
        <p style={{
          fontSize: 16,
          color: '#666',
          textAlign: 'center',
          marginBottom: 5,
          lineHeight: 1.4
        }}>
          Add up to 4 photos for your Quickcard
        </p>

        {/* Photo Grid - 2x2 layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: 5,
          width: '100%',
          maxWidth: 300,
          justifyItems: 'center',
          paddingTop: '5px'
        }}>
          {selectedPhotos.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => handleAddPhoto(idx)}
              style={{
                ...thumbnailStyle,
                backgroundImage: photo ? `url(${URL.createObjectURL(photo)})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: photo ? 'transparent' : '#f8f9fa',
                border: photo ? '3px solid #28a745' : '3px dashed #002B4D',
              }}
            >
              {photo ? (
                // Remove button for filled thumbnails
                <button
                  onClick={(e) => handleRemovePhoto(idx, e)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#dc3545',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
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
                  <FaRegImages size={32} style={{ marginBottom: 8 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    Photo {idx + 1}
                  </span>
                </div>
              )}
            </button>
          ))}
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
            opacity: photoCount === 0 ? 0.6 : 1,
            cursor: photoCount === 0 ? 'not-allowed' : 'pointer'
          }}
          onClick={handleSaveAndContinue}
          disabled={photoCount === 0}
        >
          Continue to Details
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
} 