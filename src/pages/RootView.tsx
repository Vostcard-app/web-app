import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Create a custom user location icon
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzQyODVGNCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiLz4KPC9zdmc+',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

const RootView: React.FC = () => {
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState('Starting mobile debug...');
  const [screenInfo, setScreenInfo] = useState('');

  useEffect(() => {
    console.log('📱 Mobile RootView mounted');
    
    // Get screen information
    const screenDebug = `Screen: ${window.innerWidth}x${window.innerHeight}, Device: ${window.screen.width}x${window.screen.height}`;
    setScreenInfo(screenDebug);
    console.log('📱', screenDebug);
    
    setDebugInfo('Mobile app is loading...');
    
    // Test geolocation with mobile-specific settings
    if (navigator.geolocation) {
      console.log('📱 Testing geolocation...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Mobile location found:', position.coords);
          setDebugInfo(`✅ Location working: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.error('❌ Mobile location error:', error);
          let errorMsg = 'Location failed: ';
          switch(error.code) {
            case 1: errorMsg += 'Permission denied'; break;
            case 2: errorMsg += 'Position unavailable'; break;  
            case 3: errorMsg += 'Timeout'; break;
            default: errorMsg += error.message;
          }
          setDebugInfo(errorMsg);
        },
        {
          enableHighAccuracy: false, // Less aggressive for mobile
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setDebugInfo('❌ Geolocation not supported');
    }
  }, []);

  return (
    <div style={{ 
      height: '100svh', // Small viewport height - better for mobile
      minHeight: '100vh', // Fallback for older browsers
      width: '100vw',
      backgroundColor: '#e8f4f8', // Light blue so you can see if anything loads
      display: 'flex',
      flexDirection: 'column',
      color: '#333',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
      position: 'fixed', // Prevents mobile scrolling issues
      top: 0,
      left: 0,
      // Add safe area padding for mobile
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
      
      {/* Mobile Header - Fixed position */}
      <div style={{
        background: '#07345c',
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: 'bold',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        📱 Vōstcard Mobile Debug
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'auto'
      }}>
        
        {/* Status Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '350px',
          marginBottom: '20px'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            color: '#07345c',
            fontSize: '20px'
          }}>
            📱 Mobile Status
          </h2>
          
          <div style={{ 
            marginBottom: '16px', 
            fontSize: '14px',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '6px',
            wordBreak: 'break-all'
          }}>
            {debugInfo}
          </div>

          <div style={{ 
            fontSize: '12px',
            color: '#666',
            marginBottom: '16px',
            wordBreak: 'break-all'
          }}>
            {screenInfo}
          </div>

          <div style={{ 
            fontSize: '12px',
            color: '#666',
            marginBottom: '16px'
          }}>
            User Agent: {navigator.userAgent.substring(0, 50)}...
          </div>
        </div>

        {/* Mobile-Optimized Buttons */}
        <div style={{
          width: '100%',
          maxWidth: '350px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            onClick={() => {
              console.log('📱 Login button tapped');
              navigate('/login');
            }}
            style={{
              background: '#07345c',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              touchAction: 'manipulation', // Improves mobile touch
              width: '100%'
            }}
          >
            🔐 Test Login
          </button>
          
          <button
            onClick={() => {
              console.log('📱 User Guide button tapped');
              navigate('/user-guide');
            }}
            style={{
              background: '#E62A2E',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              touchAction: 'manipulation',
              width: '100%'
            }}
          >
            📖 Test User Guide
          </button>

          <button
            onClick={() => {
              console.log('📱 Reloading...');
              window.location.reload();
            }}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              touchAction: 'manipulation',
              width: '100%'
            }}
          >
            🔄 Reload App
          </button>

          <button
            onClick={() => {
              // Test if it's a map issue by going to a simple page
              console.log('📱 Testing simple navigation');
              navigate('/user-guide');
            }}
            style={{
              background: '#6f42c1',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              touchAction: 'manipulation',
              width: '100%'
            }}
          >
            🧪 Test Simple Page
          </button>
        </div>
      </div>

      {/* Mobile Footer */}
      <div style={{
        padding: '16px',
        textAlign: 'center',
        color: '#666',
        fontSize: '12px',
        background: 'rgba(255,255,255,0.9)'
      }}>
        📱 If you see this, React is working on mobile!<br/>
        Check console for errors (inspect in desktop browser)
      </div>
    </div>
  );
};

export default RootView;