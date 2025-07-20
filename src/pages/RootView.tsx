import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RootView: React.FC = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<[number, number] | null>([53.3498, -6.2603]); // Default location
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError(error.message);
          // Keep default location
        },
        { enableHighAccuracy: true, timeout: 5000 } // Reduced timeout
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative', 
      overflow: 'hidden',
      backgroundColor: '#f5f5f5'
    }}>
      {/* CSS Animation Styles */}
      <style>
        {`
          @keyframes bobbing {
            0%, 100% {
              transform: translate(-50%, -50%) translateY(0px);
            }
            50% {
              transform: translate(-50%, -50%) translateY(-15px);
            }
          }
          
          .bobbing-pin {
            animation: bobbing 2s ease-in-out infinite;
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        background: '#07345c',
        color: 'white',
        width: '100%',
        padding: '20px 0',
        textAlign: 'left',
        fontWeight: 700,
        fontSize: '2.2rem',
        letterSpacing: '0.01em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 1000,
        position: 'relative',
      }}>
        <span style={{ marginLeft: 24 }}>Vōstcard</span>
      </div>

      {/* Map Background - Wrapped in error boundary */}
      <div style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1,
      }}>
        {userLocation ? (
          <div style={{ height: '100%', width: '100%' }}>
            <MapContainer
              center={userLocation}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              dragging={false}
              touchZoom={false}
              doubleClickZoom={false}
              scrollWheelZoom={false}
              boxZoom={false}
              keyboard={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
            </MapContainer>
          </div>
        ) : (
          // Fallback pattern while loading location
          <div style={{
            height: '100%',
            width: '100%',
            backgroundColor: '#e8f4f8',
            backgroundImage: `
              linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%), 
              linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%), 
              linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
          />
        )}
      </div>

      {/* Semi-transparent overlay to make content more readable */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 5
      }} />

      {/* Debug Info */}
      {locationError && (
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '10px',
          background: 'rgba(255,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 2000,
          fontSize: '12px'
        }}>
          Location Error: {locationError}
        </div>
      )}

      {/* Bobbing Vostcard Pin in Center */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 2000
      }}>
        <img 
          src="/Vostcard_pin.png"
          alt="Vostcard Pin"
          className="bobbing-pin"
          style={{
            width: '80px',
            height: '80px',
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
          }}
          onError={(e) => {
            console.error('Vostcard_pin.png failed to load');
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* User Guide Button */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '0 20px',
        boxSizing: 'border-box',
        marginTop: '80px',
        pointerEvents: 'auto' // Ensure pointer events work
      }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('User Guide button clicked!');
            navigate('/user-guide');
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('User Guide button touched!');
            navigate('/user-guide');
          }}
          style={{
            background: '#E62A2E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '24px',
            fontWeight: 600,
            padding: '16px 0',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(230, 42, 46, 0.3)',
            cursor: 'pointer',
            letterSpacing: '0.01em',
            position: 'relative',
            zIndex: 2001, // Slightly higher than container
            pointerEvents: 'auto', // Ensure it can receive clicks
            touchAction: 'manipulation' // Better touch handling
          }}
        >
          User Guide
        </button>
      </div>

      {/* Log In Button at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: '92px',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '0 20px',
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          onClick={() => {
            console.log('Log In button clicked!');
            navigate('/login');
          }}
          style={{
            background: '#07345c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '24px',
            fontWeight: 600,
            padding: '16px 0',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
            cursor: 'pointer',
            letterSpacing: '0.01em',
            zIndex: 2000
          }}
        >
          Log In
        </button>
      </div>
    </div>
  );
};

export default RootView;