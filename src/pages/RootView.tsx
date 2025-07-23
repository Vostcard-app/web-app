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
  const [locationSource, setLocationSource] = useState<'user' | 'fallback'>('fallback');

  // Dublin coordinates as fallback
  const DUBLIN_COORDS: [number, number] = [53.3498, -6.2603];

  // Enhanced geolocation for newer iPhones
  useEffect(() => {
    let isMounted = true;
    let watchId: number | null = null;

    const getLocation = async () => {
      if (!navigator.geolocation) {
        console.warn('📍 Geolocation not supported by this browser');
        setLocationError('Location services not available');
        setUserLocation(DUBLIN_COORDS);
        setLocationSource('fallback');
        setIsLocationLoading(false);
        return;
      }

      // Start with Dublin fallback
      setUserLocation(DUBLIN_COORDS);
      setLocationSource('fallback');

      // Enhanced options for newer iPhones
      const options = {
        enableHighAccuracy: true, // Try GPS first
        timeout: 15000, // Longer timeout for newer iPhones
        maximumAge: 300000 // 5 minutes cache
      };

      try {
        // First attempt with high accuracy
        console.log('📍 Requesting user location...');
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

        if (isMounted) {
          console.log('📍 User location found:', {
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
            accuracy: `${position.coords.accuracy}m`
          });
          
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationSource('user');
          setLocationError(null);
          setIsLocationLoading(false);

          // Start watching position for updates
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              if (isMounted) {
                setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                setLocationSource('user');
              }
            },
            (error) => {
              console.warn('📍 Watch position error:', error.message);
            },
            {
              enableHighAccuracy: false, // Less battery intensive for watching
              timeout: 10000,
              maximumAge: 600000 // 10 minutes for watch
            }
          );
        }

      } catch (error: any) {
        if (!isMounted) return;

        console.warn('📍 High accuracy failed, trying fallback options:', error.message);
        
        // Fallback attempt with lower accuracy
        try {
          const fallbackOptions = {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 600000
          };

          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, fallbackOptions);
          });

          if (isMounted) {
            console.log('📍 Fallback location found:', {
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6),
              accuracy: `${position.coords.accuracy}m`
            });
            
            setUserLocation([position.coords.latitude, position.coords.longitude]);
            setLocationSource('user');
            setLocationError(null);
          }

        } catch (fallbackError: any) {
          console.warn('📍 All location attempts failed:', fallbackError.message);
          
          if (isMounted) {
            // Provide user-friendly error messages
            let errorMessage = '';
            switch (fallbackError.code) {
              case 1: // PERMISSION_DENIED
                errorMessage = 'Location access denied. Showing Dublin, Ireland.';
                break;
              case 2: // POSITION_UNAVAILABLE
                errorMessage = 'Location unavailable. Showing Dublin, Ireland.';
                break;
              case 3: // TIMEOUT
                errorMessage = 'Location request timed out. Showing Dublin, Ireland.';
                break;
              default:
                errorMessage = 'Unable to get location. Showing Dublin, Ireland.';
            }
            
            setLocationError(errorMessage);
            setUserLocation(DUBLIN_COORDS);
            setLocationSource('fallback');
          }
        }

        if (isMounted) {
          setIsLocationLoading(false);
        }
      }
    };

    // Small delay to ensure DOM is ready, especially important for newer iPhones
    const timer = setTimeout(getLocation, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
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
      
      {/* CSS */}
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
      `}</style>

      {/* Header */}
      <div style={{
        background: '#07345c',
        color: 'white',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 700,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        Vōstcard
      </div>

      {/* Map Container - Leave space for bottom button */}
      <div style={{
        position: 'absolute',
        top: '64px', // Account for fixed header
        left: 0,
        right: 0,
        bottom: '90px', // Space for single bottom button
        zIndex: 1
      }}>
        {userLocation ? (
          <MapContainer
            center={userLocation}
            zoom={locationSource === 'user' ? 15 : 13} // Closer zoom for user location
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
              maxZoom={18}
            />
            
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong>
                    {locationSource === 'user' ? 'Your Location' : 'Dublin, Ireland'}
                  </strong>
                  <br />
                  <small>
                    {locationSource === 'user' 
                      ? 'Welcome to Vōstcard!' 
                      : 'Default location - Enable location for your area'
                    }
                  </small>
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
        top: '40%',
        left: '50%',
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        <img 
          src="/Vostcard_pin.png"
          alt="Vostcard Pin"
          className="bobbing-pin"
          style={{
            width: '120px',
            height: '120px',
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
          }}
          onError={(e) => {
            console.warn('Vostcard_pin.png failed to load');
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* User Guide Button - Centered in map area */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        marginTop: '50px', // Raised by 30px (was 80px, now 50px)
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

      {/* Single Log In / Register Button - Same width as User Guide */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3000,
        width: 'calc(100% - 32px)', // Same width calculation as User Guide
        maxWidth: '400px', // Same max width as User Guide
        pointerEvents: 'auto'
      }}>
        <button
          onClick={() => {
            console.log('🔐 Log In / Register button clicked');
            navigate('/login');
          }}
          style={{
            background: '#07345c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '20px', // Same font size as User Guide
            fontWeight: 600,
            padding: '16px',
            width: '100%', // Full width of container
            boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
            cursor: 'pointer',
            touchAction: 'manipulation',
            minHeight: '54px'
          }}
        >
          Log In / Register
        </button>
      </div>

      {/* Enhanced Status Info */}
      {(locationError || isLocationLoading) && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '10px',
          right: '10px',
          background: isLocationLoading ? 'rgba(0,122,255,0.9)' : 'rgba(255,165,0,0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 200,
          textAlign: 'center'
        }}>
          {isLocationLoading ? (
            '📍 Finding your location...'
          ) : (
            locationSource === 'fallback' ? 
            '📍 Using Dublin, Ireland - Enable location for your area' : 
            locationError
          )}
        </div>
      )}
    </div>
  );
};

export default RootView;