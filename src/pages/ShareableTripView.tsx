import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaShare, FaMapPin, FaUser } from 'react-icons/fa';
import { TourService } from '../services/tourService';
import type { Tour, TourPost } from '../types/TourTypes';

const ShareableTripView: React.FC = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [tourPosts, setTourPosts] = useState<TourPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);

  useEffect(() => {
    const loadTour = async () => {
      if (!tourId) return;

      try {
        setLoading(true);
        setError(null);

        const tourData = await TourService.getTour(tourId);

        if (!tourData) {
          setError('Trip not found');
          return;
        }

        // Check if tour is shareable
        if (!tourData.isShareable) {
          setError('This trip is not publicly shareable');
          return;
        }

        setTour(tourData);

        // Load tour posts
        const posts = await TourService.getTourPosts(tourData);
        setTourPosts(posts);

      } catch (error) {
        console.error('Error loading tour:', error);
        setError('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    loadTour();
  }, [tourId]);

  const handleNextPost = () => {
    if (currentPostIndex < tourPosts.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
    }
  };

  const handlePreviousPost = () => {
    if (currentPostIndex > 0) {
      setCurrentPostIndex(currentPostIndex - 1);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tour?.name || 'Check out this trip!',
          text: tour?.description || 'A curated collection of posts',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading trip...</p>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <p style={{ color: '#d32f2f' }}>{error || 'Trip not found'}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  const currentPost = tourPosts[currentPostIndex];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        padding: '24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <FaArrowLeft />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              {tour.name}
            </h1>
            {tour.description && (
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                {tour.description}
              </p>
            )}
          </div>
          <button
            onClick={handleShare}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <FaShare />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          fontSize: '14px'
        }}>
          <span>{currentPostIndex + 1} of {tourPosts.length}</span>
          <div style={{ 
            flex: 1, 
            height: '4px', 
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${((currentPostIndex + 1) / tourPosts.length) * 100}%`,
              height: '100%',
              backgroundColor: 'white',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Post Content */}
      {currentPost && (
        <div style={{ padding: '24px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}>
            {/* Post Image/Video */}
            {currentPost.photoURLs && currentPost.photoURLs.length > 0 && (
              <div style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: '#f0f0f0',
                position: 'relative',
              }}>
                <img
                  src={currentPost.photoURLs[0]}
                  alt={currentPost.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {currentPost.videoURL && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}>
                    📹 Video
                  </div>
                )}
              </div>
            )}

            {/* Post Content */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
                  {currentPost.title || 'Untitled'}
                </h2>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  padding: '4px 8px',
                  backgroundColor: currentPost.isQuickcard ? '#e3f2fd' : '#f3e5f5',
                  borderRadius: '12px',
                }}>
                  {currentPost.isQuickcard ? '📸 Quickcard' : '📹 Vostcard'}
                </span>
              </div>

              {currentPost.description && (
                <p style={{ 
                  margin: '0 0 16px 0', 
                  color: '#333', 
                  fontSize: '16px',
                  lineHeight: '1.6'
                }}>
                  {currentPost.description}
                </p>
              )}

              {/* Post Meta */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                fontSize: '14px',
                color: '#666',
                marginBottom: '20px'
              }}>
                {currentPost.username && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaUser size={12} />
                    <span>{currentPost.username}</span>
                  </div>
                )}
                {currentPost.createdAt && (
                  <span>{currentPost.createdAt.toLocaleDateString()}</span>
                )}
                {currentPost.latitude && currentPost.longitude && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaMapPin size={12} />
                    <span>Has location</span>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={handlePreviousPost}
                  disabled={currentPostIndex === 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: currentPostIndex === 0 ? '#f5f5f5' : 'white',
                    color: currentPostIndex === 0 ? '#999' : '#333',
                    cursor: currentPostIndex === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={handleNextPost}
                  disabled={currentPostIndex === tourPosts.length - 1}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: currentPostIndex === tourPosts.length - 1 ? '#f5f5f5' : 'white',
                    color: currentPostIndex === tourPosts.length - 1 ? '#999' : '#333',
                    cursor: currentPostIndex === tourPosts.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Navigation */}
      {tourPosts.length > 1 && (
        <div style={{ 
          padding: '0 24px 24px 24px',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: 'white'
        }}>
          <h3 style={{ 
            margin: '16px 0', 
            fontSize: '16px', 
            fontWeight: '500',
            color: '#333'
          }}>
            All Posts ({tourPosts.length})
          </h3>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto',
            paddingBottom: '8px'
          }}>
            {tourPosts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => setCurrentPostIndex(index)}
                style={{
                  flexShrink: 0,
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: index === currentPostIndex ? '2px solid #007aff' : '1px solid #e0e0e0',
                  opacity: index === currentPostIndex ? 1 : 0.7,
                  transition: 'all 0.2s ease',
                }}
              >
                {post.photoURLs && post.photoURLs.length > 0 ? (
                  <img
                    src={post.photoURLs[0]}
                    alt={post.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0',
                    color: '#999',
                    fontSize: '20px',
                  }}>
                    📷
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareableTripView; 