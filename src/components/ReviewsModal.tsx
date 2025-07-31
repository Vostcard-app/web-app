import React, { useState, useEffect } from 'react';
import { FaTimes, FaStar, FaUser } from 'react-icons/fa';
import { ReviewService, type Review } from '../services/reviewService';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourName: string;
}

const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  tourId,
  tourName
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tourId) {
      fetchReviews();
    }
  }, [isOpen, tourId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const tourReviews = await ReviewService.getTourReviews(tourId);
      setReviews(tourReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'hidden',
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <div>
            <h2 style={{
              margin: '0 0 4px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#002B4D'
            }}>
              Reviews
            </h2>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#666'
            }}>
              {tourName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaTimes size={20} color="#666" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          maxHeight: '60vh',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: '#666'
            }}>
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666'
            }}>
              <FaStar size={48} color="#e0e0e0" style={{ marginBottom: '16px' }} />
              <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>
                No reviews yet
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Be the first to share your experience!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  {/* Review Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    {/* User Avatar */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {review.userAvatar ? (
                        <img
                          src={review.userAvatar}
                          alt={review.username}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <FaUser size={20} color="#666" />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#333'
                        }}>
                          {review.username}
                        </h4>
                        
                        {/* Star Rating */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar
                              key={star}
                              size={12}
                              color={star <= review.rating ? '#ffc107' : '#e0e0e0'}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#999'
                      }}>
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Review Comment */}
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: '1.4',
                    color: '#333'
                  }}>
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReviewsModal; 