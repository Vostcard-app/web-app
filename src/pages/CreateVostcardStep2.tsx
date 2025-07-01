import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();
  const { currentVostcard, updateVostcard, saveVostcard } = useVostcard();

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'distant' | 'near') => {
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
    saveVostcard();

    e.target.value = '';
  };

  const handleSaveAndContinue = async () => {
    await saveVostcard();
    navigate('/create-step3');
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
        <div style={thumbnail}>
          <label style={labelStyle}>
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
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handlePhotoSelect(e, 'distant')}
            />
          </label>
        </div>

        {/* Near */}
        <div style={thumbnail}>
          <label style={labelStyle}>
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
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handlePhotoSelect(e, 'near')}
            />
          </label>
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

const labelStyle = {
  cursor: 'pointer',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column' as const,
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
  backgroundColor: 'white',
};

const saveButton = {
  width: '100%',
  padding: '15px',
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '18px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default CreateVostcardStep2;