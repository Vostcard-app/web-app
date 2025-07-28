import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaMinus, FaList, FaTh } from 'react-icons/fa';
import { TourService } from '../services/tourService';
import type { Tour, UpdateTourData } from '../types/TourTypes';

interface TourEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTourUpdated: () => void;
  tour: Tour;
  userPosts: any[]; // We'll need to fetch user's posts
  userRole?: string;
}

const TourEditModal: React.FC<TourEditModalProps> = ({
  isOpen,
  onClose,
  onTourUpdated,
  tour,
  userPosts,
  userRole,
}) => {
  const getTourTerminology = () => {
    return userRole === 'guide' ? 'Tour' : 'Trip';
  };
  
  const [tourName, setTourName] = useState('');
  const [tourDescription, setTourDescription] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Pre-populate form with existing tour data
  useEffect(() => {
    if (isOpen && tour) {
      setTourName(tour.name);
      setTourDescription(tour.description || '');
      setSelectedPostIds([...tour.postIds]);
      setIsPublic(tour.isPublic);
      setError(null);
    }
  }, [isOpen, tour]);

  const handlePostToggle = (postId: string) => {
    if (selectedPostIds.includes(postId)) {
      const newSelection = selectedPostIds.filter(id => id !== postId);
      setSelectedPostIds(newSelection);
    } else {
      const newSelection = [...selectedPostIds, postId];
      setSelectedPostIds(newSelection);
    }
  };

  const handleUpdateTour = async () => {
    if (!tourName.trim()) {
      setError('Please enter a tour name');
      return;
    }

    if (selectedPostIds.length === 0) {
      setError('Please select at least one post for your tour');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const updateData: UpdateTourData = {
        name: tourName.trim(),
        description: tourDescription.trim(),
        postIds: selectedPostIds,
        isPublic,
      };

      await TourService.updateTour(tour.id, updateData);

      onTourUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating tour:', error);
      setError('Failed to update tour. Please try again.');
    } finally {
      setIsUpdating(false);
    }
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
          zIndex: 2000,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          height: '80vh',
          backgroundColor: 'white',
          borderRadius: '12px',
          zIndex: 2001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Edit {getTourTerminology()}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#666'
            }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto'
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #ffcdd2'
            }}>
              {error}
            </div>
          )}

          {/* Tour Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333'
            }}>
              {getTourTerminology()} Name *
            </label>
            <input
              type="text"
              value={tourName}
              onChange={(e) => setTourName(e.target.value)}
              placeholder={`Enter ${getTourTerminology().toLowerCase()} name`}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Tour Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333'
            }}>
              Description (optional)
            </label>
            <textarea
              value={tourDescription}
              onChange={(e) => setTourDescription(e.target.value)}
              placeholder={`Describe your ${getTourTerminology().toLowerCase()}`}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Public/Private Toggle */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500', color: '#333' }}>
                Make this {getTourTerminology().toLowerCase()} public
              </span>
            </label>
            <p style={{
              margin: '4px 0 0 24px',
              fontSize: '14px',
              color: '#666'
            }}>
              Public {getTourTerminology().toLowerCase()}s can be viewed by others
            </p>
          </div>

          {/* Post Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <label style={{
                fontWeight: '500',
                color: '#333'
              }}>
                Select Posts * ({selectedPostIds.length} selected)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    background: viewMode === 'list' ? '#007aff' : 'transparent',
                    color: viewMode === 'list' ? 'white' : '#007aff',
                    border: '1px solid #007aff',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <FaList />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    background: viewMode === 'grid' ? '#007aff' : 'transparent',
                    color: viewMode === 'grid' ? 'white' : '#007aff',
                    border: '1px solid #007aff',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <FaTh />
                </button>
              </div>
            </div>

            {/* Posts List/Grid */}
            {userPosts.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                No posts available to add to this {getTourTerminology().toLowerCase()}
              </p>
            ) : (
              <div style={{
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '8px'
              }}>
                {viewMode === 'list' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {userPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handlePostToggle(post.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: selectedPostIds.includes(post.id) ? '#e3f2fd' : 'white'
                        }}
                      >
                        <button
                          style={{
                            background: selectedPostIds.includes(post.id) ? '#007aff' : 'transparent',
                            color: selectedPostIds.includes(post.id) ? 'white' : '#007aff',
                            border: '1px solid #007aff',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {selectedPostIds.includes(post.id) ? <FaMinus /> : <FaPlus />}
                        </button>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>
                            {post.title}
                          </div>
                          {post.description && (
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                              {post.description.length > 50 
                                ? `${post.description.substring(0, 50)}...` 
                                : post.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px'
                  }}>
                    {userPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handlePostToggle(post.id)}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          border: '2px solid',
                          borderColor: selectedPostIds.includes(post.id) ? '#007aff' : '#e0e0e0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          backgroundColor: selectedPostIds.includes(post.id) ? '#e3f2fd' : '#f5f5f5'
                        }}
                      >
                        {post.photoURLs && post.photoURLs[0] ? (
                          <img
                            src={post.photoURLs[0]}
                            alt={post.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center',
                            padding: '4px'
                          }}>
                            {post.title}
                          </div>
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: selectedPostIds.includes(post.id) ? '#007aff' : 'rgba(255,255,255,0.8)',
                            color: selectedPostIds.includes(post.id) ? 'white' : '#007aff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            border: '1px solid #007aff'
                          }}
                        >
                          {selectedPostIds.includes(post.id) ? <FaMinus /> : <FaPlus />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateTour}
            disabled={isUpdating}
            style={{
              background: isUpdating ? '#ccc' : '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            {isUpdating ? 'Updating...' : `Update ${getTourTerminology()}`}
          </button>
        </div>
      </div>
    </>
  );
};

export default TourEditModal; 