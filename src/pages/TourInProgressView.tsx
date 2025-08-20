import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaTimes, FaList, FaMap, FaLocationArrow, FaWalking, FaStar, FaUserCircle } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { RatingService } from '../services/ratingService';
import { ReviewService } from '../services/reviewService';
import { TourService } from '../services/tourService';
import { useResponsive } from '../hooks/useResponsive';
import TipDropdownMenu from '../components/TipDropdownMenu';
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

// User location icon with direction
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtb3BhY2l0eT0iMC4zIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjYiIGZpbGw9IiM0Mjg1RjQiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjIuNSIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4=',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Map updater component
const TourProgressMapUpdater = ({ setMapRef }: { setMapRef: (map: L.Map) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      setMapRef(map);
    }
  }, [map, setMapRef]);

  return null;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d * 1000; // Convert to meters
};

const TourInProgressView: React.FC = () => {
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [showLeavingTourView, setShowLeavingTourView] = useState(false);
  const [tourRating, setTourRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [guideProfile, setGuideProfile] = useState<any>(null);
  const [showTipDropdown, setShowTipDropdown] = useState(false);
  const [tipDropdownPosition, setTipDropdownPosition] = useState({ top: 0, left: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoveredStar, setReviewHoveredStar] = useState(0);

  // Refs for tip functionality
  const tipButtonRef = useRef<HTMLButtonElement>(null);

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
          console.log('🎬 TourInProgressView: Using tour data from navigation state');
          setTour(tourData.tour);
          setTourPosts(tourData.tourPosts);
        } else if (tourId) {
          console.log('🎬 TourInProgressView: Fetching tour data for ID:', tourId);
          // Fetch tour and posts from Firebase
          const fetchedTour = await TourService.getTour(tourId);
          if (fetchedTour) {
            setTour(fetchedTour);
            const fetchedPosts = await TourService.getTourPosts(fetchedTour);
            setTourPosts(fetchedPosts);
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

  // Fetch guide profile data
  useEffect(() => {
    const fetchGuideProfile = async () => {
      if (!tour?.creatorId) return;

      try {
        console.log('🧑‍🏫 Fetching guide profile for:', tour.creatorId);
        const userRef = doc(db, 'users', tour.creatorId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setGuideProfile({
            id: tour.creatorId,
            username: userData.username || 'Tour Guide',
            avatarURL: userData.avatarURL || '',
            userRole: userData.userRole || 'user',
            buyMeACoffeeURL: userData.buyMeACoffeeURL || '',
            kofiURL: userData.kofiURL || '',
            paypalURL: userData.paypalURL || '',
            venmoURL: userData.venmoURL || '',
            cashappURL: userData.cashappURL || '',
            zelleURL: userData.zelleURL || '',
            applePayURL: userData.applePayURL || '',
            googlePayURL: userData.googlePayURL || '',
            patreonURL: userData.patreonURL || '',
            bitcoinURL: userData.bitcoinURL || '',
            ethereumURL: userData.ethereumURL || ''
          });
          console.log('✅ Guide profile loaded:', userData.username);
        } else {
          console.warn('❌ Guide profile not found');
        }
      } catch (error) {
        console.error('❌ Error fetching guide profile:', error);
      }
    };

    fetchGuideProfile();
  }, [tour?.creatorId]);

  // Start continuous location tracking
  useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 TourInProgressView: User location updated:', { latitude, longitude });
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.warn('📍 TourInProgressView: Location error:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
      setWatchId(id);

      return () => {
        if (id) {
          navigator.geolocation.clearWatch(id);
        }
      };
    }
  }, []);

  // Auto-fit map bounds when data is loaded
  useEffect(() => {
    if (mapRef && tourPosts.length > 0 && userLocation && viewMode === 'map') {
      console.log('🎬 TourInProgressView: Auto-fitting map bounds');

      // Get all valid tour post positions
      const tourPositions = tourPosts
        .filter(post => post.latitude && post.longitude)
        .map(post => [post.latitude!, post.longitude!] as [number, number]);

      if (tourPositions.length > 0) {
        // Include user location in bounds calculation
        const allPositions = [...tourPositions, userLocation];

        try {
          const bounds = L.latLngBounds(allPositions);
          console.log('🎬 TourInProgressView: Fitting map to bounds');
          mapRef.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 16
          });
        } catch (error) {
          console.warn('🎬 TourInProgressView: Error fitting map bounds:', error);
        }
      }
    }
  }, [mapRef, tourPosts, userLocation, viewMode]);

  const getPostIcon = (post: TourPost) => {
    // Show guide pin for all Jay Bond's vostcards
    if (post.username === 'Jay Bond') return guideIcon;
    
    if (post.isOffer) return offerIcon;
    if (post.isQuickcard) {
      if (post.userRole === 'guide') return guideIcon;
      return quickcardIcon;
    }
    if (post.userRole === 'guide') return guideIcon;
    return vostcardIcon;
  };

  const handleLeaveTour = () => {
    console.log('🚪 Showing leaving tour view');
    setShowLeavingTourView(true);
  };

  const handleConfirmLeaveTour = async () => {
    console.log('🚪 Leaving tour in progress');
    
    // Save the rating if user provided one
    if (tourRating > 0 && tour?.id) {
      try {
        await RatingService.submitTourRating(tour.id, tourRating);
        console.log(`✅ Tour rating submitted: ${tourRating} stars for tour ${tour.id}`);
      } catch (error) {
        console.error('❌ Error submitting tour rating:', error);
        // Continue with leaving tour even if rating fails
      }
    }
    
    // Clean up location tracking
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    // Navigate back to home screen
    navigate('/home');
  };

  const handleStarClick = (rating: number) => {
    setTourRating(rating);
  };

  const handleStarHover = (rating: number) => {
    setHoveredStar(rating);
  };

  const handleStarLeave = () => {
    setHoveredStar(0);
  };

  const handleTipButtonClick = () => {
    console.log('💰 Tip button clicked!');
    console.log('🧑‍🏫 Guide profile:', guideProfile);
    
    if (!guideProfile && (!tour?.creatorId || !tourPosts || tourPosts.length === 0)) {
      console.warn('❌ No guide profile or tour data available');
      alert('Tour information is still loading. Please wait a moment and try again.');
      return;
    }

    // If we don't have full guide profile but have basic info, create a minimal profile
    let profileToUse = guideProfile;
    if (!guideProfile && tour?.creatorId) {
      console.log('🔄 Creating fallback guide profile');
      profileToUse = {
        id: tour.creatorId,
        username: tourPosts[0]?.username || 'Tour Guide',
        userRole: 'guide', // Assume tour creators are guides
        buyMeACoffeeURL: '',
        kofiURL: '',
        paypalURL: '',
        venmoURL: '',
        cashappURL: '',
        zelleURL: '',
        applePayURL: '',
        googlePayURL: '',
        patreonURL: '',
        bitcoinURL: '',
        ethereumURL: ''
      };
    }

    if (tipButtonRef.current) {
      const rect = tipButtonRef.current.getBoundingClientRect();
      console.log('📍 Button position:', { rect, scrollY: window.scrollY, scrollX: window.scrollX });
      
      setTipDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + rect.width / 2 + window.scrollX
      });
      setShowTipDropdown(true);
      console.log('✅ Tip dropdown should now be visible');
      
      // Update the guide profile state if we created a fallback
      if (!guideProfile && profileToUse) {
        setGuideProfile(profileToUse);
      }
    } else {
      console.error('❌ Tip button ref not found');
    }
  };

  const handleCloseTipDropdown = () => {
    setShowTipDropdown(false);
  };

  // Review form handlers
  const handleReviewButtonClick = () => {
    console.log('📝 Review button clicked');
    setShowReviewForm(true);
  };

  const handleReviewStarClick = (rating: number) => {
    setReviewRating(rating);
  };

  const handleReviewStarHover = (rating: number) => {
    setReviewHoveredStar(rating);
  };

  const handleReviewStarLeave = () => {
    setReviewHoveredStar(0);
  };

  const handleSubmitReview = async () => {
    if (!tour?.id) {
      alert('Unable to submit review - tour not found');
      return;
    }

    if (reviewRating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!reviewComment.trim()) {
      alert('Please enter a review comment');
      return;
    }

    try {
      await ReviewService.submitReview(tour.id, reviewRating, reviewComment.trim());
      console.log('✅ Review submitted successfully');
      
      // Reset form
      setReviewComment('');
      setReviewRating(0);
      setReviewHoveredStar(0);
      setShowReviewForm(false);
      
      alert('Thank you for your review!');
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleCancelReview = () => {
    setReviewComment('');
    setReviewRating(0);
    setReviewHoveredStar(0);
    setShowReviewForm(false);
  };

  // Type for tour posts with distance information
  type TourPostWithDistance = TourPost & { distance: number };

  const getSortedPosts = (): TourPostWithDistance[] => {
    // Filter out offers from list view, but keep regular posts, quickcards, and guide posts
    const nonOfferPosts = tourPosts.filter(post => !post.isOffer);
    
    if (!userLocation) return nonOfferPosts.map(post => ({ ...post, distance: 0 }));
    
    return nonOfferPosts
      .filter(post => post.latitude && post.longitude)
      .map(post => ({
        ...post,
        distance: calculateDistance(
          userLocation[0], userLocation[1],
          post.latitude!, post.longitude!
        )
      }))
      .sort((a, b) => a.distance - b.distance);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '16px',
        color: '#666',
        backgroundColor: '#002B4D'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <FaWalking size={48} style={{ marginBottom: '16px' }} />
          <div>Starting tour...</div>
        </div>
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
        padding: '20px',
        backgroundColor: '#002B4D',
        color: 'white'
      }}>
        <h2 style={{ color: '#ff6b6b', marginBottom: '16px' }}>Error</h2>
        <p style={{ textAlign: 'center' }}>{error || 'Tour not found'}</p>
        <button
          onClick={() => navigate('/tours-near-me')}
          style={{
            marginTop: '20px',
            backgroundColor: 'white',
            color: '#002B4D',
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
      backgroundColor: shouldUseContainer ? '#f0f0f0' : '#002B4D',
      display: shouldUseContainer ? 'flex' : 'block',
      justifyContent: shouldUseContainer ? 'center' : 'initial',
      alignItems: shouldUseContainer ? 'flex-start' : 'initial',
      padding: shouldUseContainer ? '20px' : '0'
    }}>
      <div style={{
        width: shouldUseContainer ? '390px' : '100%',
        maxWidth: shouldUseContainer ? '390px' : '100%',
        height: shouldUseContainer ? '844px' : '100vh',
        backgroundColor: '#002B4D',
        boxShadow: shouldUseContainer ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: shouldUseContainer ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Fixed Header Section */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: '#002B4D',
          borderRadius: shouldUseContainer ? '16px 16px 0 0' : '0'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#001a33',
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            borderRadius: shouldUseContainer ? '16px 16px 0 0' : '0',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 16px)',
            paddingRight: 'env(safe-area-inset-right, 16px)'
          }}>
            <div style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <FaWalking />
              Tour in Progress
            </div>

            <button
              onClick={handleLeaveTour}
              style={{
                background: '#ff6b6b',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontWeight: '600'
              }}
            >
              <FaTimes size={12} />
              Leave Tour
            </button>
          </div>

          {/* Tour Info */}
          <div style={{
            backgroundColor: '#002B4D',
            padding: '12px 16px',
            borderBottom: '1px solid #001a33',
            color: 'white'
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
              {tour.name}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
              {tourPosts.length} {tourPosts.length === 1 ? 'stop' : 'stops'}
              {tour.description && ` • ${tour.description}`}
            </p>
          </div>

          {/* View Toggle Buttons */}
          <div style={{
            backgroundColor: '#002B4D',
            padding: '12px 16px',
            borderBottom: '1px solid #001a33',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => setViewMode('map')}
              style={{
                flex: 1,
                backgroundColor: viewMode === 'map' ? '#002B4D' : 'white',
                color: viewMode === 'map' ? 'white' : '#002B4D',
                border: '2px solid white',
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

            <button
              onClick={() => setViewMode('list')}
              style={{
                flex: 1,
                backgroundColor: viewMode === 'list' ? '#002B4D' : 'white',
                color: viewMode === 'list' ? 'white' : '#002B4D',
                border: '2px solid white',
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
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ 
          flex: 1, 
          position: 'relative', 
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
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

              <TourProgressMapUpdater setMapRef={setMapRef} />

              {/* User Location Marker */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={userIcon}
                >
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <strong>Your Location</strong>
                      <br />
                      <small>Follow the tour stops</small>
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
            /* Scrollable List View */
            <div style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '16px',
              WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
            }}>
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#e8f4fd',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#002B4D'
              }}>
                📍 Tour stops sorted by distance from your current location (offers shown on map only)
              </div>

              {getSortedPosts().map((post, index) => (
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
                    {userLocation && (
                      <div style={{
                        backgroundColor: '#002B4D',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {post.distance < 1000 
                          ? `${Math.round(post.distance)}m`
                          : `${(post.distance / 1000).toFixed(1)}km`
                        }
                      </div>
                    )}
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
                    marginBottom: '12px'
                  }}>
                    by {post.username}
                  </div>

                  <button
                    onClick={() => {
                      // Switch to map view and center on this post
                      setViewMode('map');
                      if (mapRef && post.latitude && post.longitude) {
                        mapRef.setView([post.latitude, post.longitude], 17);
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
                    Navigate to Stop
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaving Tour View Modal */}
        {showLeavingTourView && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '350px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              {/* Close Button */}
              <button
                onClick={() => setShowLeavingTourView(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >
                <FaTimes />
              </button>

              {/* Guide Info - Left Justified */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px'
              }}>
                {/* Guide Avatar */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#666',
                  overflow: 'hidden'
                }}>
                  {guideProfile?.avatarURL ? (
                    <img
                      src={guideProfile.avatarURL}
                      alt={guideProfile.username || 'Guide Avatar'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={() => setGuideProfile((prev: any) => ({ ...prev, avatarURL: null }))}
                    />
                  ) : (
                    <FaUserCircle size={60} color="#002B4D" />
                  )}
                </div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#002B4D'
                  }}>
                    {guideProfile?.username || tourPosts[0]?.username || 'Tour Guide'}
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <button
                  ref={tipButtonRef}
                  onClick={(e) => {
                    console.log('🔘 Tip button clicked - raw event');
                    e.preventDefault();
                    e.stopPropagation();
                    handleTipButtonClick();
                  }}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    flex: 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#218838';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#28a745';
                  }}
                >
                  💰 Leave a Tip
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReviewButtonClick();
                  }}
                  style={{
                    backgroundColor: '#007aff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    flex: 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056b3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007aff';
                  }}
                >
                  📝 Leave a Review
                </button>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div style={{
                  marginBottom: '24px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#002B4D'
                  }}>
                    Leave a Review
                  </h4>

                  {/* Review Rating */}
                  <div style={{
                    marginBottom: '16px'
                  }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Your Rating
                    </label>
                    <div style={{
                      display: 'flex',
                      gap: '4px'
                    }}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isActive = star <= (reviewHoveredStar || reviewRating);
                        return (
                          <button
                            key={star}
                            onClick={() => handleReviewStarClick(star)}
                            onMouseEnter={() => handleReviewStarHover(star)}
                            onMouseLeave={handleReviewStarLeave}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '24px',
                              color: isActive ? '#ffc107' : '#e0e0e0',
                              transition: 'color 0.2s ease',
                              padding: '4px'
                            }}
                          >
                            <FaStar />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Comment */}
                  <div style={{
                    marginBottom: '16px'
                  }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Your Review
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this tour..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                      maxLength={500}
                    />
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      textAlign: 'right',
                      marginTop: '4px'
                    }}>
                      {reviewComment.length}/500 characters
                    </div>
                  </div>

                  {/* Review Form Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={handleCancelReview}
                      style={{
                        backgroundColor: 'white',
                        color: '#666',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReview}
                      disabled={reviewRating === 0 || !reviewComment.trim()}
                      style={{
                        backgroundColor: reviewRating === 0 || !reviewComment.trim() ? '#ccc' : '#007aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: reviewRating === 0 || !reviewComment.trim() ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Submit Review
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => setShowLeavingTourView(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'white',
                    color: '#002B4D',
                    border: '2px solid #002B4D',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Continue Tour
                </button>
                <button
                  onClick={handleConfirmLeaveTour}
                  style={{
                    flex: 1,
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: '2px solid #dc3545',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#c82333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc3545';
                  }}
                >
                  Leave Tour
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tip Dropdown Menu */}
        {showTipDropdown && (
          <div style={{ zIndex: 9999 }}>
            <TipDropdownMenu
              userProfile={guideProfile}
              isVisible={showTipDropdown}
              onClose={handleCloseTipDropdown}
              position={tipDropdownPosition}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TourInProgressView; 