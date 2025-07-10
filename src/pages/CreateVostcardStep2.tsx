import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages } from 'react-icons/fa';

export default function CreateVostcardStep2() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handler for when a thumbnail is tapped
  const handleAddPhoto = () => {
    const choice = window.prompt('Type 1 to take a photo, 2 to choose from library:', '1 or 2');
    if (choice === '1') {
      cameraInputRef.current?.click();
    } else if (choice === '2') {
      fileInputRef.current?.click();
    }
  };

  // Handle file selection (camera or library)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle the selected file (preview, upload, etc.)
      // For now, just log it
      console.log('Selected file:', file);
    }
  };

  // Updated option style with reduced padding
  const optionStyle = {
    background: '#f4f6f8',
    borderRadius: 24,
    padding: '24px 0', // Reduced from 48px
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
        maxHeight: 'calc(100vh - 120px)', // Adjust for banner and button
        overflowY: 'auto'
      }}>
        <button style={optionStyle} onClick={handleAddPhoto}>
          <FaRegImages size={48} color="#002B4D" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 24, color: '#002B4D', fontWeight: 600, textAlign: 'center' }}>
            Distant<br />(Suggested)
          </div>
        </button>
        <button style={optionStyle} onClick={handleAddPhoto}>
          <FaRegImages size={48} color="#002B4D" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 24, color: '#002B4D', fontWeight: 600, textAlign: 'center' }}>
            Near<br />(Suggested)
          </div>
        </button>
        <button style={buttonStyle}>
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
