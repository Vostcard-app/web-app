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

      // Set default location immediately
      setUserLocation([40.7128, -74.0060]);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Mobile location success');
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
          setIsLocationLoading(false);
        },
        (error) => {
          console.warn('📍 Mobile location error:', error.message);
          setLocationError(`Location: ${error.message}`);
          setIsLocationLoading(false);
          // Keep default NYC location
        },
        {
          enableHighAccuracy: false, // Less battery drain
          timeout: 8000, // Shorter timeout
          maximumAge: 300000 // 5 minutes cache
        }
      );
    };

    // Small delay to ensure everything is mounted
    setTimeout(getLocation, 100);
  }, []);

  return (
    <div style={{ 
      height: '100svh', // Mobile-friendly viewport
      minHeight: '100vh', // Fallback
      width: '100vw',
      position: 'fixed', // Prevents mobile scrolling issues
      top: 0,
      left: 0,
      overflow: 'hidden',
      backgroundColor: '#f5f5f5',
      // Mobile safe areas
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
        
        /* Mobile leaflet fixes */
        .leaflet-container {
          font-family: inherit;
          height: 100% !important;
          width: 100% !important;
        }
        
        .leaflet-control-container {
          pointer-events: auto;
        }
        
        /* Better mobile touch */
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

      {/* Map Container - Mobile optimized */}
      <div style={{
        position: 'absolute',
        top: '64px', // Header height
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
      }}>
        {userLocation ? (
          <MapContainer
            center={userLocation}
            zoom={13} // Slightly zoomed out for mobile
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            scrollWheelZoom={false} // Disable for better mobile scrolling
            attributionControl={false}
            // Mobile-specific options
            tap={true}
            touchExtend={1}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
              maxZoom={18}
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
          /* Loading state */
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
              {isLocationLoading ? '📍 Loading your location...' : '📍 Using default location'}
            </div>
            {locationError && (
              <div style={{ 
                fontSize: '14px', 
                color: '#999',
                marginBottom: '16px'
              }}>
                {locationError}
              </div>
            )}
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Map will appear once loaded
            </div>
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
            width: '60px', // Smaller for mobile
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
        bottom: '140px', // Space for buttons
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        zIndex: 10,
        pointerEvents: 'none'
      }} />

      {/* Mobile-optimized buttons */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <button
          onClick={() => navigate('/user-guide')}
          style={{
            background: '#E62A2E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 600,
            padding: '16px',
            boxShadow: '0 4px 12px rgba(230, 42, 46, 0.3)',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          User Guide
        </button>
        
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
            boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          Log In
        </button>
      </div>

      {/* Debug info for mobile (remove in production) */}
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
          {locationError}
        </div>
      )}
    </div>
  );
};

export default RootView;