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
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  return (
    <div style={{ 
      height: '100%', 
      width: '100%', 
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
          
          .leaflet-container {
            font-family: inherit;
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

      {/* Live Map Background - FIXED z-index */}
      <div style={{
        height: 'calc(100% - 80px)',
        width: '100%',
        position: 'absolute',
        top: '80px',
        left: 0,
        zIndex: 1, // Changed from -1 to 1 to make map visible
      }}>
        {userLocation ? (
            <MapContainer
              center={userLocation}
            zoom={14}
              style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            scrollWheelZoom={true}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
            
            {/* User location marker */}
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong>Your Location</strong>
                  <br />
                  <small>Welcome to Vōstcard!</small>
                </div>
              </Popup>
            </Marker>
            </MapContainer>
        ) : (
          // Loading state with better visual feedback
          <div style={{
            height: '100%',
            width: '100%',
            backgroundColor: '#e8f4f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#666',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>📍 Loading your location...</div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Map will appear once location is found
            </div>
          </div>
        )}
      </div>

      {/* Semi-transparent overlay - Reduced opacity and allows map interaction */}
      <div style={{
        position: 'absolute',
        top: '80px',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Much more transparent
        zIndex: 10,
        pointerEvents: 'none' // Allow map interactions through overlay
      }} />

      {/* Debug Info */}
      {locationError && (
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '10px',
          background: 'rgba(255,0,0,0.9)',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          zIndex: 2000,
          fontSize: '14px',
          maxWidth: '300px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            📍 Location Issue
          </div>
          <div>{locationError}</div>
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.9 }}>
            Using default location (Dublin)
          </div>
        </div>
      )}

      {/* Bobbing Vostcard Pin in Center */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 2000,
        pointerEvents: 'none' // Don't block map interactions
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
        pointerEvents: 'auto'
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
            zIndex: 2001,
            pointerEvents: 'auto',
            touchAction: 'manipulation'
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