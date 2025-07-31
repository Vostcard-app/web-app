import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaLocationArrow, FaMap, FaList, FaStar, FaComment } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TourService } from '../services/tourService';
import { RatingService, type RatingStats } from '../services/ratingService';
import ReviewsModal from '../components/ReviewsModal';
import { useResponsive } from '../hooks/useResponsive';
import type { Tour, TourPost } from '../types/TourTypes';

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

// Standard user location icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtb3BhY2l0eT0iMC4zIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjYiIGZpbGw9IiM0Mjg1RjQiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjIuNSIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4=',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Map updater component
const TourMapUpdater = ({ setMapRef }: { setMapRef: (map: L.Map) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      setMapRef(map);
    }
  }, [map, setMapRef]);

  return null;
};

const TourMapView: React.FC = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useResponsive();
  const shouldUseContainer = isDesktop;

  const [tour, setTour] = useState<Tour | null>(null);
  const [tourPosts, setTourPosts] = useState<TourPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  // Get tour data from navigation state or fetch by ID
  useEffect(() => {
    const loadTour = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if tour data was passed via navigation state
        const navigationState = location.state as any;
        const tourData = navigationState?.tourData;

        if (tourData?.tour && tourData?.tourPosts) {
          console.log('🎬 TourMapView: Using tour data from navigation state');
          setTour(tourData.tour);
          setTourPosts(tourData.tourPosts);
          
          // Fetch rating stats for the tour
          try {
            const stats = await RatingService.getTourRatingStats(tourData.tour.id);
            setRatingStats(stats);
          } catch (error) {
            console.error('❌ Error fetching tour rating stats:', error);
          }
        } else if (tourId) {
          console.log('🎬 TourMapView: Fetching tour data for ID:', tourId);
          // Fetch tour and posts from Firebase
          const fetchedTour = await TourService.getTour(tourId);
          if (fetchedTour) {
            setTour(fetchedTour);
            const fetchedPosts = await TourService.getTourPosts(fetchedTour);
            setTourPosts(fetchedPosts);
            
            // Fetch rating stats for the tour
            try {
              const stats = await RatingService.getTourRatingStats(fetchedTour.id);
              setRatingStats(stats);
            } catch (error) {
              console.error('❌ Error fetching tour rating stats:', error);
            }
          } else {
            setError('Tour not found');
          }
        } else {
          setError('No tour ID provided');
        }
      } catch (err) {
        console.error('❌ Error loading tour:', err);
        setError('Failed to load tour');
      } finally {
        setLoading(false);
      }
    };

    loadTour();
  }, [tourId, location.state]);

  // Get user location
  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 TourMapView: User location updated:', { latitude, longitude });
            setUserLocation([latitude, longitude]);
          },
          (error) => {
            console.warn('📍 TourMapView: Location error:', error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      }
    };

    getUserLocation();
  }, []);

  // Auto-fit map bounds when data is loaded
  useEffect(() => {
    if (mapRef && tourPosts.length > 0 && userLocation) {
      console.log('🎬 TourMapView: Auto-fitting map bounds');

      // Get all valid tour post positions
      const tourPositions = tourPosts
        .filter(post => post.latitude && post.longitude)
        .map(post => [post.latitude!, post.longitude!] as [number, number]);

      if (tourPositions.length > 0) {
        // Include user location in bounds calculation
        const allPositions = [...tourPositions, userLocation];

        try {
          const bounds = L.latLngBounds(allPositions);
          console.log('🎬 TourMapView: Fitting map to bounds');
          mapRef.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15
          });
        } catch (error) {
          console.warn('🎬 TourMapView: Error fitting map bounds:', error);
        }
      }
    }
  }, [mapRef, tourPosts, userLocation]);

  const getPostIcon = (post: TourPost) => {
    if (post.isOffer) return offerIcon;
    if (post.isQuickcard) {
      if (post.userRole === 'guide') return guideIcon;
      return quickcardIcon;
    }
    if (post.userRole === 'guide') return guideIcon;
    return vostcardIcon;
  };

  const getTourTerminology = () => {
    // Default to Tour for now - could be enhanced with creator role info
    return 'Tour';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading tour...
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#c62828', marginBottom: '16px' }}>Error</h2>
        <p style={{ color: '#666', textAlign: 'center' }}>{error || 'Tour not found'}</p>
        <button
          onClick={() => navigate('/tours-near-me')}
          style={{
            marginTop: '20px',
            backgroundColor: '#002B4D',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer'
          }}
        >
          Back to Tours
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: shouldUseContainer ? '#f0f0f0' : 'white',
      display: shouldUseContainer ? 'flex' : 'block',
      justifyContent: shouldUseContainer ? 'center' : 'initial',
      alignItems: shouldUseContainer ? 'flex-start' : 'initial',
      padding: shouldUseContainer ? '20px' : '0'
    }}>
      <div style={{
        width: shouldUseContainer ? '390px' : '100%',
        maxWidth: shouldUseContainer ? '390px' : '100%',
        height: shouldUseContainer ? '844px' : '100vh',
        backgroundColor: 'white',
        boxShadow: shouldUseContainer ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: shouldUseContainer ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#002B4D',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'relative',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexShrink: 0,
          borderRadius: shouldUseContainer ? '16px 16px 0 0' : '0',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 16px)',
          paddingRight: 'env(safe-area-inset-right, 16px)'
        }}>
          <button
            onClick={() => navigate('/tours-near-me')}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              padding: '8px'
            }}
          >
            <FaArrowLeft size={20} />
          </button>

          <div style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
            flex: 1,
            paddingRight: '44px' // Offset for back button
          }}>
            {tour.name}
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div style={{
          backgroundColor: 'white',
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '8px'
        }}>
          {/* Map View Button */}
          <button
            onClick={() => setViewMode('map')}
            style={{
              flex: 1,
              backgroundColor: viewMode === 'map' ? '#002B4D' : 'white',
              color: viewMode === 'map' ? 'white' : '#002B4D',
              border: '2px solid #002B4D',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FaMap />
            Map View
          </button>

          {/* List View Button */}
          <button
            onClick={() => setViewMode('list')}
            style={{
              flex: 1,
              backgroundColor: viewMode === 'list' ? '#002B4D' : 'white',
              color: viewMode === 'list' ? 'white' : '#002B4D',
              border: '2px solid #002B4D',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FaList />
            List View
          </button>

          {/* Load Tour Button */}
          <button
            onClick={() => {
              // Validate data before navigating
              if (!tour) {
                console.error('❌ Load Tour: Tour data not available');
                alert('Tour data is still loading. Please wait a moment and try again.');
                return;
              }

              if (!tourPosts || tourPosts.length === 0) {
                console.error('❌ Load Tour: No tour posts available');
                alert('This tour has no stops available. Please try a different tour.');
                return;
              }

              console.log('🎬 Starting tour in progress:', tour.name);
              console.log('🎬 Tour data validated:', { 
                tourId: tour.id, 
                tourName: tour.name, 
                postsCount: tourPosts.length 
              });
              
              // Navigate to TourInProgressView with validated tour data
              navigate(`/tour-in-progress/${tour.id}`, { 
                state: { 
                  tourData: {
                    tour,
                    tourPosts
                  }
                } 
              });
            }}
            disabled={loading || !tour || !tourPosts || tourPosts.length === 0}
            style={{
              flex: 1,
              backgroundColor: (loading || !tour || !tourPosts || tourPosts.length === 0) ? '#f5f5f5' : 'white',
              color: (loading || !tour || !tourPosts || tourPosts.length === 0) ? '#999' : '#002B4D',
              border: '2px solid #002B4D',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (loading || !tour || !tourPosts || tourPosts.length === 0) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: (loading || !tour || !tourPosts || tourPosts.length === 0) ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading && tour && tourPosts && tourPosts.length > 0) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && tour && tourPosts && tourPosts.length > 0) {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            {loading ? '⏳ Loading...' : '🎬 Start Tour'}
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: 'white' }}>
          {viewMode === 'map' ? (
            /* Map View */
            <MapContainer
              center={[53.3498, -6.2603]} // Dublin fallback
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
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={22}
              />

              <TourMapUpdater setMapRef={setMapRef} />

              {/* User Location Marker */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={userIcon}
                >
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <strong>Your Location</strong>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Tour Post Markers */}
              {tourPosts
                .filter(post => post.latitude && post.longitude)
                .map((post, index) => {
                  const position: [number, number] = [post.latitude!, post.longitude!];
                  const icon = getPostIcon(post);

                  return (
                    <Marker
                      key={post.id}
                      position={position}
                      icon={icon}
                    >
                      <Popup>
                        <div style={{
                          maxWidth: '200px',
                          fontSize: '14px',
                          lineHeight: '1.4'
                        }}>
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            Stop {index + 1}: {post.title}
                          </h4>
                          {post.description && (
                            <p style={{
                              margin: '0 0 8px 0',
                              color: '#666'
                            }}>
                              {post.description}
                            </p>
                          )}
                          <div style={{
                            fontSize: '12px',
                            color: '#999'
                          }}>
                            by {post.username}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          ) : (
            /* List View */
            <div style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '16px',
              WebkitOverflowScrolling: 'touch'
            }}>
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#e8f4fd',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#002B4D'
              }}>
                📍 Tour stops in order
              </div>

              {tourPosts
                .filter(post => post.latitude && post.longitude)
                .map((post, index) => (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#002B4D'
                    }}>
                      Stop {index + 1}: {post.title}
                    </h3>
                  </div>

                  {post.description && (
                    <p style={{
                      margin: '0 0 8px 0',
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {post.description}
                    </p>
                  )}

                  <div style={{
                    fontSize: '12px',
                    color: '#999',
                    marginBottom: '8px'
                  }}>
                    by {post.username}
                  </div>

                  {/* Tour Rating and Comment Icon */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    {/* Star Rating */}
                    {ratingStats && ratingStats.ratingCount > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar
                              key={star}
                              size={12}
                              color={star <= Math.round(ratingStats!.averageRating) ? '#ffc107' : '#e0e0e0'}
                            />
                          ))}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          color: '#666',
                          fontWeight: '500'
                        }}>
                          {ratingStats.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Comment Icon */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReviewsModal(true);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    >
                      <FaComment size={12} color="#666" />
                      <span style={{
                        fontSize: '11px',
                        color: '#666'
                      }}>
                        Reviews
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Switch to map view and center on this post
                      setViewMode('map');
                      if (mapRef && post.latitude && post.longitude) {
                        setTimeout(() => {
                          mapRef.setView([post.latitude!, post.longitude!], 17);
                        }, 100);
                      }
                    }}
                    style={{
                      backgroundColor: '#002B4D',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaLocationArrow size={10} />
                    View on Map
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tour Info Footer */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderTop: '1px solid #e0e0e0'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
              {tour.name}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
              {tourPosts.length} {tourPosts.length === 1 ? 'stop' : 'stops'}
              {tour.description && ` • ${tour.description}`}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        tourId={tour.id}
        tourName={tour.name}
      />
    </div>
  );
};

export default TourMapView; 