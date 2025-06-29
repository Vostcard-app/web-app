import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();
  const { currentVostcard, updateVostcard } = useVostcard();

  const [distantPhoto, setDistantPhoto] = useState<string | null>(null);
  const [nearPhoto, setNearPhoto] = useState<string | null>(null);

  // Debug location data when component mounts
  useEffect(() => {
    console.log('📍 Step 2 - Current Vostcard data:', {
      id: currentVostcard?.id,
      hasVideo: !!currentVostcard?.video,
      hasGeo: !!currentVostcard?.geo,
      geo: currentVostcard?.geo,
      title: currentVostcard?.title,
      photosCount: currentVostcard?.photos?.length,
      categoriesCount: currentVostcard?.categories?.length
    });
  }, [currentVostcard]);

  const handlePhotoSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'distant' | 'near'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'distant') {
        setDistantPhoto(url);
        // Save Blob to context instead of URL
        const currentPhotos = currentVostcard?.photos || [];
        updateVostcard({ photos: [...currentPhotos, file] });
      } else {
        setNearPhoto(url);
        // Save Blob to context instead of URL
        const currentPhotos = currentVostcard?.photos || [];
        updateVostcard({ photos: [...currentPhotos, file] });
      }
    }
  };

  const handleSaveAndContinue = () => {
    // Ensure photos are saved to context before navigating
    const photos = [];
    if (distantPhoto) {
      // Find the corresponding file for distant photo
      const distantFile = currentVostcard?.photos.find((_, index) => index === 0);
      if (distantFile) photos.push(distantFile);
    }
    if (nearPhoto) {
      // Find the corresponding file for near photo
      const nearFile = currentVostcard?.photos.find((_, index) => index === 1);
      if (nearFile) photos.push(nearFile);
    }
    
    if (photos.length > 0) {
      updateVostcard({ photos });
    }
    
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
        <button style={button} onClick={handleSaveAndContinue}>
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