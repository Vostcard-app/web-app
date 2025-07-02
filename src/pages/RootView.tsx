import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import VostcardPin from '../assets/Vostcard_pin.png';
import './LandingPage.css'; // Reuse or extend for styles

const RootView: React.FC = () => {
  const navigate = useNavigate();

  // Center of Dublin for demo
  const defaultCenter: [number, number] = [53.3498, -6.2603];

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      {/* Top Banner */}
      <div style={{
        background: '#07345c',
        color: 'white',
        width: '100%',
        padding: '28px 0 12px 0',
        textAlign: 'left',
        fontWeight: 700,
        fontSize: '2.2rem',
        letterSpacing: '0.01em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 2,
        position: 'relative',
      }}>
        <span style={{ marginLeft: 24 }}>Vōstcard</span>
      </div>

      {/* Map */}
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>

      {/* Centered Bobbing Pin and User Guide */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 3,
      }}>
        {/* Bobbing animation */}
        <div
          style={{
            animation: 'bobbing 1.5s infinite',
            cursor: 'pointer',
            marginBottom: 12,
          }}
          onClick={() => navigate('/user-guide')}
        >
          <img src={VostcardPin} alt="Vostcard Pin" style={{ width: 90, height: 90, display: 'block' }} />
        </div>
        <button
          onClick={() => navigate('/user-guide')}
          style={{
            background: '#ff3b30',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            fontSize: 28,
            fontWeight: 600,
            padding: '12px 48px',
            marginTop: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
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
        bottom: 32,
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 3,
      }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: '#07345c',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            fontSize: 28,
            fontWeight: 600,
            padding: '16px 0',
            width: '90%',
            maxWidth: 400,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Log In
        </button>
      </div>

      {/* Bobbing animation keyframes */}
      <style>{`
        @keyframes bobbing {
          0% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RootView; 