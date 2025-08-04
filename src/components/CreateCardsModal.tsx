import React from 'react';
import { FaTimes, FaCamera } from 'react-icons/fa';

interface CreateCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateCardsModal: React.FC<CreateCardsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000
        }}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div style={{
        position: 'fixed',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 10001
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
            fontSize: '20px', 
            fontWeight: 'bold',
            color: '#002B4D'
          }}>
            Create Vostcards & Quickcards
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '16px'
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ marginBottom: '30px' }}>
            <FaCamera size={48} color="#002B4D" style={{ marginBottom: '20px' }} />
            <p style={{ 
              fontSize: '16px', 
              lineHeight: '1.5', 
              color: '#555',
              marginBottom: '20px'
            }}>
              Capture and share your experiences instantly. Create detailed Vostcards or quick photo-based Quickcards.
            </p>
          </div>

          {/* Features List */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <h4 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: '#002B4D',
              textAlign: 'center'
            }}>
              What you can create:
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              listStyle: 'disc'
            }}>
              <li style={{ 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '8px',
                lineHeight: '1.4'
              }}>
                Full Vostcards with photos, videos & stories
              </li>
              <li style={{ 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '8px',
                lineHeight: '1.4'
              }}>
                Quick photo-based Quickcards
              </li>
              <li style={{ 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '0',
                lineHeight: '1.4'
              }}>
                Automatically tagged with your location
              </li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001a33'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
          >
            Got it!
          </button>
        </div>
      </div>
    </>
  );
};

export default CreateCardsModal;