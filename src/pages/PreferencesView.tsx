import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const PreferencesView: React.FC = () => {
  const navigate = useNavigate();
  const { user, username } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #07345c 0%, #0a4a73 100%)',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <FaArrowLeft size={16} />
          </button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            🔧 Preferences
          </h1>
        </div>
        
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <FaHome size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
          <h2 style={{ margin: '0 0 16px 0', color: '#333' }}>Preferences</h2>
          <p style={{ 
            margin: '0 0 24px 0', 
            color: '#666', 
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Welcome to your preferences, {username || 'User'}! 
            <br />
            This section will be wired up with your personalization settings soon.
          </p>
          
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '2px dashed #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            margin: '20px 0'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#6c757d',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              🚧 Coming Soon: User preferences and customization options will be added here
            </p>
          </div>

          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a4a73'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#07345c'}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesView;
