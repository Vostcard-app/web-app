import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();
  const { currentVostcard, updateVostcard } = useVostcard();

  const [distantPhoto, setDistantPhoto] = useState<string | null>(null);
  const [nearPhoto, setNearPhoto] = useState<string | null>(null);

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
        
        console.log('📸 Restored photos from context:', {
          photo1Size: currentVostcard.photos[0]?.size,
          photo2Size: currentVostcard.photos[1]?.size,
          photo1Url: photo1Url,
          photo2Url: photo2Url
        });
      } catch (error) {
        console.error('❌ Error restoring photos:', error);
      }
    } else {
      console.log('📸 No photos to restore or insufficient photos');
      setDistantPhoto(null);
      setNearPhoto(null);
    }
  }, [currentVostcard]);

  const handlePhotoSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'distant' | 'near'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      console.log('📸 Photo selected:', {
        type,
        fileSize: file.size,
        fileType: file.type,
        currentPhotosCount: currentVostcard?.photos?.length || 0
      });

      if (type === 'distant') {
        setDistantPhoto(url);
        // Store in photos array at index 0
        const currentPhotos = currentVostcard?.photos || [];
        const updatedPhotos = [file, ...currentPhotos.slice(1)];
        console.log('📸 Updating photos array for distant:', {
          oldCount: currentPhotos.length,
          newCount: updatedPhotos.length,
          photo1Size: updatedPhotos[0]?.size
        });
        updateVostcard({ photos: updatedPhotos });
      } else {
        setNearPhoto(url);
        // Store in photos array at index 1
        const currentPhotos = currentVostcard?.photos || [];
        const updatedPhotos = [...currentPhotos.slice(0, 1), file];
        console.log('📸 Updating photos array for near:', {
          oldCount: currentPhotos.length,
          newCount: updatedPhotos.length,
          photo2Size: updatedPhotos[1]?.size
        });
        updateVostcard({ photos: updatedPhotos });
      }
    }
  };

  const handleSaveAndContinue = () => {
    // Automatically save as private when continuing
    saveLocalVostcard();
    console.log('📸 Proceeding to Step 3 with photos:', currentVostcard?.photos?.length || 0);
    navigate('/create-step3');
  };

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
          <label style={{ cursor: 'pointer' }}>
            <img
              src={distantPhoto || '/placeholder.png'}
              alt="Distant"
              style={imageIcon}
            />
            <p style={label}>
              Distant
              <br />
              (Suggested)
            </p>
            <input
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
          <label style={{ cursor: 'pointer' }}>
            <img
              src={nearPhoto || '/placeholder.png'}
              alt="Near"
              style={imageIcon}
            />
            <p style={label}>
              Near
              <br />
              (Suggested)
            </p>
            <input
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
        <button
          style={button}
          onClick={handleSaveAndContinue}
        >
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
  width: '210px', // ✅ 25% smaller
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