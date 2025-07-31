import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMapPin, FaWalking, FaUser, FaStar, FaComment } from 'react-icons/fa';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { RatingService, type RatingStats } from '../services/ratingService';
import { ReviewService } from '../services/reviewService';
import ReviewsModal from '../components/ReviewsModal';
import type { Tour } from '../types/TourTypes';

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

const ToursNearMeView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  const shouldUseContainer = isDesktop;

  const [tours, setTours] = useState<TourWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourWithCreator | null>(null);

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
  const handleReviewIconClick = (tour: TourWithCreator, e: React.MouseEvent) => {
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

        // Fetch all public tours
        const toursQuery = query(
          collection(db, 'tours'),
          where('isPublic', '==', true)
        );
        
        const toursSnapshot = await getDocs(toursQuery);
        const toursWithCreators: TourWithCreator[] = [];

        // Process each tour
        for (const tourDoc of toursSnapshot.docs) {
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

          toursWithCreators.push(tourWithCreator);
        }

        // Sort by distance (closest first), then by creation date for tours without location
        const sortedTours = toursWithCreators.sort((a, b) => {
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

        setTours(sortedTours);
      } catch (error) {
        console.error('Error fetching tours:', error);
        setError('Failed to load tours. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchToursNearMe();
  }, [userLocation]);

  const handleTourClick = async (tour: TourWithCreator) => {
    try {
      console.log('🎬 Loading tour for dedicated map view:', tour.name);
      
      // Import TourService to get tour posts
      const { TourService } = await import('../services/tourService');
      
      // Get the tour posts
      const tourPosts = await TourService.getTourPosts(tour);
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

          {!loading && !error && tours.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666',
              fontStyle: 'italic'
            }}>
              No tours found in your area
            </div>
          )}

          {!loading && !error && tours.length > 0 && (
            <>
              <div style={{
                marginBottom: '16px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>
                {tours.length} tour{tours.length !== 1 ? 's' : ''} found
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tours.map((tour) => (
                  <div
                    key={tour.id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: '16px',
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {/* Guide Avatar */}
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
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
                ))}
              </div>
            </>
          )}
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