import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();
  const { currentVostcard, updateVostcard, saveLocalVostcard } = useVostcard();

  const [distantPhoto, setDistantPhoto] = useState<string | null>(null);
  const [nearPhoto, setNearPhoto] = useState<string | null>(null);

  const distantInputRef = useRef<HTMLInputElement>(null);
  const nearInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentVostcard?.photos) {
      if (currentVostcard.photos[0]) {
        setDistantPhoto(URL.createObjectURL(currentVostcard.photos[0]));
      }
      if (currentVostcard.photos[1]) {
        setNearPhoto(URL.createObjectURL(currentVostcard.photos[1]));
      }
    }
  }, [currentVostcard]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'distant' | 'near') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const photoURL = URL.createObjectURL(file);

    if (type === 'distant') {
      setDistantPhoto(photoURL);
    } else {
      setNearPhoto(photoURL);
    }

    const currentPhotos = currentVostcard?.photos || [];
    const updatedPhotos: Blob[] =
      type === 'distant'
        ? [file, currentPhotos[1] || null].filter(Boolean) as Blob[]
        : [currentPhotos[0] || null, file].filter(Boolean) as Blob[];

    updateVostcard({ photos: updatedPhotos });
    
    // Save to IndexedDB for private Vostcards
    try {
      await saveLocalVostcard();
    } catch (error) {
      console.error('Failed to save photo locally:', error);
      alert('Failed to save photo. Please try again.');
    }

    e.target.value = '';
  };

  const handleChooseOption = (type: 'distant' | 'near') => {
    const choice = window.confirm('Tap OK to Take Photo, Cancel to Select from Files');
    if (choice) {
      // Open camera
      if (type === 'distant') {
        distantInputRef.current?.setAttribute('capture', 'environment');
        distantInputRef.current?.click();
      } else {
        nearInputRef.current?.setAttribute('capture', 'environment');
        nearInputRef.current?.click();
      }
    } else {
      // Open file picker
      if (type === 'distant') {
        distantInputRef.current?.removeAttribute('capture');
        distantInputRef.current?.click();
      } else {
        nearInputRef.current?.removeAttribute('capture');
        nearInputRef.current?.click();
      }
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      await saveLocalVostcard();
      navigate('/create-step3');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed, check console.');
    }
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <h1 style={logo}>Vōstcard</h1>
        <FaArrowLeft
          size={24}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')}
        />
      </div>

      {/* Thumbnails */}
      <div style={thumbnailsContainer}>
        {/* Distant */}
        <div style={thumbnail} onClick={() => handleChooseOption('distant')}>
          {distantPhoto ? (
            <img src={distantPhoto} alt="Distant" style={imageStyle} />
          ) : (
            <div style={placeholder}>
              <FaCamera size={32} color="#002B4D" />
              <span>Distant (Suggested)</span>
            </div>
          )}
          <input
            ref={distantInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoSelect(e, 'distant')}
          />
        </div>

        {/* Near */}
        <div style={thumbnail} onClick={() => handleChooseOption('near')}>
          {nearPhoto ? (
            <img src={nearPhoto} alt="Near" style={imageStyle} />
          ) : (
            <div style={placeholder}>
              <FaCamera size={32} color="#002B4D" />
              <span>Near (Suggested)</span>
            </div>
          )}
          <input
            ref={nearInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoSelect(e, 'near')}
          />
        </div>
      </div>

      {/* Save & Continue */}
      <div style={buttonContainer}>
        <button style={saveButton} onClick={handleSaveAndContinue}>
          Save & Continue
        </button>
      </div>
    </div>
  );
};

const container = {
  height: '100vh',
  width: '100vw',
  backgroundColor: 'white',
  display: 'flex',
  flexDirection: 'column' as const,
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
  boxSizing: 'border-box' as const,
};

const logo = {
  color: 'white',
  fontSize: '24px',
  margin: 0,
};

const thumbnailsContainer = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '20px',
  padding: '20px',
  width: '100%',
  maxWidth: '400px',
  flex: 1,
};

const thumbnail = {
  width: '100%',
  height: '200px',
  borderRadius: '16px',
  backgroundColor: '#F5F5F5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const placeholder = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  color: '#002B4D',
  fontWeight: 500,
  gap: '8px',
};

const imageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  borderRadius: '16px',
};

const buttonContainer = {
  padding: '20px',
  width: '100%',
  maxWidth: '400px',
  position: 'fixed' as const,
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
};

const saveButton = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '14px',
  fontSize: '18px',
  cursor: 'pointer',
  width: '100%',
};

export default CreateVostcardStep2;
