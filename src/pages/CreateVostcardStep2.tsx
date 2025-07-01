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

  const [showModal, setShowModal] = useState<boolean>(false);
  const [photoType, setPhotoType] = useState<'distant' | 'near' | null>(null);

  const hiddenFileInput = React.useRef<HTMLInputElement>(null);
  const cameraFileInput = React.useRef<HTMLInputElement>(null);
  const libraryFileInput = React.useRef<HTMLInputElement>(null);

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

        const updatedVostcard = {
          ...currentVostcard,
          photos: [
            ...(currentVostcard?.photos || []).filter((p: any) => p.type !== type),
            { type, url: downloadURL, filename: file.name },
          ],
        };

        if (type === 'distant') {
          setDistantPhoto(downloadURL);
          updatedVostcard.photo1 = file;
          updatedVostcard.photo1URL = downloadURL;
        }

        if (type === 'near') {
          setNearPhoto(downloadURL);
          updatedVostcard.photo2 = file;
          updatedVostcard.photo2URL = downloadURL;
        }

        setCurrentVostcard(updatedVostcard);
      } catch (error) {
        console.error('Upload failed', error);
      }
    }
  };

  const openCamera = () => {
    if (cameraFileInput.current) {
      cameraFileInput.current.value = '';
      cameraFileInput.current.click();
    }
  };

  const openLibrary = () => {
    if (libraryFileInput.current) {
      libraryFileInput.current.value = '';
      libraryFileInput.current.click();
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
          <label
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setPhotoType('distant');
              setShowModal(true);
            }}
          >
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
          </label>
        </div>

        {/* Near */}
        <div style={thumbnail}>
          <label
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setPhotoType('near');
              setShowModal(true);
            }}
          >
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
          </label>
        </div>
      </div>

      {/* Camera File Input */}
      <input
        ref={cameraFileInput}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (photoType) {
            handlePhotoSelect(e, photoType);
          }
          setShowModal(false);
        }}
      />

      {/* Library File Input */}
      <input
        ref={libraryFileInput}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (photoType) {
            handlePhotoSelect(e, photoType);
          }
          setShowModal(false);
        }}
      />

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

      {/* 🚀 Modal */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Select Photo Source</h3>
            <button
              style={modalButton}
              onClick={openCamera}
            >
              📷 Take Photo
            </button>
            <button
              style={modalButton}
              onClick={openLibrary}
            >
              🖼️ Choose from Library
            </button>
            <button
              style={cancelButton}
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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

/* Modal Styles */
const modalOverlay = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContent = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '12px',
  width: '80%',
  textAlign: 'center' as const,
};

const modalButton = {
  backgroundColor: '#002B4D',
  color: 'white',
  padding: '10px',
  margin: '10px 0',
  border: 'none',
  borderRadius: '8px',
  width: '100%',
  cursor: 'pointer',
  fontSize: '16px',
};

const cancelButton = {
  ...modalButton,
  backgroundColor: 'gray',
};

export default CreateVostcardStep2;