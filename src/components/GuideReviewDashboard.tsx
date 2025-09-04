import React, { useState, useEffect } from 'react';
import { 
  FaCheck, 
  FaClock, 
  FaStar, 
  FaEye, 
  FaCalendarAlt, 
  FaUser,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import ReviewService from '../services/reviewService';
import TourConfirmationModal from './TourConfirmationModal';
import { TourCompletion, GuideReview, ReviewStats } from '../types/ReviewTypes';

const GuideReviewDashboard: React.FC = () => {
  const { user } = useAuth();
  const [pendingCompletions, setPendingCompletions] = useState<TourCompletion[]>([]);
  const [recentReviews, setRecentReviews] = useState<GuideReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompletion, setSelectedCompletion] = useState<TourCompletion | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load all dashboard data in parallel
      const [completions, reviews, stats] = await Promise.all([
        loadPendingCompletions(),
        ReviewService.getGuideReviews(user.uid, 5),
        ReviewService.getGuideReviewStats(user.uid)
      ]);

      setPendingCompletions(completions);
      setRecentReviews(reviews);
      setReviewStats(stats);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingCompletions = async (): Promise<TourCompletion[]> => {
    // This would typically be a service method
    // For now, return mock data
    return [
      {
        id: '1',
        bookingId: 'booking_123',
        guideId: user!.uid,
        travelerId: 'traveler_456',
        tourId: 'tour_789',
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'completed',
        reviewRemindersSent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  };

  const handleConfirmTour = (completion: TourCompletion) => {
    setSelectedCompletion(completion);
    setShowConfirmationModal(true);
  };

  const handleConfirmationSuccess = () => {
    // Reload data after successful confirmation
    loadDashboardData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            size={size}
            color={star <= rating ? '#ffc107' : '#e0e0e0'}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <div>
          <FaSpinner className="fa-spin" size={32} color="#134369" />
          <p style={{ marginTop: '16px', color: '#666' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#134369',
          marginBottom: '8px'
        }}>
          Review Management
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Manage tour confirmations and view your reviews
        </p>
      </div>

      {/* Stats Overview */}
      {reviewStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#134369',
              marginBottom: '8px'
            }}>
              {reviewStats.averageRating.toFixed(1)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              {renderStars(Math.round(reviewStats.averageRating), 20)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Average Rating
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#134369',
              marginBottom: '16px'
            }}>
              {reviewStats.totalReviews}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Total Reviews
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#28a745',
              marginBottom: '16px'
            }}>
              {Math.round((reviewStats.ratingBreakdown[5] + reviewStats.ratingBreakdown[4]) / reviewStats.totalReviews * 100)}%
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Positive Reviews
            </div>
          </div>
        </div>
      )}

      {/* Pending Tour Confirmations */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaClock color="#f39c12" />
          Pending Tour Confirmations
          {pendingCompletions.length > 0 && (
            <span style={{
              backgroundColor: '#f39c12',
              color: 'white',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: '600'
            }}>
              {pendingCompletions.length}
            </span>
          )}
        </h2>

        {pendingCompletions.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <FaCheckCircle size={48} color="#28a745" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#333', marginBottom: '8px' }}>All caught up!</h3>
            <p style={{ color: '#666' }}>No pending tour confirmations at the moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingCompletions.map((completion) => (
              <div
                key={completion.id}
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <FaExclamationTriangle color="#f39c12" size={16} />
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#f39c12'
                      }}>
                        Awaiting Confirmation
                      </span>
                    </div>
                    
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px'
                    }}>
                      Tour Booking #{completion.bookingId.slice(-8)}
                    </h4>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaCalendarAlt size={12} />
                        Completed: {formatDate(completion.completedAt)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaUser size={12} />
                        Traveler ID: {completion.travelerId.slice(-8)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleConfirmTour(completion)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#134369',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FaCheck size={14} />
                    Confirm Tour
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reviews */}
      <div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaStar color="#ffc107" />
          Recent Reviews
        </h2>

        {recentReviews.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <FaStar size={48} color="#e0e0e0" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#333', marginBottom: '8px' }}>No reviews yet</h3>
            <p style={{ color: '#666' }}>
              Complete tours and confirm them to start receiving reviews from travelers.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentReviews.map((review) => (
              <div
                key={review.id}
                style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {renderStars(review.rating, 18)}
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px'
                    }}>
                      {review.title}
                    </h4>
                  </div>
                  
                  {review.wouldRecommend && (
                    <div style={{
                      backgroundColor: '#e8f5e8',
                      color: '#28a745',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      Recommended
                    </div>
                  )}
                </div>

                <p style={{
                  color: '#666',
                  lineHeight: '1.5',
                  marginBottom: '12px'
                }}>
                  {review.comment}
                </p>

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '12px',
                  color: '#888'
                }}>
                  <span>Communication: {review.ratings.communication}/5</span>
                  <span>Knowledge: {review.ratings.knowledge}/5</span>
                  <span>Punctuality: {review.ratings.punctuality}/5</span>
                  <span>Friendliness: {review.ratings.friendliness}/5</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedCompletion && (
        <TourConfirmationModal
          isVisible={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setSelectedCompletion(null);
          }}
          completionId={selectedCompletion.id}
          tourName={`Tour #${selectedCompletion.tourId.slice(-8)}`}
          travelerName={`Traveler #${selectedCompletion.travelerId.slice(-8)}`}
          tourDate={formatDate(selectedCompletion.completedAt)}
          onConfirmationSuccess={handleConfirmationSuccess}
        />
      )}
    </div>
  );
};

export default GuideReviewDashboard;
