import React from 'react';
import { FaTimes, FaFilter } from 'react-icons/fa';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FiltersModal: React.FC<FiltersModalProps> = ({ isOpen, onClose }) => {
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
            Filters
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
            <FaFilter size={48} color="#002B4D" style={{ marginBottom: '20px' }} />
            <p style={{ 
              fontSize: '16px', 
              lineHeight: '1.5', 
              color: '#555',
              marginBottom: '20px'
            }}>
              Use filters to discover exactly what you're looking for. Filter by content type, user role, or categories to find the perfect experience.
            </p>
          </div>

          {/* Toggle Switch Demo */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '72px',
              height: '40px',
              borderRadius: '20px',
              background: '#002B4D',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                left: '4px',
                transition: 'left 0.2s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }} />
            </div>
            <span style={{ fontSize: '20px', color: '#333', fontWeight: 500, textAlign: 'center' }}>📚 See all</span>
          </div>
          
          <p style={{ 
            fontSize: '14px', 
            color: '#666',
            fontStyle: 'italic'
          }}>
            See pins from professionals or everyone.
          </p>
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

export default FiltersModal;