import React, { useState, useEffect } from 'react';
import { FaTimes, FaStar, FaUser, FaEdit, FaTrash, FaSave, FaUndo } from 'react-icons/fa';
import { ReviewService, type Review } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');
  const [editHoveredStar, setEditHoveredStar] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleEditStart = (review: Review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditHoveredStar(0);
  };

  const handleEditCancel = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment('');
    setEditHoveredStar(0);
  };

  const handleEditSave = async (reviewId: string) => {
    if (editRating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!editComment.trim()) {
      alert('Please enter a comment');
      return;
    }

    setUpdating(true);
    try {
      await ReviewService.updateReview(tourId, reviewId, editRating, editComment);
      
      // Update the local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, rating: editRating, comment: editComment, updatedAt: new Date().toISOString() }
          : review
      ));
      
      handleEditCancel();
      console.log('✅ Review updated successfully');
    } catch (error) {
      console.error('❌ Error updating review:', error);
      alert('Failed to update review. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    setDeleting(reviewId);
    try {
      await ReviewService.deleteReview(tourId, reviewId);
      
      // Remove from local state
      setReviews(prev => prev.filter(review => review.id !== reviewId));
      
      console.log('✅ Review deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleEditStarClick = (rating: number) => {
    setEditRating(rating);
  };

  const handleEditStarHover = (rating: number) => {
    setEditHoveredStar(rating);
  };

  const handleEditStarLeave = () => {
    setEditHoveredStar(0);
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
              {reviews.map((review) => {
                const isCurrentUserReview = user?.uid === review.userId;
                const isEditing = editingReviewId === review.id;
                
                return (
                  <div
                    key={review.id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: isCurrentUserReview ? '#f8f9ff' : '#fafafa'
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
                            {isCurrentUserReview && (
                              <span style={{
                                fontSize: '10px',
                                color: '#666',
                                fontWeight: 'normal',
                                marginLeft: '6px'
                              }}>
                                (You)
                              </span>
                            )}
                          </h4>
                          
                          {/* Star Rating */}
                          {!isEditing && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  size={12}
                                  color={star <= review.rating ? '#ffc107' : '#e0e0e0'}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#999'
                        }}>
                          {formatDate(review.createdAt)}
                          {review.updatedAt !== review.createdAt && (
                            <span style={{ fontStyle: 'italic' }}> • edited</span>
                          )}
                        </p>
                      </div>

                      {/* Edit/Delete Buttons */}
                      {isCurrentUserReview && !isEditing && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEditStart(review)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#666',
                              transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#002B4D'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(review.id)}
                            disabled={deleting === review.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: deleting === review.id ? 'not-allowed' : 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: deleting === review.id ? '#ccc' : '#666',
                              transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (deleting !== review.id) {
                                e.currentTarget.style.color = '#dc3545';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (deleting !== review.id) {
                                e.currentTarget.style.color = '#666';
                              }
                            }}
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit Form */}
                    {isEditing ? (
                      <div style={{ marginTop: '12px' }}>
                        {/* Edit Star Rating */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <span style={{ fontSize: '12px', color: '#666' }}>Rating:</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isActive = star <= (editHoveredStar || editRating);
                              return (
                                <button
                                  key={star}
                                  onClick={() => handleEditStarClick(star)}
                                  onMouseEnter={() => handleEditStarHover(star)}
                                  onMouseLeave={handleEditStarLeave}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <FaStar
                                    size={16}
                                    color={isActive ? '#ffc107' : '#e0e0e0'}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Edit Comment */}
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          placeholder="Edit your review..."
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            marginBottom: '12px'
                          }}
                        />

                        {/* Edit Buttons */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleEditCancel}
                            disabled={updating}
                            style={{
                              background: '#f5f5f5',
                              color: '#666',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: updating ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FaUndo size={10} />
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditSave(review.id)}
                            disabled={updating || editRating === 0 || !editComment.trim()}
                            style={{
                              background: updating || editRating === 0 || !editComment.trim() ? '#ccc' : '#002B4D',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: updating || editRating === 0 || !editComment.trim() ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FaSave size={10} />
                            {updating ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Review Comment */
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        lineHeight: '1.4',
                        color: '#333'
                      }}>
                        {review.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReviewsModal; 