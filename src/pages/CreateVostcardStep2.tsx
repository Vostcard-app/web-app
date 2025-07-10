import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

export default function CreateVostcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard } = useVostcard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  // Handler for when a thumbnail is tapped
  const handleAddPhoto = () => {
    if (selectedPhotos.length >= 2) {
      alert('You can only add up to 2 photos.');
      return;
    }
    fileInputRef.current?.click();
  };

  // Handle file selection (camera or library)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhotos(prev => {
        if (prev.length >= 2) return prev; // Prevent adding more than 2
        return [...prev, file];
      });
      // Optionally, you can limit the number of photos or replace instead of append
    }
  };

  // Updated option style with reduced padding
  const optionStyle = {
    background: '#f4f6f8',
    borderRadius: 24,
    padding: '24px 0',
    marginBottom: 32,
    width: '100%',
    maxWidth: 340,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
  };

  const buttonStyle = {
    background: '#002B4D',
    color: 'white',
    border: 'none',
    borderRadius: 16,
    fontSize: 24,
    fontWeight: 600,
    padding: '20px 0',
    width: '100%',
    maxWidth: 380,
    margin: '0 auto',
    marginTop: 24,
    boxShadow: '0 4px 12px rgba(0,43,77,0.12)',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  };

  // Save and continue handler
  const handleSaveAndContinue = () => {
    // Save selected photos to the vostcard context
    updateVostcard({ photos: selectedPhotos });
    navigate('/create-step3');
  };

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
        position: 'relative'
      }}>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.01em' }}>Vōstcard</span>
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
            cursor: 'pointer'
          }}
        >
          <FaArrowLeft size={28} color="white" />
        </button>
      </div>

      {/* Options - now scrollable */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px 0 20px',
        boxSizing: 'border-box',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}>
        {/* Thumbnails for selected photos (now grouped with Add Photo) */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {selectedPhotos.map((file, idx) => (
            <img
              key={idx}
              src={URL.createObjectURL(file)}
              alt={`Selected ${idx + 1}`}
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 12,
                border: '2px solid #002B4D',
              }}
            />
          ))}
        </div>
        <button style={optionStyle} onClick={handleAddPhoto}>
          {selectedPhotos[0] ? (
            <img
              src={URL.createObjectURL(selectedPhotos[0])}
              alt="Distant"
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 12,
                border: '2px solid #002B4D',
                marginBottom: 16,
              }}
            />
          ) : (
            <FaRegImages size={48} color="#002B4D" style={{ marginBottom: 16 }} />
          )}
          <div style={{ fontSize: 24, color: '#002B4D', fontWeight: 600, textAlign: 'center' }}>
            Distant<br />(Suggested)
          </div>
        </button>
        <button style={optionStyle} onClick={handleAddPhoto}>
          {selectedPhotos[1] ? (
            <img
              src={URL.createObjectURL(selectedPhotos[1])}
              alt="Near"
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 12,
                border: '2px solid #002B4D',
                marginBottom: 16,
              }}
            />
          ) : (
            <FaRegImages size={48} color="#002B4D" style={{ marginBottom: 16 }} />
          )}
          <div style={{ fontSize: 24, color: '#002B4D', fontWeight: 600, textAlign: 'center' }}>
            Near<br />(Suggested)
          </div>
        </button>
        <button
          style={{ ...buttonStyle, marginTop: 4 }}
          onClick={handleSaveAndContinue}
        >
          Save & Continue
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
