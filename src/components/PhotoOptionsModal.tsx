import React from 'react';
import { FaCamera, FaImages, FaTimes } from 'react-icons/fa';

interface PhotoOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onSelectFromGallery: () => void;
  currentPhotoCount: number;
  maxPhotos: number;
}

const PhotoOptionsModal: React.FC<PhotoOptionsModalProps> = ({
  isOpen,
  onClose,
  onTakePhoto,
  onSelectFromGallery,
  currentPhotoCount,
  maxPhotos
}) => {
  if (!isOpen) return null;

  const canAddMore = currentPhotoCount < maxPhotos;
  const remainingPhotos = maxPhotos - currentPhotoCount;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '320px',
          width: '100%',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666',
            padding: '4px'
          }}
        >
          <FaTimes />
        </button>

        {/* Title */}
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center'
        }}>
          Add Photos
        </h3>

        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center'
        }}>
          {canAddMore 
            ? `You can add ${remainingPhotos} more photo${remainingPhotos !== 1 ? 's' : ''}`
            : `Maximum ${maxPhotos} photos reached`
          }
        </p>

        {canAddMore ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Take Photo Option */}
            <button
              onClick={() => {
                onTakePhoto();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0056b3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#007aff';
              }}
            >
              <FaCamera size={20} />
              Take Photo with Camera
            </button>

            {/* Select from Gallery Option */}
            <button
              onClick={() => {
                onSelectFromGallery();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e7e34';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#28a745';
              }}
            >
              <FaImages size={20} />
              Select from Gallery
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
};

export default PhotoOptionsModal; 