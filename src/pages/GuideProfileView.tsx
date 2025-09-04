import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { FaArrowLeft, FaEdit, FaStar, FaMapPin, FaClock, FaUsers, FaLanguage, FaCheckCircle, FaCalendarAlt, FaHeart } from 'react-icons/fa';
import { GuidedTourService } from '../services/guidedTourService';
import GuideReviewsSection from '../components/GuideReviewsSection';
import { RatingService } from '../services/ratingService';
import { ReviewService } from '../services/reviewService';
import type { GuidedTour, GuideProfile } from '../types/GuidedTourTypes';

interface GuideProfileData extends GuideProfile {
  id: string;
  username: string;
  avatarURL?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  joinedDate?: Date;
  totalBookings?: number;
  responseRate?: number;
  responseTime?: string;
  languages?: string[];
  verified?: boolean;
}

interface TourWithStats extends GuidedTour {
  ratingStats?: {
    averageRating: number;
    ratingCount: number;
  };
  reviewCount?: number;
}

const GuideProfileView: React.FC = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();

  const [guideProfile, setGuideProfile] = useState<GuideProfileData | null>(null);
  const [guidedTours, setGuidedTours] = useState<TourWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'tours' | 'reviews'>('about');

  const isOwnProfile = user?.uid === guideId;

  useEffect(() => {
    const fetchGuideData = async () => {
      console.log('🔍 GuideProfileView: Received guideId:', guideId);
      if (!guideId) {
        console.error('❌ GuideProfileView: No guideId provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch guide profile from users collection
        const userDoc = await getDoc(doc(db, 'users', guideId));
        if (!userDoc.exists()) {
          setError('Guide not found');
          return;
        }

        const userData = userDoc.data();
        
        // Fetch guide profile from guideProfiles collection if exists
        let guideProfileData = null;
        try {
          const guideProfileDoc = await getDoc(doc(db, 'guideProfiles', guideId));
          if (guideProfileDoc.exists()) {
            guideProfileData = guideProfileDoc.data();
          }
        } catch (profileError) {
          console.warn('Guide profile not found, using user data only');
        }

        // Combine user data with guide profile data
        const combinedProfile: GuideProfileData = {
          id: guideId,
          username: userData.username || 'Unknown Guide',
          avatarURL: userData.avatarURL,
          name: userData.name,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          joinedDate: userData.createdAt?.toDate() || new Date(),
          bio: guideProfileData?.bio || userData.message || '',
          location: guideProfileData?.location || '',
          languages: guideProfileData?.languages || userData.languages || ['English'],
          specialties: guideProfileData?.specialties || [],
          experience: guideProfileData?.experience || '',
          certifications: guideProfileData?.certifications || [],
          totalBookings: guideProfileData?.totalBookings || 0,
          responseRate: guideProfileData?.responseRate || 95,
          responseTime: guideProfileData?.responseTime || 'within an hour',
          verified: guideProfileData?.verified || userData.userRole === 'guide',
          createdAt: guideProfileData?.createdAt?.toDate() || userData.createdAt?.toDate() || new Date(),
          updatedAt: guideProfileData?.updatedAt?.toDate() || new Date()
        };

        setGuideProfile(combinedProfile);

        // Fetch guide's tours
        const tours = await GuidedTourService.getGuidedToursByGuide(guideId);
        
        // Enhance tours with rating and review stats
        const toursWithStats = await Promise.all(
          tours.map(async (tour) => {
            const [ratingStats, reviews] = await Promise.all([
              RatingService.getTourRatingStats(tour.id!),
              ReviewService.getTourReviews(tour.id!)
            ]);

            return {
              ...tour,
              ratingStats,
              reviewCount: reviews.length
            };
          })
        );

        setGuidedTours(toursWithStats);
      } catch (error) {
        console.error('Error fetching guide data:', error);
        setError('Failed to load guide profile');
      } finally {
        setLoading(false);
      }
    };

    fetchGuideData();
  }, [guideId]);

  const handleEditProfile = () => {
    navigate(`/guide-profile/${guideId}/edit`);
  };

  const handleTourClick = (tour: TourWithStats) => {
    navigate(`/guided-tour/${tour.id}`);
  };

  const formatJoinDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long'
    }).format(date);
  };

  const calculateOverallRating = () => {
    if (guidedTours.length === 0) return 0;
    
    const toursWithRatings = guidedTours.filter(tour => 
      tour.ratingStats && tour.ratingStats.ratingCount > 0
    );
    
    if (toursWithRatings.length === 0) return 0;
    
    const totalRating = toursWithRatings.reduce((sum, tour) => 
      sum + (tour.ratingStats?.averageRating || 0), 0
    );
    
    return totalRating / toursWithRatings.length;
  };

  const getTotalReviews = () => {
    return guidedTours.reduce((sum, tour) => sum + (tour.reviewCount || 0), 0);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading guide profile...</div>
        </div>
      </div>
    );
  }

  if (error || !guideProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#d32f2f', marginBottom: '16px' }}>
            {error || 'Guide not found'}
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: '#134369',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const overallRating = calculateOverallRating();
  const totalReviews = getTotalReviews();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#134369',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            <FaArrowLeft size={16} />
            Back
          </button>

          {isOwnProfile && (
            <button
              onClick={handleEditProfile}
              style={{
                background: '#134369',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <FaEdit size={14} />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '20px 16px' : '40px 20px'
      }}>
        {/* Hero Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: isMobile ? '24px' : '40px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'flex-start',
            gap: '24px'
          }}>
            {/* Avatar */}
            <div style={{
              width: isMobile ? '120px' : '150px',
              height: isMobile ? '120px' : '150px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {guideProfile.avatarURL ? (
                <img
                  src={guideProfile.avatarURL}
                  alt={guideProfile.username}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: isMobile ? '48px' : '60px',
                  color: '#666'
                }}>
                  👤
                </div>
              )}
            </div>

            {/* Guide Info */}
            <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <h1 style={{
                  margin: 0,
                  fontSize: isMobile ? '24px' : '32px',
                  fontWeight: '700',
                  color: '#333'
                }}>
                  {guideProfile.firstName && guideProfile.lastName 
                    ? `${guideProfile.firstName} ${guideProfile.lastName}`
                    : guideProfile.name || guideProfile.displayName || guideProfile.username
                  }
                </h1>
                {guideProfile.verified && (
                  <FaCheckCircle size={20} color="#4caf50" title="Verified Guide" />
                )}
              </div>

              <div style={{
                fontSize: '16px',
                color: '#666',
                marginBottom: '16px'
              }}>
                Guide
              </div>

              {/* Rating and Stats */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'center' : 'flex-start',
                gap: isMobile ? '12px' : '24px',
                marginBottom: '20px'
              }}>
                {overallRating > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar
                          key={star}
                          size={16}
                          color={star <= Math.round(overallRating) ? '#ffc107' : '#e0e0e0'}
                        />
                      ))}
                    </div>
                    <span style={{ fontWeight: '600', color: '#333' }}>
                      {overallRating.toFixed(1)}
                    </span>
                    <span style={{ color: '#666' }}>
                      ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#666'
                }}>
                  <FaCalendarAlt size={14} />
                  <span>Guide since {formatJoinDate(guideProfile.joinedDate!)}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '8px' : '24px',
                alignItems: isMobile ? 'center' : 'flex-start'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  <FaUsers size={14} />
                  <span>{guideProfile.totalBookings || 0} bookings</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  <FaClock size={14} />
                  <span>Responds {guideProfile.responseTime}</span>
                </div>

                {guideProfile.location && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    <FaMapPin size={14} />
                    <span>{guideProfile.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e0e0e0'
          }}>
            {(['about', 'tours', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  backgroundColor: activeTab === tab ? '#f8f9fa' : 'transparent',
                  borderBottom: activeTab === tab ? '3px solid #134369' : '3px solid transparent',
                  color: activeTab === tab ? '#134369' : '#666',
                  fontWeight: activeTab === tab ? '600' : '400',
                  fontSize: '16px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: isMobile ? '24px' : '32px' }}>
            {activeTab === 'about' && (
              <div>
                {/* Bio */}
                {guideProfile.bio && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      About {guideProfile.firstName || guideProfile.username}
                    </h3>
                    <p style={{
                      margin: 0,
                      lineHeight: '1.6',
                      color: '#666',
                      fontSize: '16px'
                    }}>
                      {guideProfile.bio}
                    </p>
                  </div>
                )}

                {/* Languages */}
                {guideProfile.languages && guideProfile.languages.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      Languages
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      {guideProfile.languages.map((language, index) => (
                        <span
                          key={index}
                          style={{
                            background: '#e3f2fd',
                            color: '#1976d2',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          {language}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specialties */}
                {guideProfile.specialties && guideProfile.specialties.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      Specialties
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      {guideProfile.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          style={{
                            background: '#f3e5f5',
                            color: '#7b1fa2',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {guideProfile.experience && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      Experience
                    </h3>
                    <p style={{
                      margin: 0,
                      lineHeight: '1.6',
                      color: '#666',
                      fontSize: '16px'
                    }}>
                      {guideProfile.experience}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tours' && (
              <div>
                <h3 style={{
                  margin: '0 0 24px 0',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Tours by {guideProfile.firstName || guideProfile.username}
                </h3>

                {guidedTours.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#666'
                  }}>
                    No tours available yet
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {guidedTours.map((tour) => (
                      <div
                        key={tour.id}
                        onClick={() => handleTourClick(tour)}
                        style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: 'white'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Tour Image */}
                        <div style={{
                          height: '200px',
                          backgroundColor: '#f0f0f0',
                          backgroundImage: tour.images && tour.images[0] ? `url(${tour.images[0]})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {(!tour.images || tour.images.length === 0) && (
                            <div style={{ fontSize: '48px', color: '#ccc' }}>🗺️</div>
                          )}
                        </div>

                        {/* Tour Info */}
                        <div style={{ padding: '16px' }}>
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#333'
                          }}>
                            {tour.name}
                          </h4>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#666',
                              fontSize: '14px'
                            }}>
                              <FaClock size={12} />
                              <span>{tour.duration}min</span>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#666',
                              fontSize: '14px'
                            }}>
                              <FaUsers size={12} />
                              <span>Max {tour.maxGroupSize}</span>
                            </div>
                          </div>

                          {tour.ratingStats && tour.ratingStats.ratingCount > 0 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <FaStar
                                    key={star}
                                    size={12}
                                    color={star <= Math.round(tour.ratingStats!.averageRating) ? '#ffc107' : '#e0e0e0'}
                                  />
                                ))}
                              </div>
                              <span style={{
                                fontSize: '14px',
                                color: '#666'
                              }}>
                                {tour.ratingStats.averageRating.toFixed(1)} ({tour.ratingStats.ratingCount})
                              </span>
                            </div>
                          )}

                          <div style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#134369'
                          }}>
                            ${tour.basePrice}/person
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <GuideReviewsSection 
                guideId={guideId!} 
                showTitle={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideProfileView;
