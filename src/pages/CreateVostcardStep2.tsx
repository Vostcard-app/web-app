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

  const distantInputRef = useRef<HTMLInputElement>(null);
  const nearInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentVostcard?.photos && currentVostcard.photos.length >= 2) {
      try {
        const photo1Url = URL.createObjectURL(currentVostcard.photos[0]);
        const photo2Url = URL.createObjectURL(currentVostcard.photos[1]);
        setDistantPhoto(photo1Url);
        setNearPhoto(photo2Url);
        setPhotoLoadError({ distant: false, near: false });
      } catch (error) {
        console.error('Error restoring photos:', error);
        setPhotoLoadError({ distant: true, near: true });
      }
    } else {
      setDistantPhoto(null);
      setNearPhoto(null);
      setPhotoLoadError({ distant: false, near: false });
    }
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
        setPhotoLoadError(prev => ({ ...prev, distant: false }));

        const currentPhotos = currentVostcard?.photos || [];
        const updatedPhotos: Blob[] = [...currentPhotos];
        updatedPhotos[0] = file;
        if (updatedPhotos.length < 2) updatedPhotos[1] = currentPhotos[1] || new Blob();

        updateVostcard({ photos: updatedPhotos });
      } else if (type === 'near') {
        setNearPhoto(url);
        setPhotoLoadError(prev => ({ ...prev, near: false }));

        const currentPhotos = currentVostcard?.photos || [];
        const updatedPhotos: Blob[] = [...currentPhotos];
        if (updatedPhotos.length < 1) updatedPhotos[0] = new Blob();
        updatedPhotos[1] = file;

        updateVostcard({ photos: updatedPhotos });
      }

      event.target.value = '';
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      if (!currentVostcard?.video) {
        alert('Video is required. Please record a video first.');
        return;
      }

      await saveVostcard();
      navigate('/create-step3');
    } catch (error) {
      console.error('Error in handleSaveAndContinue:', error);
      alert('Failed to save Vostcard. Please try again.');
    }
  };

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
      <div style={header}>
        <h1 style={logo}>Vōstcard</h1>
        <FaArrowLeft
          size={24}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')}
        />
      </div>

      <div style={thumbnailsContainer}>
        <div style={thumbnail}>
          <label style={labelStyle}>
            {distantPhoto ? (
              <img
                src={distantPhoto}
                alt="Distant"
                style={imageStyle}
              />
            ) : (
              <div style={placeholder}>
                <FaCamera size={32} color="#666" />
                <span style={placeholderText}>Distant Photo</span>
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

        <div style={thumbnail}>
          <label style={labelStyle}>
            {nearPhoto ? (
              <img
                src={nearPhoto}
                alt="Near"
                style={imageStyle}
              />
            ) : (
              <div style={placeholder}>
                <FaCamera size={32} color="#666" />
                <span style={placeholderText}>Near Photo</span>
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

const labelStyle = {
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as 'column',
  alignItems: 'center',
  width: '100%',
  height: '100%',
};

const imageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as 'cover',
  borderRadius: '8px',
};

const placeholder = {
  display: 'flex',
  flexDirection: 'column' as 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#666',
};

const placeholderText = {
  marginTop: '8px',
  fontSize: '14px',
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
  fontWeight: 'bold' as 'bold',
  cursor: 'pointer',
};

export default CreateVostcardStep2;