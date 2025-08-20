import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserCircle } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import pin images
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import QuickcardPin from '../assets/quickcard_pin.png';
import GuidePin from '../assets/Guide_pin.png';

// Create icons
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

const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

const guideIcon = new L.Icon({
  iconUrl: GuidePin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

// Map bounds updater component
const MapBoundsUpdater = ({ tripPosts }: { tripPosts: any[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (tripPosts.length > 0) {
      const bounds = L.latLngBounds(
        tripPosts.map(post => [post.latitude, post.longitude])
      );
      
      // Add padding and fit bounds
      map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 15 
      });
    }
  }, [map, tripPosts]);

  return null;
};

interface TripPost {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  photoURLs?: string[];
  videoURL?: string;
  username?: string;
  userRole?: string;
  isOffer?: boolean;
  isQuickcard?: boolean;
  offerDetails?: any;
  categories?: string[];
  createdAt?: string;
  type: 'vostcard' | 'quickcard';
  order: number;
}

interface Trip {
  id: string;
  name: string;
  description?: string;
  username: string;
}

const PublicTripMapView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { trip, tripPosts } = location.state || {};

  // Handle case where no trip data is provided
  if (!trip || !tripPosts || tripPosts.length === 0) {
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
        <h2>No Trip Map Data Found</h2>
        <p>Unable to load the trip map view. No posts with location data were found.</p>
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
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Function to get the correct icon based on post type
  const getIcon = (post: TripPost) => {
    if (post.isQuickcard) {
      return quickcardIcon;
    } else if (post.isOffer) {
      return offerIcon;
    } else if (post.userRole === 'guide') {
      return guideIcon;
    } else {
      return vostcardIcon;
    }
  };

  // Handle pin click to navigate to post details
  const handlePinClick = (post: TripPost) => {
    if (post.isQuickcard) {
      navigate(`/share-quickcard/${post.id}`);
    } else {
      navigate(`/share/${post.id}`);
    }
  };

  // Calculate center point (average of all coordinates)
  const centerLat = tripPosts.reduce((sum: number, post: TripPost) => sum + post.latitude, 0) / tripPosts.length;
  const centerLng = tripPosts.reduce((sum: number, post: TripPost) => sum + post.longitude, 0) / tripPosts.length;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FaArrowLeft size={20} color="#333" />
        </button>

        {/* Trip Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#333'
          }}>
            {trip.name}
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px'
          }}>
            <FaUserCircle size={16} color="#666" />
            <span style={{ fontSize: '14px', color: '#666' }}>
              by {trip.username}
            </span>
            <span style={{ fontSize: '14px', color: '#666' }}>
              • {tripPosts.length} location{tripPosts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={13}
          style={{
            height: '100%',
            width: '100%',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={22}
          />

          <MapBoundsUpdater tripPosts={tripPosts} />

          {/* Trip Post Markers */}
          {tripPosts.map((post: TripPost, index: number) => (
            <Marker
              key={post.id}
              position={[post.latitude, post.longitude]}
              icon={getIcon(post)}
              eventHandlers={{
                click: () => handlePinClick(post)
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '200px', maxWidth: '300px' }}>
                  {/* Post order indicator */}
                  <div style={{
                    backgroundColor: '#007aff',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'inline-block',
                    marginBottom: '8px'
                  }}>
                    Stop #{post.order + 1}
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                    {post.title || 'Untitled Vōstcard'}
                  </h3>

                  {post.description && (
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                      {post.description.length > 100 
                        ? `${post.description.substring(0, 100)}...` 
                        : post.description
                      }
                    </p>
                  )}
                  
                  {/* Type indicator */}
                  <div style={{
                    backgroundColor: post.isQuickcard ? '#e8f4ff' : post.isOffer ? '#fff3cd' : '#f8f9fa',
                    border: `1px solid ${post.isQuickcard ? '#b3d9ff' : post.isOffer ? '#ffeaa7' : '#e9ecef'}`,
                    borderRadius: '6px',
                    padding: '6px 8px',
                    marginBottom: '12px',
                    fontSize: '12px'
                  }}>
                    <strong style={{ 
                      color: post.isQuickcard ? '#0066cc' : post.isOffer ? '#856404' : '#495057' 
                    }}>
                      {post.isQuickcard ? '📱 Quickcard' : post.isOffer ? '🎯 Offer' : '📍 Vostcard'}
                    </strong>
                  </div>

                  {/* Offer details */}
                  {post.isOffer && post.offerDetails?.discount && (
                    <div style={{
                      backgroundColor: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '6px',
                      padding: '8px',
                      marginBottom: '8px'
                    }}>
                      <strong style={{ color: '#155724' }}>
                        🎉 {post.offerDetails.discount}% OFF
                      </strong>
                      {post.offerDetails.validUntil && (
                        <div style={{ fontSize: '11px', color: '#155724', marginTop: '4px' }}>
                          Valid until: {new Date(post.offerDetails.validUntil).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handlePinClick(post)}
                    style={{
                      backgroundColor: '#007aff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007aff'}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Footer info */}
      <div style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e0e0e0',
        padding: '12px 20px',
        textAlign: 'center',
        flexShrink: 0
      }}>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {trip.description && (
            <div style={{ marginBottom: '4px' }}>
              {trip.description}
            </div>
          )}
          <div>Made with Vōstcard</div>
        </div>
      </div>
    </div>
  );
};

export default PublicTripMapView;