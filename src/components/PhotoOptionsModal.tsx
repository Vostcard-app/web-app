import React from 'react';
import { FaCamera, FaFolder, FaImages, FaTimes } from 'react-icons/fa';

interface PhotoOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onUploadFile: () => void;
  onSelectFromLibrary: () => void;
  title?: string;
}

const PhotoOptionsModal: React.FC<PhotoOptionsModalProps> = ({
  isOpen,
  onClose,
  onTakePhoto,
  onUploadFile,
  onSelectFromLibrary,
  title = "Add Photo"
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
          marginBottom: '24px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '20px',
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FaTimes size={18} color="#666" />
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Take Photo */}
          <button
            onClick={onTakePhoto}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              border: '2px solid transparent',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '16px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
              e.currentTarget.style.borderColor = '#007aff';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0px)';
            }}
          >
            <div style={{
              backgroundColor: '#007aff',
              padding: '12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaCamera size={20} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#333', fontWeight: '600' }}>Take Photo</div>
              <div style={{ color: '#666', fontSize: '14px', marginTop: '2px' }}>
                Use your camera to take a new photo
              </div>
            </div>
          </button>

          {/* Upload File */}
          <button
            onClick={onUploadFile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              border: '2px solid transparent',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '16px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
              e.currentTarget.style.borderColor = '#28a745';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0px)';
            }}
          >
            <div style={{
              backgroundColor: '#28a745',
              padding: '12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaFolder size={20} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#333', fontWeight: '600' }}>Upload File</div>
              <div style={{ color: '#666', fontSize: '14px', marginTop: '2px' }}>
                Choose a photo from your device
              </div>
            </div>
          </button>

          {/* Select from Library */}
          <button
            onClick={onSelectFromLibrary}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              border: '2px solid transparent',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '16px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
              e.currentTarget.style.borderColor = '#fd7e14';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0px)';
            }}
          >
            <div style={{
              backgroundColor: '#fd7e14',
              padding: '12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaImages size={20} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#333', fontWeight: '600' }}>Photo Library</div>
              <div style={{ color: '#666', fontSize: '14px', marginTop: '2px' }}>
                Select from your existing photos
              </div>
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '20px',
            backgroundColor: 'transparent',
            border: '2px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            color: '#666',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#999';
            e.currentTarget.style.color = '#333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.color = '#666';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PhotoOptionsModal;