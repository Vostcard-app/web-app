// Vostcard Studio - Professional content creation and management interface
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  console.log('🎬 VostcardStudioView rendering, userRole:', userRole);

  return (
    <div style={{
      backgroundColor: 'white', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      
      {/* Standard Vostcard Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          Vōstcard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={24} />
          </button>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate('/home')}
          >
            <FaHome color="#fff" size={24} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Vostcard Studio
        </h1>
        
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '20px' }}>
          Welcome to Vostcard Studio! Your role: {userRole}
        </p>

        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h3>🚧 Under Development</h3>
          <p>The full studio interface is being developed. Check back soon!</p>
          
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => navigate('/quickcards')}
              style={{
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Browse Quickcards
            </button>
            
            {(userRole === 'guide' || userRole === 'admin') && (
              <button
                onClick={() => navigate('/drivecards')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Drivecard Library
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VostcardStudioView; 