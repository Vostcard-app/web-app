import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';

const CreateCardsHelpView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '30px',
        maxWidth: '400px',
        margin: '0 auto 30px auto'
      }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#002B4D',
            fontSize: '20px',
            marginRight: '16px'
          }}
        >
          <FaArrowLeft />
        </button>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#002B4D'
        }}>
          Create Cards
        </h1>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
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

        {/* Back Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/home')}
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
    </div>
  );
};

export default CreateCardsHelpView;