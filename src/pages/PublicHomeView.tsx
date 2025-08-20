import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaPlus, FaMinus, FaLocationArrow, FaArrowLeft, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import QuickcardPin from '../assets/quickcard_pin.png';
import RoundInfoButton from '../assets/RoundInfo_Button.png';

// Custom icons for the map
const vostcardIcon = new L.Icon({
  iconUrl: VostcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

const offerIcon = new L.Icon({
  iconUrl: OfferPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

// Add quickcard icon
const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

// Add guide icon
const guideIcon = new L.Icon({
  iconUrl: '/Guide_pin.png', // ✅ Use working PNG from public directory
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

// Zoom controls component
const ZoomControls = () => {
  const map = useMap();
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <button 
        style={{
          width: '44px',
          height: '44px',
          backgroundColor: 'white',
          border: '2px solid #ccc',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}
        onClick={() => map.zoomIn()}
      >
        <FaPlus />
      </button>
      <button 
        style={{
          width: '44px',
          height: '44px',
          backgroundColor: 'white',
          border: '2px solid #ccc',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}
        onClick={() => map.zoomOut()}
      >
        <FaMinus />
      </button>
    </div>
  );
};

// Center map component
const MapCenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);

  return null;
};

const PublicHomeView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { singleVostcard } = location.state || {};

  // Handle case where no vostcard is provided
  if (!singleVostcard) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <h2>No Vostcard Found</h2>
        <p>Unable to load the shared Vostcard location.</p>
        <button 
          style={{
            padding: '12px 24px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            marginTop: '16px'
          }}
          onClick={() => navigate('/')}
        >
          Go Home
        </button>
      </div>
    );
  }

  const center: [number, number] = [singleVostcard.latitude, singleVostcard.longitude];
  const isOffer = singleVostcard.isOffer;
  const isQuickcard = singleVostcard.isQuickcard; // Add quickcard check

  // Updated pin click handler to use correct URL for quickcards
  const handlePinClick = () => {
    if (isQuickcard) {
      navigate(`/share-quickcard/${singleVostcard.id}`);
    } else {
      navigate(`/share/${singleVostcard.id}`);
    }
  };



  // Function to get the correct icon
  const getIcon = () => {
    if (isOffer) return offerIcon;
    // For quickcards, check user role to determine correct pin
    if (isQuickcard) {
      // If the quickcard is posted by a guide or admin, use Guide_pin
      if (singleVostcard.userRole === 'guide' || singleVostcard.userRole === 'admin') {
        return guideIcon;
      }
      // Otherwise, use regular Vostcard_pin for user quickcards
      return vostcardIcon;
    }
    // For regular vostcards, check if posted by guide
    if (singleVostcard.userRole === 'guide') return guideIcon;
    return vostcardIcon;
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: '#002B4D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1001,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Back Button */}
        <button
          onClick={() => {
            // Try to go back, but if no history, navigate to home
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              // Fallback: navigate to home
              navigate('/');
            }
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        >
          <FaArrowLeft size={16} />
          Back
        </button>
        
        {/* Join Button - Always the same regardless of auth status */}
        <button
          onClick={() => {
            // Always go to LoginView - public map is separate from authenticated experience
            console.log('📱 User accessing LoginView from public map');
            navigate('/login');
          }}
          style={{
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Join (it's free)
        </button>
        
        {/* User Guide Button */}
        <div 
          onClick={() => {
            navigate('/user-guide');
          }}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img 
            src={RoundInfoButton} 
            alt="Round Info Button" 
            style={{
              width: '40px',
              height: '40px',
              marginBottom: '2px'
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center'
          }}>
            User Guide
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <MapContainer
          center={center}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={22}
          />

          {/* Single Vostcard/Quickcard Pin */}
          <Marker
            position={center}
            icon={getIcon()} // Use the correct icon based on type
            eventHandlers={{
              click: handlePinClick
            }}
          >
            <Popup>
              <div style={{ textAlign: 'center', minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                  {singleVostcard.title || 'Untitled Vōstcard'}
                </h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                  {singleVostcard.description || 'No description'}
                </p>
                
                {/* Show quickcard indicator */}
                {isQuickcard && (
                  <div style={{
                    backgroundColor: '#e8f4ff',
                    border: '1px solid #b3d9ff',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '12px'
                  }}>
                    <strong style={{ color: '#0066cc' }}>📱 Quickcard</strong>
                    <br />
                    <span style={{ fontSize: '12px' }}>Quick photo with location</span>
                  </div>
                )}
                
                {/* Existing offer details */}
                {isOffer && singleVostcard.offerDetails?.discount && (
                  <div style={{
                    backgroundColor: '#e8f4ff',
                    border: '1px solid #b3d9ff',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '12px'
                  }}>
                    <strong style={{ color: '#0066cc' }}>🎁 Special Offer:</strong>
                    <br />
                    <span style={{ fontSize: '14px' }}>{singleVostcard.offerDetails.discount}</span>
                    {singleVostcard.offerDetails.validUntil && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Valid until: {singleVostcard.offerDetails.validUntil}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Categories */}
                {singleVostcard.categories && Array.isArray(singleVostcard.categories) && singleVostcard.categories.length > 0 && (
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
                    <strong>Categories:</strong> {singleVostcard.categories.join(', ')}
                  </p>
                )}
                
                <button
                  onClick={handlePinClick}
                  style={{
                    backgroundColor: '#007aff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  View {isQuickcard ? 'Quickcard' : 'Vostcard'}
                </button>
              </div>
            </Popup>
          </Marker>

          <ZoomControls />
          <MapCenter center={center} />
        </MapContainer>
      </div>
    </div>
  );
};

export default PublicHomeView; 