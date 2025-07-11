import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

export default function CreateVostcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard } = useVostcard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null]);
  const [activeThumbnail, setActiveThumbnail] = useState<number | null>(null);

  // Handler for when a thumbnail is tapped
  const handleAddPhoto = (index: number) => {
    setActiveThumbnail(index);
    fileInputRef.current?.click();
  };

  // Handle file selection (camera or library)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && activeThumbnail !== null) {
      setSelectedPhotos(prev => {
        const updated = [...prev];
        updated[activeThumbnail] = file;
        return updated;
      });
      setActiveThumbnail(null);
    }
  };

  // Smaller square thumbnail style
  const optionStyle = {
    background: '#f4f6f8',
    borderRadius: 24,
    marginBottom: 20,
    width: 200,
    height: 200,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    position: 'relative' as const,
    overflow: 'hidden' as const,
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
    // Filter out null photos but allow saving even with just one photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    updateVostcard({ photos: validPhotos });
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
        padding: '45px 20px 0 20px',
        boxSizing: 'border-box',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}>
        {[0, 1].map(idx => (
          <button
            key={idx}
            style={optionStyle}
            onClick={() => handleAddPhoto(idx)}
            type="button"
          >
            {selectedPhotos[idx] ? (
              <img
                src={URL.createObjectURL(selectedPhotos[idx]!)}
                alt={idx === 0 ? "Distant" : "Near"}
                style={{
                  width: 200,
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 24,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
            ) : (
              <FaRegImages size={48} color="#002B4D" style={{ marginBottom: 16 }} />
            )}
            <div style={{ 
              fontSize: 20, 
              color: selectedPhotos[idx] ? 'white' : '#002B4D', 
              fontWeight: 600, 
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              textShadow: selectedPhotos[idx] ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none'
            }}>
              {idx === 0 ? "Distant" : "Near"}<br />(Suggested)
            </div>
          </button>
        ))}
        <button
          style={{ ...buttonStyle, marginTop: 15 }}
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
