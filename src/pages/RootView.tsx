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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  // Mobile-optimized geolocation
  useEffect(() => {
    const getLocation = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation not supported');
        setUserLocation([40.7128, -74.0060]); // Default to NYC
        setIsLocationLoading(false);
        return;
      }

      // Set default location immediately so map shows right away
      setUserLocation([40.7128, -74.0060]);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Location found:', position.coords);
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
          setIsLocationLoading(false);
        },
        (error) => {
          console.warn('📍 Location error:', error.message);
          setLocationError(`Location: ${error.message}`);
          setIsLocationLoading(false);
          // Keep default NYC location
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000
        }
      );
    };

    setTimeout(getLocation, 100);
  }, []);

  return (
    <div style={{ 
      height: '100svh',
      minHeight: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden',
      backgroundColor: '#f5f5f5',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      
      {/* CSS for mobile optimization */}
      <style>{`
        @keyframes bobbing {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-15px); }
        }
        
        .bobbing-pin {
          animation: bobbing 2s ease-in-out infinite;
        }
        
        .leaflet-container {
          font-family: inherit;
          height: 100% !important;
          width: 100% !important;
        }
        
        .leaflet-control-zoom {
          margin-top: 10px !important;
          margin-right: 10px !important;
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#07345c',
        color: 'white',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 700,
        position: 'relative',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        Vōstcard
      </div>

      {/* Map Container */}
      <div style={{
        position: 'absolute',
        top: '64px',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
      }}>
        {userLocation ? (
          <MapContainer
            center={userLocation}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            scrollWheelZoom={false}
            attributionControl={false}
            tap={true}
            touchExtend={1}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
              maxZoom={18}
            />
            
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
          <div style={{
            height: '100%',
            backgroundColor: '#e8f4f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            fontSize: '16px',
            color: '#666',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px' }}>
              {isLocationLoading ? '📍 Loading your location...' : '📍 Map ready'}
            </div>
            {locationError && (
              <div style={{ fontSize: '14px', color: '#999', marginBottom: '16px' }}>
                {locationError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Centered Vostcard Pin */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        <img 
          src="/Vostcard_pin.png"
          alt="Vostcard Pin"
          className="bobbing-pin"
          style={{
            width: '60px',
            height: '60px',
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
          }}
          onError={(e) => {
            console.warn('Vostcard_pin.png failed to load');
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Semi-transparent overlay */}
      <div style={{
        position: 'absolute',
        top: '64px',
        left: 0,
        right: 0,
        bottom: '180px', // More space for 3 buttons
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        zIndex: 10,
        pointerEvents: 'none'
      }} />

      {/* User Guide Button - Centered in map area */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        marginTop: '120px', // Below the pin
        zIndex: 2000,
        width: 'calc(100% - 32px)',
        maxWidth: '400px'
      }}>
        <button
          onClick={() => navigate('/user-guide')}
          style={{
            background: '#E62A2E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '20px',
            fontWeight: 600,
            padding: '16px',
            width: '100%',
            boxShadow: '0 4px 12px rgba(230, 42, 46, 0.3)',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          User Guide
        </button>
      </div>

      {/* Login & Register Buttons - Bottom */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        gap: '12px'
      }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: '#07345c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 600,
            padding: '16px',
            flex: 1,
            boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          Log In
        </button>
        
        <button
          onClick={() => navigate('/register')}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 600,
            padding: '16px',
            flex: 1,
            boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          Register
        </button>
      </div>

      {/* Debug info (shows if location permission denied) */}
      {locationError && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '10px',
          right: '10px',
          background: 'rgba(255,165,0,0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 200
        }}>
          📍 {isLocationLoading ? 'Getting your location...' : 'Using default location (NYC)'}
        </div>
      )}
    </div>
  );
};

export default RootView;