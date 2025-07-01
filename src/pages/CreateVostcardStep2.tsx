import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();
  const { currentVostcard, setCurrentVostcard } = useVostcard();

  const [distantPhoto, setDistantPhoto] = useState<string | null>(currentVostcard?.photo1URL || null);
  const [nearPhoto, setNearPhoto] = useState<string | null>(currentVostcard?.photo2URL || null);

  const handlePhotoSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'distant' | 'near'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const storageRef = ref(storage, `vostcard-photos/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        if (type === 'distant') {
          setDistantPhoto(downloadURL);
          setCurrentVostcard((prev: any) => ({
            ...prev,
            photo1: file,
            photo1URL: downloadURL,
          }));
        }

        if (type === 'near') {
          setNearPhoto(downloadURL);
          setCurrentVostcard((prev: any) => ({
            ...prev,
            photo2: file,
            photo2URL: downloadURL,
          }));
        }
      } catch (error) {
        console.error('Upload failed', error);
      }
    }
  };

  return (
    <div style={container}>
      {/* 🔵 Header */}
      <div style={header}>
        <h1 style={logo}>Vōstcard</h1>
        <img
          src="/home-icon.png"
          alt="Home"
          style={{ width: 28, height: 28, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
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
          onClick={() => {
            navigate('/create-step3');
          }}
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
  flexDirection: 'column' as const,
  alignItems: 'center',
};

const header = {
  backgroundColor: '#002B4D',
  height: '100px',
  width: '100%',
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  padding: '0 20px',
  boxSizing: 'border-box' as const,
};

const logo = {
  color: 'white',
  fontSize: '28px',
  margin: 0,
};

const thumbnailsContainer = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '30px',
  marginTop: '20px',
};

const thumbnail = {
  backgroundColor: '#F3F3F3',
  width: '210px',
  height: '210px',
  borderRadius: '20px',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  alignItems: 'center',
};

const imageIcon = {
  width: '50px',
  height: '50px',
  marginBottom: '10px',
  objectFit: 'cover' as const,
};

const label = {
  color: '#002B4D',
  fontSize: '18px',
  textAlign: 'center' as const,
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