import React, { useEffect, useState } from 'react';
import { FaMapPin, FaEye, FaEyeSlash, FaEdit, FaTrash, FaShare, FaLink, FaUser, FaStar, FaComment } from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { RatingService, type RatingStats } from '../services/ratingService';
import { ReviewService } from '../services/reviewService';
import ReviewsModal from './ReviewsModal';
import type { Tour } from '../types/TourTypes';

interface TourWithCreator extends Tour {
  creatorUsername?: string;
  creatorAvatar?: string;
  creatorRole?: string;
  ratingStats?: RatingStats;
  reviewCount?: number;
}

interface TourListProps {
  tours: Tour[];
  isCurrentUser: boolean;
  onTourClick: (tour: Tour) => void | Promise<void>;
  onEditTour?: (tour: Tour) => void;
  onDeleteTour?: (tour: Tour) => void;
  onToggleSharing?: (tour: Tour) => void;
  userRole?: string;
}

const TourList: React.FC<TourListProps> = ({
  tours,
  isCurrentUser,
  onTourClick,
  onEditTour,
  onDeleteTour,
  onToggleSharing,
  userRole,
}) => {
  const [toursWithCreators, setToursWithCreators] = useState<TourWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourWithCreator | null>(null);

  const getTourTerminology = (creatorRole?: string) => {
    return (creatorRole || userRole) === 'guide' ? 'Tour' : 'Trip';
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

  // Fetch creator information and rating stats for each tour
  useEffect(() => {
    const fetchCreatorInfo = async () => {
      setLoading(true);
      const toursWithCreatorInfo: TourWithCreator[] = [];

      for (const tour of tours) {
        try {
          // Fetch creator info
          const creatorDoc = await getDoc(doc(db, 'users', tour.creatorId));
          const creatorData = creatorDoc.exists() ? creatorDoc.data() : null;

          // Fetch rating stats
          const ratingStats = await RatingService.getTourRatingStats(tour.id);

          // Fetch review count
          const reviewCount = await getTourReviewCount(tour.id);

          const tourWithCreator: TourWithCreator = {
            ...tour,
            creatorUsername: creatorData?.username || 'Unknown User',
            creatorAvatar: creatorData?.avatarURL,
            creatorRole: creatorData?.userRole,
            ratingStats,
            reviewCount,
          };

          toursWithCreatorInfo.push(tourWithCreator);
        } catch (error) {
          console.error('Error fetching creator info or ratings:', error);
          // Add tour without creator info as fallback
          toursWithCreatorInfo.push({
            ...tour,
            creatorUsername: 'Unknown User',
            ratingStats: {
              averageRating: 0,
              ratingCount: 0,
              lastUpdated: new Date().toISOString()
            },
            reviewCount: 0
          });
        }
      }

      setToursWithCreators(toursWithCreatorInfo);
      setLoading(false);
    };

    if (tours.length > 0) {
      fetchCreatorInfo();
    } else {
      setToursWithCreators([]);
      setLoading(false);
    }
  }, [tours]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading tours...
      </div>
    );
  }

  if (toursWithCreators.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#666',
        fontStyle: 'italic'
      }}>
        {isCurrentUser ? `No ${getTourTerminology().toLowerCase()}s created yet` : `No ${getTourTerminology().toLowerCase()}s available`}
      </div>
    );
  }

  // Debug logging to help identify the issue
  console.log('🔍 TourList Debug:', {
    isCurrentUser,
    hasOnEditTour: !!onEditTour,
    hasOnDeleteTour: !!onDeleteTour,
    hasOnToggleSharing: !!onToggleSharing,
    tourCount: toursWithCreators.length
  });

  return (
    <>
      <div style={{
        marginBottom: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#333'
      }}>
        {toursWithCreators.length} tour{toursWithCreators.length !== 1 ? 's' : ''} found
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {toursWithCreators.map((tour) => {
          // Explicit check - only show management icons if ALL conditions are met
          const showManagementIcons = isCurrentUser && (onEditTour || onDeleteTour || onToggleSharing);
          
          console.log(`🔍 Tour "${tour.name}" - showManagementIcons:`, showManagementIcons, {
            isCurrentUser,
            hasHandlers: !!(onEditTour || onDeleteTour || onToggleSharing)
          });

          return (
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
              onClick={() => onTourClick(tour)}
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
                {/* Creator Avatar */}
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
                    {!tour.isPublic && (
                      <FaEyeSlash style={{ 
                        color: '#666', 
                        fontSize: '14px', 
                        marginLeft: '8px' 
                      }} title="Private tour" />
                    )}
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
                    {tour.isShareable && tour.shareableUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(tour.shareableUrl!);
                          alert('Shareable link copied to clipboard!');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007aff',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '500'
                        }}
                        title="Copy shareable link"
                      >
                        <FaShare size={10} />
                        Copy Link
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Action buttons - ONLY show for current user AND when handlers are provided */}
                {showManagementIcons && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px',
                    marginLeft: '12px'
                  }}>
                    {onToggleSharing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSharing(tour);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: tour.isPublic ? '#28a745' : '#666',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title={tour.isPublic ? 'Make private' : 'Make public'}
                      >
                        {tour.isPublic ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
                      </button>
                    )}
                    {onEditTour && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTour(tour);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007aff',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Edit tour"
                      >
                        <FaEdit size={14} />
                      </button>
                    )}
                    {onDeleteTour && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete "${tour.name}"?`)) {
                            onDeleteTour(tour);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Delete tour"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
    </>
  );
};

export default TourList; 