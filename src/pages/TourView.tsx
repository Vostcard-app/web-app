import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaMap, FaList, FaMapPin, FaHeart, FaCoffee } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TourService } from '../services/tourService';
import type { Tour, TourPost } from '../types/TourTypes';

// Import pin images
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import QuickcardPin from '../assets/quickcard_pin.png';

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

// Blue dot icon for user location
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzQyODVGNCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiLz4KPC9zdmc+',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Map updater component to fit bounds to all markers
const TourMapUpdater = ({ tourPosts, userLocation }: { tourPosts: TourPost[]; userLocation: [number, number] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      const positions = tourPosts
        .filter(post => post.latitude && post.longitude)
        .map(post => [post.latitude!, post.longitude!] as [number, number]);
      
      // Include user location in bounds if available
      if (userLocation) {
        positions.push(userLocation);
      }
      
      if (positions.length > 0) {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [tourPosts, userLocation, map]);

  return null;
};

const TourView: React.FC = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tour, setTour] = useState<Tour | null>(null);
  const [tourPosts, setTourPosts] = useState<TourPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const getTourTerminology = () => {
    // Try to get user role from tour creator
    return tour?.creatorId ? 'Tour' : 'Trip'; // Default to Trip, will be refined when we have user data
  };

  const getPostIcon = (post: TourPost) => {
    if (post.isOffer) return offerIcon;
    if (post.isQuickcard) return quickcardIcon;
    return vostcardIcon;
  };

  // Get user location
  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 TourView: User location updated:', { latitude, longitude });
            setUserLocation([latitude, longitude]);
          },
          (error) => {
            console.warn('📍 TourView: Location error:', error.message);
            // Don't set error state, just log it - location is optional
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    const loadTour = async () => {
      console.log('🔍 TourView: Loading tour with ID:', tourId);
      if (!tourId) {
        console.log('❌ TourView: No tourId provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try to get tour from location state first (if navigated from profile)
        const tourFromState = location.state?.tour as Tour | null;
        console.log('🔍 TourView: Tour from state:', tourFromState);
        
        let tourData: Tour | null;
        if (tourFromState && tourFromState.id === tourId) {
          console.log('✅ TourView: Using tour from state');
          tourData = tourFromState;
        } else {
          console.log('🔍 TourView: Fetching tour from Firebase');
          tourData = await TourService.getTour(tourId);
        }

        console.log('🔍 TourView: Tour data:', tourData);

        if (!tourData) {
          console.log('❌ TourView: Tour not found');
          setError('Tour not found');
          return;
        }

        console.log('✅ TourView: Setting tour data');
        setTour(tourData);

        // Load tour posts
        console.log('🔍 TourView: Loading tour posts');
        const posts = await TourService.getTourPosts(tourData);
        console.log('🔍 TourView: Tour posts:', posts);
        setTourPosts(posts);

      } catch (error) {
        console.error('❌ TourView: Error loading tour:', error);
        setError('Failed to load tour');
      } finally {
        console.log('✅ TourView: Loading complete');
        setLoading(false);
      }
    };

    loadTour();
  }, [tourId, location.state]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading tour...</p>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <p style={{ color: '#d32f2f' }}>{error || 'Tour not found'}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        padding: '32px 24px 24px 24px',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
              {tour.name}
            </h1>
            {tour.description && (
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                {tour.description}
              </p>
            )}
          </div>
        </div>

        {/* Tour/Trip Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '14px' }}>
          <span>{tour.postIds.length} {tour.postIds.length === 1 ? 'post' : 'posts'}</span>
          <span>Created {tour.createdAt.toLocaleDateString()}</span>
          {!tour.isPublic && (
            <span style={{ opacity: 0.8 }}>Private {getTourTerminology()}</span>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ 
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <button
          onClick={() => setViewMode('map')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: viewMode === 'map' ? '#007aff' : '#e0e0e0',
            color: viewMode === 'map' ? 'white' : '#333',
            transition: 'all 0.2s ease',
          }}
        >
          <FaMap size={14} />
          Map View
        </button>
        <button
          onClick={() => setViewMode('list')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: viewMode === 'list' ? '#007aff' : '#e0e0e0',
            color: viewMode === 'list' ? 'white' : '#333',
            transition: 'all 0.2s ease',
          }}
        >
          <FaList size={14} />
          List View
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '0 24px 24px 24px' }}>
        {tourPosts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            No posts in this {getTourTerminology().toLowerCase()}
          </div>
        ) : viewMode === 'map' ? (
          /* Map View */
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            height: '500px',
            position: 'relative'
          }}>
            {tourPosts.length === 0 ? (
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666'
              }}>
                <FaMapPin size={48} style={{ color: '#007aff', marginBottom: '16px' }} />
                <h3>No Posts with Location</h3>
                <p>This {getTourTerminology().toLowerCase()} has no posts with location data.</p>
              </div>
            ) : (
              <MapContainer
                center={[0, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                dragging={true}
                touchZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <TourMapUpdater tourPosts={tourPosts} userLocation={userLocation} />
                
                {/* User Location Marker */}
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={userLocationIcon}
                  >
                    <Popup>
                      <div style={{ textAlign: 'center' }}>
                        <strong>Your Location</strong>
                        <br />
                        <small>Tap to recenter map</small>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {/* Tour Post Markers */}
                {tourPosts
                  .filter(post => post.latitude && post.longitude)
                  .map((post) => {
                    const position: [number, number] = [post.latitude!, post.longitude!];
                    const icon = getPostIcon(post);
                    
                    return (
                      <Marker
                        key={post.id}
                        position={position}
                        icon={icon}
                        eventHandlers={{
                          click: () => {
                            navigate(`/vostcard/${post.id}`);
                          }
                        }}
                      >
                        <Popup>
                          <div style={{ textAlign: 'center', minWidth: '200px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                              {post.title || (post.isQuickcard ? 'Untitled Quickcard' : 'Untitled Vostcard')}
                            </h3>
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                              {post.description || 'No description'}
                            </p>
                            
                            {/* Show post type indicator */}
                            <div style={{
                              backgroundColor: post.isQuickcard ? '#e8f4ff' : post.isOffer ? '#fff3e0' : '#f3e5f5',
                              border: post.isQuickcard ? '1px solid #b3d9ff' : post.isOffer ? '1px solid #ffcc80' : '1px solid #e1bee7',
                              borderRadius: '6px',
                              padding: '8px',
                              marginBottom: '12px'
                            }}>
                              <strong style={{ 
                                color: post.isQuickcard ? '#0066cc' : post.isOffer ? '#f57c00' : '#7b1fa2' 
                              }}>
                                {post.isQuickcard ? '📱 Quickcard' : post.isOffer ? '🎁 Offer' : '📹 Vostcard'}
                              </strong>
                              <br />
                              <span style={{ fontSize: '12px' }}>
                                {post.isQuickcard ? 'Quick photo with location' : 
                                 post.isOffer ? 'Special offer available' : 'Video content'}
                              </span>
                            </div>
                            
                            {post.username && (
                              <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                                by {post.username}
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
              </MapContainer>
            )}
          </div>
        ) : (
          /* List View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tourPosts.map((post) => (
              <div
                key={post.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #e0e0e0',
                }}
                onClick={() => navigate(`/vostcard/${post.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#007aff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* Post Image */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#f0f0f0',
                  }}>
                    {post.photoURLs && post.photoURLs.length > 0 ? (
                      <img
                        src={post.photoURLs[0]}
                        alt={post.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: '24px',
                      }}>
                        📷
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                        {post.title || 'Untitled'}
                      </h3>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        padding: '2px 8px',
                        backgroundColor: post.isQuickcard ? '#e3f2fd' : '#f3e5f5',
                        borderRadius: '12px',
                      }}>
                        {post.isQuickcard ? '📸 Quickcard' : '📹 Vostcard'}
                      </span>
                    </div>
                    
                    {post.description && (
                      <p style={{ 
                        margin: '0 0 8px 0', 
                        color: '#666', 
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {post.description.length > 120 
                          ? `${post.description.substring(0, 120)}...` 
                          : post.description}
                      </p>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px',
                      fontSize: '12px',
                      color: '#999'
                    }}>
                      {post.username && (
                        <span>by {post.username}</span>
                      )}
                      {post.createdAt && (
                        <span>{post.createdAt.toLocaleDateString()}</span>
                      )}
                      {post.latitude && post.longitude && (
                        <span>📍 Has location</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TourView; 