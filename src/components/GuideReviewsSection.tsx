import React, { useState, useEffect } from 'react';
import { 
  FaStar, 
  FaThumbsUp, 
  FaUser, 
  FaCalendarAlt,
  FaSpinner,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle
} from 'react-icons/fa';
import ReviewService from '../services/reviewService';
import { GuideReview, ReviewStats } from '../types/ReviewTypes';

interface GuideReviewsSectionProps {
  guideId: string;
  showTitle?: boolean;
}

const GuideReviewsSection: React.FC<GuideReviewsSectionProps> = ({ 
  guideId, 
  showTitle = true 
}) => {
  const [reviews, setReviews] = useState<GuideReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReviews();
  }, [guideId]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const [reviewsData, statsData] = await Promise.all([
        ReviewService.getGuideReviews(guideId, showAllReviews ? 50 : 5),
        ReviewService.getGuideReviewStats(guideId)
      ]);
      
      setReviews(reviewsData);
      setReviewStats(statsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReviewExpansion = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const renderRatingBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px'
      }}>
        <span style={{ minWidth: '20px' }}>{rating}</span>
        <FaStar size={12} color="#ffc107" />
        <div style={{
          flex: 1,
          height: '8px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: '#ffc107',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ minWidth: '30px', color: '#666' }}>{count}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div>
          <FaSpinner className="fa-spin" size={24} color="#134369" />
          <p style={{ marginTop: '12px', color: '#666' }}>Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (!reviewStats || reviewStats.totalReviews === 0) {
    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '40px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <FaStar size={48} color="#e0e0e0" style={{ marginBottom: '16px' }} />
        <h3 style={{ color: '#333', marginBottom: '8px' }}>No Reviews Yet</h3>
        <p style={{ color: '#666' }}>
          This guide hasn't received any reviews yet. Be the first to book a tour and share your experience!
        </p>
      </div>
    );
  }

  return (
    <div>
      {showTitle && (
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#134369',
          marginBottom: '24px'
        }}>
          Reviews & Ratings
        </h2>
      )}

      {/* Rating Summary */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '24px',
          alignItems: 'center'
        }}>
          {/* Overall Rating */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#134369',
              lineHeight: 1
            }}>
              {reviewStats.averageRating.toFixed(1)}
            </div>
            <div style={{ margin: '8px 0' }}>
              {renderStars(Math.round(reviewStats.averageRating), 20)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Rating Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[5, 4, 3, 2, 1].map((rating) => 
              renderRatingBar(
                rating, 
                reviewStats.ratingBreakdown[rating as keyof typeof reviewStats.ratingBreakdown], 
                reviewStats.totalReviews
              )
            )}
          </div>
        </div>

        {/* Category Averages */}
        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '16px'
          }}>
            Category Ratings
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {Object.entries(reviewStats.categoryAverages).map(([category, average]) => (
              <div key={category} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#666',
                  textTransform: 'capitalize'
                }}>
                  {category}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {renderStars(Math.round(average), 14)}
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    {average.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#333'
          }}>
            Recent Reviews
          </h3>
          
          {reviewStats.totalReviews > 5 && (
            <button
              onClick={() => {
                setShowAllReviews(!showAllReviews);
                if (!showAllReviews) {
                  loadReviews();
                }
              }}
              style={{
                background: 'none',
                border: '1px solid #134369',
                color: '#134369',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {showAllReviews ? (
                <>
                  <FaChevronUp size={12} />
                  Show Less
                </>
              ) : (
                <>
                  <FaChevronDown size={12} />
                  Show All Reviews
                </>
              )}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map((review) => {
            const isExpanded = expandedReviews.has(review.id);
            const shouldTruncate = review.comment.length > 200;
            
            return (
              <div
                key={review.id}
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0'
                }}
              >
                {/* Review Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      {renderStars(review.rating, 16)}
                      {review.isVerified && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#e8f5e8',
                          color: '#28a745',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          <FaCheckCircle size={10} />
                          Verified
                        </div>
                      )}
                    </div>
                    
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '4px'
                    }}>
                      {review.title}
                    </h4>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaUser size={10} />
                        Anonymous Traveler
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaCalendarAlt size={10} />
                        {formatDate(review.createdAt)}
                      </div>
                    </div>
                  </div>

                  {review.wouldRecommend && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#e8f5e8',
                      color: '#28a745',
                      padding: '6px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      <FaThumbsUp size={12} />
                      Recommended
                    </div>
                  )}
                </div>

                {/* Review Content */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{
                    color: '#666',
                    lineHeight: '1.6',
                    margin: 0
                  }}>
                    {shouldTruncate && !isExpanded 
                      ? `${review.comment.substring(0, 200)}...`
                      : review.comment
                    }
                  </p>
                  
                  {shouldTruncate && (
                    <button
                      onClick={() => toggleReviewExpansion(review.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#134369',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '8px',
                        padding: 0
                      }}
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>

                {/* Category Ratings */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  {Object.entries(review.ratings).map(([category, rating]) => (
                    <div key={category} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#666',
                        textTransform: 'capitalize',
                        textAlign: 'center'
                      }}>
                        {category}
                      </span>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        {rating}/5
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GuideReviewsSection;
