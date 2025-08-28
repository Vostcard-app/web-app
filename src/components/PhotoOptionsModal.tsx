import React from 'react';
import { FaCamera, FaFolder, FaImages, FaTimes } from 'react-icons/fa';

interface PhotoOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onUploadFile: () => void;
  onSelectFromLibrary: () => void;
  title?: string;
  isMobile?: boolean;
}

const PhotoOptionsModal: React.FC<PhotoOptionsModalProps> = ({
  isOpen,
  onClose,
  onTakePhoto,
  onUploadFile,
  onSelectFromLibrary,
  title = "Add Photo",
  isMobile = false
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '320px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#333'
          }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaTimes size={18} color="#666" />
          </button>
        </div>

        {/* Mac Desktop Tip */}
        {!isMobile && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#666',
            textAlign: 'center'
          }}>
            💡 Tip: You can also drag photos directly from Finder into the studio
          </div>
        )}

        {/* Options - Link Style */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Take Photo */}
          <div
            onClick={onTakePhoto}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 0',
              cursor: 'pointer',
              borderBottom: '1px solid #e0e0e0',
              fontSize: '16px',
              color: '#007aff'
            }}
          >
            <FaCamera size={16} color="#007aff" />
            <span>Take Photo</span>
          </div>

          {/* Upload File */}
          <div
            onClick={onUploadFile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 0',
              cursor: 'pointer',
              borderBottom: '1px solid #e0e0e0',
              fontSize: '16px',
              color: '#007aff'
            }}
          >
            <FaFolder size={16} color="#007aff" />
            <span>{isMobile ? 'Upload File' : 'Browse Files'}</span>
          </div>

          {/* Select from Library */}
          <div
            onClick={onSelectFromLibrary}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 0',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#007aff'
            }}
          >
            <FaImages size={16} color="#007aff" />
            <span>{isMobile ? 'Photo Library' : 'Browse Photos'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoOptionsModal;