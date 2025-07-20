// Vostcard Studio - Professional content creation and management interface
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaRocket } from 'react-icons/fa';
import { useStudioAccess, useStudioAccessSummary } from '../hooks/useStudioAccess';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/shared';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, upgradeMessage } = useStudioAccess();
  const studioSummary = useStudioAccessSummary();
  const [isLoading, setIsLoading] = useState(true);

  // Check access and load
  useEffect(() => {
    if (!hasAccess) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(false);
  }, [hasAccess]);

  // Access denied screen
  if (!hasAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <FaRocket size={48} color="#ff6b35" style={{ marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>
            Vostcard Studio Access Required
          </h2>
          <p style={{ color: '#666', marginBottom: '25px', lineHeight: 1.6 }}>
            {upgradeMessage}
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px'
          }}>
            <strong>Your Status:</strong> {studioSummary.roleDisplay}
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading Vostcard Studio..." size="large" />;
  }

  return (
    <div style={{
      backgroundColor: 'white', 
      height: '100vh', 
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

      {/* Completely Blank Content Area */}
      <div style={{ 
        flex: 1
      }}>
        {/* Empty - ready for future content */}
      </div>
    </div>
  );
};

export default VostcardStudioView; 