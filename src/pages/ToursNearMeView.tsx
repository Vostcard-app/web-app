import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMapPin, FaWalking, FaUser, FaStar, FaComment, FaUserCircle, FaCalendarAlt, FaClock, FaUsers } from 'react-icons/fa';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { RatingService, type RatingStats } from '../services/ratingService';
import { ReviewService } from '../services/reviewService';
import ReviewsModal from '../components/ReviewsModal';
import type { Tour } from '../types/TourTypes';
import type { GuidedTour } from '../types/GuidedTourTypes';

interface TourWithCreator extends Tour {
  creatorUsername: string;
  creatorAvatar?: string;
  creatorRole?: string;
  distance?: number;
  firstPostLocation?: {
    latitude: number;
    longitude: number;
  };
  ratingStats?: RatingStats;
  reviewCount?: number;
}

interface GuidedTourWithCreator extends GuidedTour {
  creatorUsername: string;
  creatorAvatar?: string;
  creatorRole?: string;
  distance?: number;
  firstPostLocation?: {
    latitude: number;
    longitude: number;
  };
  ratingStats?: RatingStats;
  reviewCount?: number;
}

type AllTourTypes = TourWithCreator | GuidedTourWithCreator;

type TabType = 'self-guided' | 'guide-led';

const ToursNearMeView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  const shouldUseContainer = isDesktop;

  const [activeTab, setActiveTab] = useState<TabType>('self-guided');
  const [selfGuidedTours, setSelfGuidedTours] = useState<TourWithCreator[]>([]);
  const [guidedTours, setGuidedTours] = useState<GuidedTourWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState<AllTourTypes | null>(null);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in kilometers
    return d;
  };

  // Get review count for a tour
  const getTourReviewCount = async (tourId: string): Promise<number> => {
    try {
      const reviews = await ReviewService.getTourReviews(tourId);
      return reviews.length;
    } catch (error) {
      console.warn(`Failed to fetch review count for tour ${tourId}:`, error);
      return 0;
    }
  };

  // Handle review icon click
  const handleReviewIconClick = (tour: AllTourTypes, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tour click
    setSelectedTour(tour);
    setShowReviewsModal(true);
  };

  // Get user's current location
  useEffect(() => {
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    };

    getCurrentLocation();
  }, []);

  // Fetch tours and creator information
  useEffect(() => {
    const fetchToursNearMe = async () => {
      if (!userLocation) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch self-guided tours (regular tours)
        const selfGuidedQuery = query(
          collection(db, 'tours'),
          where('isPublic', '==', true)
        );
        
        // Fetch guided tours
        const guidedQuery = query(
          collection(db, 'guidedTours')
        );
        
        const [selfGuidedSnapshot, guidedSnapshot] = await Promise.all([
          getDocs(selfGuidedQuery),
          getDocs(guidedQuery)
        ]);

        const selfGuidedWithCreators: TourWithCreator[] = [];
        const guidedWithCreators: GuidedTourWithCreator[] = [];

        // Process self-guided tours
        for (const tourDoc of selfGuidedSnapshot.docs) {
          const tourData = tourDoc.data();
          
          // Get creator information
          const creatorDoc = await getDoc(doc(db, 'users', tourData.creatorId));
          const creatorData = creatorDoc.exists() ? creatorDoc.data() : null;

          // Get rating stats
          const ratingStats = await RatingService.getTourRatingStats(tourDoc.id);

          // Get review count for the tour
          const reviewCount = await getTourReviewCount(tourDoc.id);

          // Get first post with valid location for distance calculation
          let firstPostLocation: { latitude: number; longitude: number } | undefined = undefined;
          if (tourData.postIds && tourData.postIds.length > 0) {
            // Check all posts to find the first one with valid location data
            for (const postId of tourData.postIds) {
              try {
                const postDoc = await getDoc(doc(db, 'vostcards', postId));
                if (postDoc.exists()) {
                  const postData = postDoc.data();
                  if (postData.latitude && postData.longitude) {
                    firstPostLocation = {
                      latitude: postData.latitude,
                      longitude: postData.longitude
                    };
                    break; // Found first valid location, stop searching
                  }
                }
              } catch (postError) {
                console.warn(`Could not fetch post location for ${postId}:`, postError);
                continue; // Try next post
              }
            }
          }

          // Calculate distance if we have location data
          let distance: number | undefined = undefined;
          if (firstPostLocation) {
            distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              firstPostLocation.latitude,
              firstPostLocation.longitude
            );
          }

          const tourWithCreator: TourWithCreator = {
            id: tourDoc.id,
            creatorId: tourData.creatorId,
            name: tourData.name,
            description: tourData.description,
            postIds: tourData.postIds || [],
            createdAt: tourData.createdAt?.toDate() || new Date(),
            updatedAt: tourData.updatedAt?.toDate() || new Date(),
            isPublic: tourData.isPublic ?? true,
            shareableUrl: tourData.shareableUrl,
            isShareable: tourData.isShareable,
            creatorUsername: creatorData?.username || 'Unknown User',
            creatorAvatar: creatorData?.avatarURL,
            creatorRole: creatorData?.userRole,
            distance,
            firstPostLocation,
            ratingStats,
            reviewCount
          };

          selfGuidedWithCreators.push(tourWithCreator);
        }

        // Process guided tours
        for (const tourDoc of guidedSnapshot.docs) {
          const tourData = tourDoc.data();
          
          // Get creator information
          const creatorDoc = await getDoc(doc(db, 'users', tourData.creatorId || tourData.guideId));
          const creatorData = creatorDoc.exists() ? creatorDoc.data() : null;

          // Get rating stats
          const ratingStats = await RatingService.getTourRatingStats(tourDoc.id);

          // Get review count for the tour
          const reviewCount = await getTourReviewCount(tourDoc.id);

          // For guided tours, use meeting point for distance calculation
          let firstPostLocation: { latitude: number; longitude: number } | undefined = undefined;
          let distance: number | undefined = undefined;
          
          if (tourData.meetingPoint?.latitude && tourData.meetingPoint?.longitude) {
            firstPostLocation = {
              latitude: tourData.meetingPoint.latitude,
              longitude: tourData.meetingPoint.longitude
            };
            
            distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              firstPostLocation.latitude,
              firstPostLocation.longitude
            );
          }

          const guidedTourWithCreator: GuidedTourWithCreator = {
            ...tourData,
            id: tourDoc.id,
            createdAt: tourData.createdAt?.toDate() || new Date(),
            updatedAt: tourData.updatedAt?.toDate() || new Date(),
            creatorUsername: creatorData?.username || tourData.guideName || 'Unknown Guide',
            creatorAvatar: creatorData?.avatarURL || tourData.guideAvatar,
            creatorRole: creatorData?.userRole || 'guide',
            distance,
            firstPostLocation,
            ratingStats,
            reviewCount
          } as GuidedTourWithCreator;

          guidedWithCreators.push(guidedTourWithCreator);
        }

        // Sort both arrays by distance (closest first), then by creation date
        const sortTours = (tours: any[]) => tours.sort((a, b) => {
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          if (a.distance !== undefined && b.distance === undefined) {
            return -1;
          }
          if (a.distance === undefined && b.distance !== undefined) {
            return 1;
          }
          // Both have no distance, sort by creation date
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        setSelfGuidedTours(sortTours(selfGuidedWithCreators));
        setGuidedTours(sortTours(guidedWithCreators));
      } catch (error) {
        console.error('Error fetching tours:', error);
        setError('Failed to load tours. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchToursNearMe();
  }, [userLocation]);

  const handleTourClick = async (tour: AllTourTypes) => {
    try {
      // Check if it's a guided tour
      if ('type' in tour && tour.type === 'guided') {
        // Navigate to guided tour detail view
        navigate(`/guided-tour/${tour.id}`);
        return;
      }
      
      // Handle self-guided tour
      console.log('🎬 Loading tour for dedicated map view:', tour.name);
      
      // Import TourService to get tour posts
      const { TourService } = await import('../services/tourService');
      
      // Get the tour posts
      const tourPosts = await TourService.getTourPosts(tour as TourWithCreator);
      console.log('🎬 Fetched tour posts:', tourPosts.length);
      
      // Navigate to dedicated TourMapView with tour data
      navigate(`/tour-map/${tour.id}`, { 
        state: { 
          tourData: {
            tour,
            tourPosts
          }
        } 
      });
    } catch (error) {
      console.error('❌ Error loading tour for map view:', error);
      // Fallback to original tour detail view
      navigate(`/tour/${tour.id}`, { state: { tour, autoRecenter: true } });
    }
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getTourTerminology = (userRole?: string) => {
    return userRole === 'guide' ? 'Tour' : 'Trip';
  };

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
            onClick={() => navigate('/home')}
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
            fontSize: 20,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaWalking size={24} />
            Tours Near Me
          </div>
          
          <div style={{ width: '44px' }} /> {/* Spacer for centering */}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: 'white',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('self-guided')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              backgroundColor: activeTab === 'self-guided' ? '#f8f9fa' : 'transparent',
              borderBottom: activeTab === 'self-guided' ? '3px solid #007aff' : '3px solid transparent',
              color: activeTab === 'self-guided' ? '#007aff' : '#666',
              fontWeight: activeTab === 'self-guided' ? '600' : '400',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Self Guided
          </button>
          <button
            onClick={() => setActiveTab('guide-led')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              backgroundColor: activeTab === 'guide-led' ? '#f8f9fa' : 'transparent',
              borderBottom: activeTab === 'guide-led' ? '3px solid #134369' : '3px solid transparent',
              color: activeTab === 'guide-led' ? '#134369' : '#666',
              fontWeight: activeTab === 'guide-led' ? '600' : '400',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Guide Led
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '16px'
        }}>
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              fontSize: '16px',
              color: '#666'
            }}>
              Loading tours near you...
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {(() => {
            const currentTours = activeTab === 'self-guided' ? selfGuidedTours : guidedTours;
            
            if (!loading && !error && currentTours.length === 0) {
              return (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  No {activeTab === 'self-guided' ? 'self-guided' : 'guide-led'} tours found in your area
                </div>
              );
            }

            if (!loading && !error && currentTours.length > 0) {
              return (
                <>
                  <div style={{
                    marginBottom: '16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {currentTours.length} {activeTab === 'self-guided' ? 'self-guided' : 'guide-led'} tour{currentTours.length !== 1 ? 's' : ''} found
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {currentTours.map((tour) => (
                  <div
                    key={tour.id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onClick={() => handleTourClick(tour)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#007aff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {/* Render different layouts based on tour type */}
                    {activeTab === 'guide-led' ? (
                      /* GUIDED TOUR LAYOUT */
                      <>
                    {/* Tour Image - for guided tours */}
                    {'images' in tour && (
                      <div style={{
                        width: '100%',
                        height: '200px',
                        backgroundImage: tour.images && tour.images.length > 0 && tour.images[0]
                          ? `url(${tour.images[0]})`
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {/* Placeholder text when no image */}
                        {(!tour.images || tour.images.length === 0 || !tour.images[0]) && (
                          <div style={{
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: '600',
                            textAlign: 'center',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                          }}>
                            {tour.name}
                          </div>
                        )}
                        
                        {/* Rating badge */}
                        {'averageRating' in tour && tour.averageRating > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            backgroundColor: 'white',
                            borderRadius: '20px',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}>
                            <span style={{ color: '#ffc107' }}>★</span>
                            <span>{tour.averageRating.toFixed(1)}</span>
                          </div>
                        )}

                        {/* Hero Overlay with Guide Avatar and Tour Title */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
                          padding: '16px 16px 12px',
                          color: 'white'
                        }}>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '12px'
                          }}>
                            {/* Guide Avatar */}
                            <div 
                              style={{ 
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/guide-profile/${tour.guideId}`);
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {(tour.guideAvatar || tour.creatorAvatar) ? (
                                <img
                                  src={tour.guideAvatar || tour.creatorAvatar}
                                  alt={tour.guideName || tour.creatorUsername}
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid white',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  backgroundColor: '#134369',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid white',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}>
                                  <FaUserCircle size={24} color="white" />
                                </div>
                              )}
                            </div>

                            {/* Tour Title and Guide Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {/* Tour Title */}
                              <h3 style={{ 
                                fontSize: '16px', 
                                fontWeight: 'bold', 
                                margin: '0 0 4px 0',
                                lineHeight: '1.2',
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {tour.name}
                              </h3>

                              {/* Guide Name */}
                              <div 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  color: 'rgba(255, 255, 255, 0.9)',
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/guide-profile/${tour.guideId}`);
                                }}
                              >
                                <span>with {tour.guideName || tour.creatorUsername}</span>
                                <span style={{ fontSize: '10px' }}>• View Profile</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tour Content */}
                    <div style={{ padding: '20px' }}>
                      {/* Tour Description */}
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '14px', 
                          color: '#666',
                          lineHeight: '1.4'
                        }}>
                          {tour.description}
                        </p>
                      </div>

                      {/* Tour Details Grid */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '12px',
                        marginBottom: '16px'
                      }}>
                        {'duration' in tour && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaClock size={14} color="#666" />
                            <span style={{ fontSize: '14px', color: '#666' }}>
                              {Math.floor(tour.duration / 60)}h {tour.duration % 60}min
                            </span>
                          </div>
                        )}
                        
                        {'maxGroupSize' in tour && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaUsers size={14} color="#666" />
                            <span style={{ fontSize: '14px', color: '#666' }}>
                              Up to {tour.maxGroupSize} people
                            </span>
                          </div>
                        )}
                        
                        {'basePrice' in tour && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', color: '#134369', fontWeight: '600' }}>
                              ${(() => {
                                // Ensure 10% markup is always applied for display
                                // If tour has guideRate, use basePrice as-is (already includes markup)
                                // If no guideRate, assume basePrice is guide rate and add 10%
                                const hasGuideRate = 'guideRate' in tour && tour.guideRate;
                                const displayPrice = hasGuideRate ? tour.basePrice : Math.round(tour.basePrice * 1.1);
                                return displayPrice;
                              })()}/person
                            </span>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FaStar size={14} color="#ffc107" />
                          <span style={{ fontSize: '14px', color: '#666' }}>
                            {'averageRating' in tour && tour.averageRating > 0 ? tour.averageRating.toFixed(1) : 'New'}
                            {'totalReviews' in tour && tour.totalReviews > 0 && ` (${tour.totalReviews})`}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/guided-tour/${tour.id}`);
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: 'white',
                            color: '#134369',
                            border: '2px solid #134369',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                          }}
                        >
                          View Details
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/guided-tour/${tour.id}`);
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: '#134369',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0f2a4a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#134369';
                          }}
                        >
                          <FaCalendarAlt size={12} />
                          Book Tour
                        </button>
                      </div>
                    </div>
                      </>
                    ) : (
                      /* SELF-GUIDED TOUR LAYOUT (Original) */
                      <>
                        <div style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            {/* Guide Avatar */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              flexShrink: 0,
                              gap: '4px'
                            }}>
                              <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                backgroundColor: '#f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {tour.creatorAvatar ? (
                                  <img
                                    src={tour.creatorAvatar}
                                    alt={tour.creatorUsername}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                ) : (
                                  <FaUser size={24} color="#666" />
                                )}
                              </div>
                              {tour.creatorRole === 'guide' && (
                                <div style={{
                                  fontSize: '10px',
                                  color: '#007aff',
                                  fontWeight: '600',
                                  textAlign: 'center'
                                }}>
                                  Guide
                                </div>
                              )}
                            </div>

                            {/* Tour Details */}
                            <div style={{ flex: 1 }}>
                              {/* Tour Title */}
                              <h3 style={{
                                margin: '0 0 4px 0',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#333'
                              }}>
                                {tour.name}
                              </h3>

                              {/* Creator Info */}
                              <div style={{
                                fontSize: '14px',
                                color: '#007aff',
                                marginBottom: '8px'
                              }}>
                                by {tour.creatorUsername} • {getTourTerminology(tour.creatorRole)}
                              </div>

                              {/* Rating and Reviews Row */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                marginBottom: '8px'
                              }}>
                                {/* Star Rating */}
                                {tour.ratingStats && tour.ratingStats.ratingCount > 0 && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <FaStar
                                          key={star}
                                          size={14}
                                          color={star <= Math.round(tour.ratingStats!.averageRating) ? '#ffc107' : '#e0e0e0'}
                                        />
                                      ))}
                                    </div>
                                    <span style={{
                                      fontSize: '12px',
                                      color: '#666',
                                      fontWeight: '500'
                                    }}>
                                      {tour.ratingStats.averageRating.toFixed(1)} ({tour.ratingStats.ratingCount})
                                    </span>
                                  </div>
                                )}

                                {/* Review Count */}
                                {tour.reviewCount !== undefined && tour.reviewCount > 0 && (
                                  <button
                                    onClick={(e) => handleReviewIconClick(tour, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px',
                                      borderRadius: '4px',
                                      transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <FaComment size={12} color="#666" />
                                    <span style={{
                                      fontSize: '12px',
                                      color: '#666',
                                      fontWeight: '500'
                                    }}>
                                      {tour.reviewCount} review{tour.reviewCount !== 1 ? 's' : ''}
                                    </span>
                                  </button>
                                )}
                              </div>

                              {/* Description */}
                              {tour.description && (
                                <p style={{
                                  margin: '0 0 8px 0',
                                  color: '#666',
                                  fontSize: '14px',
                                  lineHeight: '1.4'
                                }}>
                                  {tour.description}
                                </p>
                              )}

                              {/* Meta Info */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                fontSize: '12px',
                                color: '#999'
                              }}>
                                <span>{tour.postIds.length} {tour.postIds.length === 1 ? 'stop' : 'stops'}</span>
                                <span>Created {tour.createdAt.toLocaleDateString()}</span>
                                {tour.distance !== undefined && (
                                  <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: '#007aff',
                                    fontWeight: '500'
                                  }}>
                                    <FaMapPin size={10} />
                                    {formatDistance(tour.distance)} away
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                    ))}
                  </div>
                </>
              );
            }
            
            return null;
          })()}
        </div>
      </div>

      {/* Reviews Modal */}
      {selectedTour && (
        <ReviewsModal
          isOpen={showReviewsModal}
          onClose={() => {
            setShowReviewsModal(false);
            setSelectedTour(null);
          }}
          tourId={selectedTour.id}
          tourName={selectedTour.name}
        />
      )}
    </div>
  );
};

export default ToursNearMeView; 