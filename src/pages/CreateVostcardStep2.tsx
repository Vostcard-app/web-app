import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();
  const { currentVostcard, updateVostcard, saveVostcard } = useVostcard();

  const [distantPhoto, setDistantPhoto] = useState<string | null>(null);
  const [nearPhoto, setNearPhoto] = useState<string | null>(null);
  const [photoLoadError, setPhotoLoadError] = useState({ distant: false, near: false });
  
  // Refs for file inputs to handle iOS Safari issues
  const distantInputRef = useRef<HTMLInputElement>(null);
  const nearInputRef = useRef<HTMLInputElement>(null);

  // Restore photos when component mounts or currentVostcard changes
  useEffect(() => {
    console.log('📸 Step 2 - Current Vostcard photos:', {
      photosCount: currentVostcard?.photos?.length || 0,
      photos: currentVostcard?.photos,
      hasPhoto1: !!currentVostcard?.photos?.[0],
      hasPhoto2: !!currentVostcard?.photos?.[1]
    });
    
    if (currentVostcard?.photos && currentVostcard.photos.length >= 2) {
      try {
        // Create URLs for the stored photo blobs
        const photo1Url = URL.createObjectURL(currentVostcard.photos[0]);
        const photo2Url = URL.createObjectURL(currentVostcard.photos[1]);
        setDistantPhoto(photo1Url);
        setNearPhoto(photo2Url);
        setPhotoLoadError({ distant: false, near: false });
        
        console.log('📸 Restored photos from context:', {
          photo1Size: currentVostcard.photos[0]?.size,
          photo2Size: currentVostcard.photos[1]?.size,
          photo1Url: photo1Url,
          photo2Url: photo2Url
        });
      } catch (error) {
        console.error('❌ Error restoring photos:', error);
        setPhotoLoadError({ distant: true, near: true });
      }
    } else {
      console.log('📸 No photos to restore or insufficient photos');
      setDistantPhoto(null);
      setNearPhoto(null);
      setPhotoLoadError({ distant: false, near: false });
    }
  }, [currentVostcard]);

  const handlePhotoSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'distant' | 'near'
  ) => {
    console.log('📸 handlePhotoSelect triggered for:', type);
    
    const file = event.target.files?.[0];
    if (file) {
      console.log('📸 Photo selected:', {
        type,
        fileSize: file.size,
        fileType: file.type,
        fileName: file.name,
        currentPhotosCount: currentVostcard?.photos?.length || 0
      });

      // Create URL for immediate display
      const url = URL.createObjectURL(file);
      
      if (type === 'distant') {
        setDistantPhoto(url);
        setPhotoLoadError(prev => ({ ...prev, distant: false }));
        
        // Get current photos array
        const currentPhotos = currentVostcard?.photos || [];
        let updatedPhotos: Blob[];
        
        if (currentPhotos.length === 0) {
          // No photos yet, create array with this photo at index 0
          updatedPhotos = [file];
        } else if (currentPhotos.length === 1) {
          // One photo exists, replace index 0 and keep index 1 if it exists
          updatedPhotos = [file, currentPhotos[1]];
        } else {
          // Two photos exist, replace index 0
          updatedPhotos = [file, currentPhotos[1]];
        }
        
        updateVostcard({ photos: updatedPhotos });
      } else {
        setNearPhoto(url);
        setPhotoLoadError(prev => ({ ...prev, near: false }));
        
        // Get current photos array
        const currentPhotos = currentVostcard?.photos || [];
        let updatedPhotos: Blob[];
        
        if (currentPhotos.length === 0) {
          // No photos yet, create array with this photo at index 1
          updatedPhotos = [file];
        } else if (currentPhotos.length === 1) {
          // One photo exists, add this photo at index 1
          updatedPhotos = [currentPhotos[0], file];
        } else {
          // Two photos exist, replace index 1
          updatedPhotos = [currentPhotos[0], file];
        }
        
        updateVostcard({ photos: updatedPhotos });
      }
      
      // Clear the input value to allow selecting the same file again
      event.target.value = '';
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      console.log('📸 Starting save and continue process...');
      
      // Validate that we have the required data
      if (!currentVostcard?.video) {
        alert('Video is required. Please record a video first.');
        return;
      }
      
      // Save to Firebase
      await saveVostcard();
      console.log('📸 Save completed successfully, proceeding to Step 3');
      navigate('/create-step3');
    } catch (error) {
      console.error('📸 Error in handleSaveAndContinue:', error);
      alert('Failed to save Vostcard. Please try again.');
    }
  };

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (distantPhoto) {
        URL.revokeObjectURL(distantPhoto);
      }
      if (nearPhoto) {
        URL.revokeObjectURL(nearPhoto);
      }
    };
  }, [distantPhoto, nearPhoto]);

  return (
    <div style={container}>
      {/* 🔵 Header */}
      <div style={header}>
        <h1 style={logo}>Vōstcard</h1>
        <FaArrowLeft
          size={24}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')}
        />
      </div>

      {/* 🔲 Thumbnails */}
      <div style={thumbnailsContainer}>
        {/* Distant */}
        <div style={thumbnail}>
          <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
            {distantPhoto ? (
              <img
                src={distantPhoto}
                alt="Distant"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
            ) : (
              <div style={placeholder}>
                <FaCamera size={32} color="#666" />
                <span style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>Distant Photo</span>
              </div>
            )}
            <input
              ref={distantInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handlePhotoSelect(e, 'distant')}
            />
          </label>
        </div>

        {/* Near */}
        <div style={thumbnail}>
          <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
            {nearPhoto ? (
              <img
                src={nearPhoto}
                alt="Near"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
            ) : (
              <div style={placeholder}>
                <FaCamera size={32} color="#666" />
                <span style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>Near Photo</span>
              </div>
            )}
            <input
              ref={nearInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handlePhotoSelect(e, 'near')}
            />
          </label>
        </div>
      </div>

      {/* 🔘 Save & Continue Button */}
      <div style={buttonContainer}>
        <button style={saveButton} onClick={handleSaveAndContinue}>
          Save & Continue
        </button>
      </div>
    </div>
  );
};

/* 🎨 Styles */
const container = {
  height: '100vh',
  width: '100vw',
  backgroundColor: 'white',
  display: 'flex',
  flexDirection: 'column' as 'column',
  alignItems: 'center',
};

const header = {
  backgroundColor: '#002B4D',
  height: '70px',
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 20px',
  boxSizing: 'border-box' as 'border-box',
};

const logo = {
  color: 'white',
  fontSize: '24px',
  margin: 0,
};

const thumbnailsContainer = {
  display: 'flex',
  flexDirection: 'column' as 'column',
  gap: '20px',
  padding: '20px',
  width: '100%',
  maxWidth: '400px',
  flex: 1,
};

const thumbnail = {
  width: '100%',
  height: '200px',
  border: '2px dashed #ccc',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f9f9f9',
};

const placeholder = {
  display: 'flex',
  flexDirection: 'column' as 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#666',
};

const buttonContainer = {
  padding: '20px',
  width: '100%',
  maxWidth: '400px',
};

const saveButton = {
  width: '100%',
  padding: '15px',
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default CreateVostcardStep2;