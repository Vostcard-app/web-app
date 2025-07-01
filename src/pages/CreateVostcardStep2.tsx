import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();
  const { currentVostcard, updateVostcard, saveLocalVostcard } = useVostcard();

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
    console.log('📸 Event target files:', event.target.files);
    
    const file = event.target.files?.[0];
    if (file) {
      console.log('📸 Photo selected:', {
        type,
        fileSize: file.size,
        fileType: file.type,
        fileName: file.name,
        currentPhotosCount: currentVostcard?.photos?.length || 0,
        userAgent: navigator.userAgent,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
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
        
        console.log('📸 Updating photos array for distant:', {
          oldCount: currentPhotos.length,
          newCount: updatedPhotos.length,
          photo1Size: updatedPhotos[0]?.size,
          photo2Size: updatedPhotos[1]?.size
        });
        
        updateVostcard({ photos: updatedPhotos });
      } else {
        setNearPhoto(url);
        setPhotoLoadError(prev => ({ ...prev, near: false }));
        
        // Get current photos array
        const currentPhotos = currentVostcard?.photos || [];
        let updatedPhotos: Blob[];
        
        if (currentPhotos.length === 0) {
          // No photos yet, create array with this photo at index 1
          updatedPhotos = [file]; // Start with just this photo
        } else if (currentPhotos.length === 1) {
          // One photo exists, add this photo at index 1
          updatedPhotos = [currentPhotos[0], file];
        } else {
          // Two photos exist, replace index 1
          updatedPhotos = [currentPhotos[0], file];
        }
        
        console.log('📸 Updating photos array for near:', {
          oldCount: currentPhotos.length,
          newCount: updatedPhotos.length,
          photo1Size: updatedPhotos[0]?.size,
          photo2Size: updatedPhotos[1]?.size
        });
        
        updateVostcard({ photos: updatedPhotos });
      }
      
      // Clear the input value to allow selecting the same file again
      event.target.value = '';
    } else {
      console.log('📸 No file selected for', type);
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      console.log('📸 Starting save and continue process...');
      console.log('📸 Current Vostcard state:', {
        id: currentVostcard?.id,
        hasVideo: !!currentVostcard?.video,
        videoSize: currentVostcard?.video?.size,
        photosCount: currentVostcard?.photos?.length || 0,
        photoSizes: currentVostcard?.photos?.map(p => p.size) || []
      });
      
      // Validate that we have the required data
      if (!currentVostcard?.video) {
        alert('Video is required. Please record a video first.');
        return;
      }
      
      // Automatically save as private when continuing
      await saveLocalVostcard();
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
                style={imageIcon}
                onError={() => {
                  console.error('📸 Error loading distant photo');
                  setPhotoLoadError(prev => ({ ...prev, distant: true }));
                }}
                onLoad={() => {
                  console.log('📸 Distant photo loaded successfully');
                  setPhotoLoadError(prev => ({ ...prev, distant: false }));
                }}
              />
            ) : (
              <FaCamera size={50} color="#002B4D" style={{ marginBottom: '10px' }} />
            )}
            <p style={label}>
              Distant
              <br />
              (Suggested)
            </p>
            <input
              ref={distantInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoSelect(e, 'distant')}
              style={{ display: 'none' }}
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
                style={imageIcon}
                onError={() => {
                  console.error('📸 Error loading near photo');
                  setPhotoLoadError(prev => ({ ...prev, near: true }));
                }}
                onLoad={() => {
                  console.log('📸 Near photo loaded successfully');
                  setPhotoLoadError(prev => ({ ...prev, near: false }));
                }}
              />
            ) : (
              <FaCamera size={50} color="#002B4D" style={{ marginBottom: '10px' }} />
            )}
            <p style={label}>
              Near
              <br />
              (Suggested)
            </p>
            <input
              ref={nearInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoSelect(e, 'near')}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* ✅ Save & Continue Button */}
      <div style={buttonContainer}>
        <div style={{
          textAlign: 'center',
          marginBottom: '10px',
          fontSize: '14px',
          color: '#666',
          fontStyle: 'italic'
        }}>
          Photos are optional - you can add them later
        </div>
        <button
          style={button}
          onClick={() => {
            console.log('📸 Save & Continue button clicked');
            handleSaveAndContinue();
          }}
        >
          Save & Continue to Step 3
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
  fontSize: '28px',
  margin: 0,
};

const thumbnailsContainer = {
  display: 'flex',
  flexDirection: 'column' as 'column',
  gap: '30px',
  marginTop: '60px',
};

const thumbnail = {
  backgroundColor: '#F3F3F3',
  width: '210px',
  height: '210px',
  borderRadius: '20px',
  display: 'flex',
  flexDirection: 'column' as 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const imageIcon = {
  width: '50px',
  height: '50px',
  marginBottom: '10px',
  objectFit: 'cover' as 'cover',
  borderRadius: '8px',
};

const label = {
  color: '#002B4D',
  fontSize: '18px',
  textAlign: 'center' as 'center',
  margin: 0,
};

const buttonContainer = {
  marginTop: 'auto',
  marginBottom: '60px',
  width: '90%',
};

const button = {
  width: '100%',
  backgroundColor: '#002B4D',
  color: 'white',
  padding: '15px',
  borderRadius: '12px',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
};

export default CreateVostcardStep2;