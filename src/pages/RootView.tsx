import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import VostcardPin from '../assets/Vostcard_pin.png';
import 'leaflet/dist/leaflet.css';

const RootView: React.FC = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to a default location (Dublin, Ireland)
          setUserLocation([53.3498, -6.2603]);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // Fallback location if geolocation is not supported
      setUserLocation([53.3498, -6.2603]);
    }
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative', 
      overflow: 'hidden',
      backgroundColor: '#f5f5f5' // Ensure background color
    }}>
      {/* CSS Animation Styles */}
      <style>
        {`
          @keyframes bobbing {
            0%, 100% {
              transform: translate(-50%, -100%) translateY(0px);
            }
            50% {
              transform: translate(-50%, -100%) translateY(-15px);
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

      {/* Map Background */}
      <div style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
      }}>
        {userLocation ? (
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

      {/* Bobbing Vostcard Pin in Center */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 10
      }}>
        <img 
          src={VostcardPin}
          alt="Vostcard Pin"
          className="bobbing-pin"
          style={{
            width: '80px',
            height: '80px',
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
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
        zIndex: 1000,
        padding: '0 20px',
        boxSizing: 'border-box',
        marginTop: '30px' // Just under the pin
      }}>
        <button
          onClick={() => navigate('/user-guide')} // Changed from '/login' to '/user-guide'
          style={{
            background: '#E62A2E', // Updated to match the pin's red color
            color: 'white',
            border: 'none',
            borderRadius: '50px !important',
            fontSize: '24px',
            fontWeight: 600,
            padding: '16px 0',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(230, 42, 46, 0.3)', // Updated shadow to match new color
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          User Guide
        </button>
      </div>

      {/* Log In Button at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: 92, // Changed from 82 to 92 (adding 10px more)
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '0 20px',
        boxSizing: 'border-box'
      }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: '#07345c',
            color: 'white',
            border: 'none',
            borderRadius: '50px !important',
            fontSize: '24px',
            fontWeight: 600,
            padding: '16px 0',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Log In
        </button>
      </div>
    </div>
  );
};

export default RootView;