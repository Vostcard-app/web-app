import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RootView: React.FC = () => {
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState('Loading...');

  useEffect(() => {
    console.log('🔍 RootView mounted');
    setDebugInfo('RootView is working!');
    
    // Test geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Location found:', position.coords);
          setDebugInfo(`Location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.error('❌ Location error:', error);
          setDebugInfo(`Location error: ${error.message}`);
        }
      );
    }
  }, []);

  return (
    <div style={{ 
      height: '100vh',
      width: '100vw',
      backgroundColor: '#f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#333',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header Test */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: '#07345c',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        🔍 Vōstcard - Debug Mode
      </div>

      {/* Center Content */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '400px'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#07345c' }}>
          RootView Status
        </h2>
        
        <div style={{ marginBottom: '16px', fontSize: '16px' }}>
          {debugInfo}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <button
            onClick={() => {
              console.log('🔍 Login button clicked');
              navigate('/login');
            }}
            style={{
              background: '#07345c',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Test Login Navigation
          </button>
          
          <button
            onClick={() => {
              console.log('🔍 User Guide button clicked');
              navigate('/user-guide');
            }}
            style={{
              background: '#E62A2E',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Test User Guide Navigation
          </button>

          <button
            onClick={() => {
              console.log('🔍 Reloading page...');
              window.location.reload();
            }}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        If you see this, the React app is working! 
        Check the browser console for any errors.
      </div>
    </div>
  );
};

export default RootView;