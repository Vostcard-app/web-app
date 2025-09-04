import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaStar, FaArrowLeft, FaCheck, FaSpinner, FaExclamationTriangle, FaCamera } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import ReviewService from '../services/reviewService';
import { CreateReviewRequest } from '../types/ReviewTypes';

const ReviewGuideView: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  
  // Category ratings
  const [categoryRatings, setCategoryRatings] = useState({
    communication: 0,
    knowledge: 0,
    punctuality: 0,
    friendliness: 0,
    overall: 0
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tourInfo, setTourInfo] = useState<any>(null);

  useEffect(() => {
    checkReviewEligibility();
  }, [bookingId, user]);

  const checkReviewEligibility = async () => {
    if (!bookingId || !user) return;

    try {
      setIsLoading(true);
      const eligible = await ReviewService.canTravelerReview(bookingId, user.uid);
      setCanReview(eligible);
      
      if (!eligible) {
        setError('This tour has not been confirmed by the guide yet, or you are not authorized to review this booking.');
      }
      
      // TODO: Fetch tour info for display
      // const tourData = await getTourInfoFromBooking(bookingId);
      // setTourInfo(tourData);
      
    } catch (err: any) {
      setError(err.message || 'Failed to verify review eligibility');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
    // Auto-set overall rating when main rating changes
    setCategoryRatings(prev => ({ ...prev, overall: starRating }));
  };

  const handleCategoryRating = (category: keyof typeof categoryRatings, value: number) => {
    setCategoryRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    if (!bookingId || !user) return;

    // Validation
    if (rating === 0) {
      setError('Please select an overall rating');
      return;
    }

    if (title.trim().length < 5) {
      setError('Please provide a title (at least 5 characters)');
      return;
    }

    if (comment.trim().length < 20) {
      setError('Please provide a detailed review (at least 20 characters)');
      return;
    }

    // Check that all category ratings are set
    const unratedCategories = Object.entries(categoryRatings).filter(([_, value]) => value === 0);
    if (unratedCategories.length > 0) {
      setError('Please rate all categories');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const reviewRequest: CreateReviewRequest = {
        bookingId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        ratings: categoryRatings,
        wouldRecommend
      };

      await ReviewService.createReview(reviewRequest, user.uid);
      
      // Success - redirect to confirmation
      navigate('/review-submitted', { 
        state: { 
          message: 'Thank you for your review! It helps other travelers and supports our guide community.' 
        }
      });
      
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, onStarClick: (rating: number) => void, size: number = 24) => {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onStarClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            <FaStar
              size={size}
              color={star <= (hoverRating || currentRating) ? '#ffc107' : '#e0e0e0'}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderCategoryRating = (category: keyof typeof categoryRatings, label: string) => (
    <div key={category} style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
        {label}
      </span>
      {renderStars(categoryRatings[category], (value) => handleCategoryRating(category, value), 20)}
    </div>
  );

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <FaSpinner className="fa-spin" size={32} color="#134369" />
          <p style={{ marginTop: '16px', color: '#666' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <FaExclamationTriangle size={48} color="#f39c12" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#333', marginBottom: '16px' }}>Review Not Available</h2>
          <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#134369',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '700px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <FaArrowLeft size={16} color="#134369" />
          </button>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            color: '#134369'
          }}>
            Review Your Experience
          </h1>
        </div>

        {/* Main Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Overall Rating */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '12px'
            }}>
              Overall Rating *
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '8px'
            }}>
              {renderStars(rating, handleStarClick, 32)}
              <span style={{ fontSize: '16px', color: '#666' }}>
                {rating > 0 && (
                  rating === 5 ? 'Excellent!' :
                  rating === 4 ? 'Very Good' :
                  rating === 3 ? 'Good' :
                  rating === 2 ? 'Fair' : 'Poor'
                )}
              </span>
            </div>
          </div>

          {/* Review Title */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Review Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience in a few words..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              maxLength={100}
            />
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'right',
              marginTop: '4px'
            }}>
              {title.length}/100 characters
            </div>
          </div>

          {/* Detailed Review */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Detailed Review *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your experience. What did you enjoy? What could be improved?"
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              maxLength={1000}
            />
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'right',
              marginTop: '4px'
            }}>
              {comment.length}/1000 characters
            </div>
          </div>

          {/* Category Ratings */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '16px'
            }}>
              Rate Different Aspects *
            </h3>
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '16px'
            }}>
              {renderCategoryRating('communication', 'Communication')}
              {renderCategoryRating('knowledge', 'Knowledge & Expertise')}
              {renderCategoryRating('punctuality', 'Punctuality')}
              {renderCategoryRating('friendliness', 'Friendliness')}
              {renderCategoryRating('overall', 'Overall Experience')}
            </div>
          </div>

          {/* Recommendation */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '16px'
            }}>
              Would you recommend this guide?
            </h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '12px 16px',
                border: `2px solid ${wouldRecommend ? '#134369' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: wouldRecommend ? '#e8f4fd' : 'white'
              }}>
                <input
                  type="radio"
                  checked={wouldRecommend}
                  onChange={() => setWouldRecommend(true)}
                  style={{ margin: 0 }}
                />
                <span style={{ fontWeight: '500' }}>Yes, I recommend</span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '12px 16px',
                border: `2px solid ${!wouldRecommend ? '#dc3545' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: !wouldRecommend ? '#ffeaea' : 'white'
              }}>
                <input
                  type="radio"
                  checked={!wouldRecommend}
                  onChange={() => setWouldRecommend(false)}
                  style={{ margin: 0 }}
                />
                <span style={{ fontWeight: '500' }}>No, I don't recommend</span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#134369',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.8 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="fa-spin" />
                Submitting Review...
              </>
            ) : (
              <>
                <FaCheck />
                Submit Review
              </>
            )}
          </button>
        </div>

        {/* Footer Note */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          Your review will be public and help other travelers make informed decisions. 
          Reviews are moderated to ensure quality and authenticity.
        </div>
      </div>
    </div>
  );
};

export default ReviewGuideView;
