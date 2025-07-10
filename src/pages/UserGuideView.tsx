import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaSmile, FaArrowLeft } from 'react-icons/fa';

const UserGuideView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Vostcard Banner with Back Icon */}
      <div style={{
        background: '#07345c',
        color: 'white',
        width: '100%',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 1000,
        position: 'relative',
      }}>
        <FaArrowLeft 
          size={24} 
          color="white" 
          style={{ cursor: 'pointer', marginRight: '20px' }}
          onClick={() => navigate(-1)} // Go back to previous page
        />
        <span style={{
          fontSize: '2.2rem',
          fontWeight: 700,
          letterSpacing: '0.01em',
        }}>
          Vōstcard
        </span>
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '60px',
          textAlign: 'center',
          margin: '0 0 60px 0'
        }}>
          User Guide
        </h1>

        {/* Vostcard Pin Section */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '80px',
          width: '100%',
          maxWidth: '600px'
        }}>
          {/* Red Pin */}
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#E62A2E',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '30px',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(230, 42, 46, 0.3)'
          }}>
            <FaEnvelope 
              size={24} 
              color="white" 
              style={{ transform: 'rotate(45deg)' }}
            />
          </div>

          {/* Vostcard Description */}
          <div style={{
            flex: 1,
            paddingTop: '10px'
          }}>
            <p style={{
              fontSize: '24px',
              color: '#333',
              lineHeight: '1.4',
              margin: 0,
              fontWeight: '400'
            }}>
              Tap these pins to see a Vōstcard. Vōstcards are 30 second videos about points of interest. You can watch them, send them, or make your own.
            </p>
          </div>
        </div>

        {/* Offer Pin Section */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '80px',
          width: '100%',
          maxWidth: '600px'
        }}>
          {/* Green Pin */}
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#4CAF50',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '30px',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
          }}>
            <FaSmile 
              size={24} 
              color="white" 
              style={{ transform: 'rotate(45deg)' }}
            />
          </div>

          {/* Offer Description */}
          <div style={{
            flex: 1,
            paddingTop: '10px'
          }}>
            <p style={{
              fontSize: '24px',
              color: '#333',
              lineHeight: '1.4',
              margin: 0,
              fontWeight: '400'
            }}>
              Tap these pins to see offers or discounts near you.
            </p>
          </div>
        </div>

        {/* Login Button */}
        <div style={{
          marginTop: 'auto',
          width: '100%',
          maxWidth: '600px',
          paddingBottom: '40px'
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '50px !important',
              fontSize: '32px',
              fontWeight: 600,
              padding: '20px 0',
              width: '100%',
              boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuideView;
