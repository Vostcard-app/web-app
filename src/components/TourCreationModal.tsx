import React, { useState, useEffect } from 'react';
import { FaTimes, FaMapPin, FaCheck, FaEye, FaEyeSlash, FaShare, FaList, FaTh } from 'react-icons/fa';
import { TourService } from '../services/tourService';
import type { TourPost } from '../types/TourTypes';

// Type for posts from the database
interface UserPost {
  id: string;
  title: string;
  description?: string;
  photoURLs?: string[];
  videoURL?: string;
  createdAt?: any;
  isQuickcard?: boolean;
  isOffer?: boolean;
  userRole?: string;
  username?: string;
  state?: string;
  [key: string]: any;
}

interface TourCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTourCreated: () => void;
  creatorId: string;
  userPosts: UserPost[];
  userRole?: string;
}

const TourCreationModal: React.FC<TourCreationModalProps> = ({
  isOpen,
  onClose,
  onTourCreated,
  creatorId,
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
  const [isShareable, setIsShareable] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTourName('');
      setTourDescription('');
      setSelectedPostIds([]);
      setIsPublic(true);
      setIsShareable(false);
      setError(null);
    }
  }, [isOpen, userPosts]);

  const handlePostToggle = (postId: string) => {
    if (selectedPostIds.includes(postId)) {
      const newSelection = selectedPostIds.filter(id => id !== postId);
      setSelectedPostIds(newSelection);
    } else {
      const newSelection = [...selectedPostIds, postId];
      setSelectedPostIds(newSelection);
    }
  };

  const handleCreateTour = async () => {
    if (!tourName.trim()) {
      setError('Please enter a tour name');
      return;
    }

    if (selectedPostIds.length === 0) {
      setError('Please select at least one post for your tour');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await TourService.createTour(creatorId, {
        name: tourName.trim(),
        description: tourDescription.trim(),
        postIds: selectedPostIds,
        isPublic,
        isShareable,
      });

      onTourCreated();
      onClose();
    } catch (error) {
      console.error('Error creating tour:', error);
      setError('Failed to create tour. Please try again.');
    } finally {
      setIsCreating(false);
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
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: 2001,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Create New {getTourTerminology()}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Tour/Trip Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            {getTourTerminology()} Name *
          </label>
          <input
            type="text"
            value={tourName}
            onChange={(e) => setTourName(e.target.value)}
            placeholder={`Enter ${getTourTerminology().toLowerCase()} name...`}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          />
        </div>

        {/* Tour/Trip Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Description (optional)
          </label>
          <textarea
            value={tourDescription}
            onChange={(e) => setTourDescription(e.target.value)}
            placeholder={`Describe your ${getTourTerminology().toLowerCase()}...`}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Privacy Settings */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isPublic ? <FaEye /> : <FaEyeSlash />}
              Make {getTourTerminology().toLowerCase()} public (visible to other users)
            </span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isShareable}
              onChange={(e) => setIsShareable(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaShare />
              Make {getTourTerminology().toLowerCase()} shareable (create public URL for sharing)
            </span>
          </label>
        </div>

        {/* Select Posts */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontWeight: '500' }}>
              Select Posts for {getTourTerminology()} * ({selectedPostIds.length} selected)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: viewMode === 'list' ? '#007aff' : 'white',
                  color: viewMode === 'list' ? 'white' : '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <FaList size={12} />
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: viewMode === 'grid' ? '#007aff' : 'white',
                  color: viewMode === 'grid' ? 'white' : '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <FaTh size={12} />
                Grid
              </button>
            </div>
          </div>
          <p style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginBottom: '12px',
            fontStyle: 'italic'
          }}>
            You can include both your personal posts (drafts/saved) and public posts in your {getTourTerminology().toLowerCase()}.
          </p>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            padding: '8px'
          }}>
            {userPosts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                No posts available to add to tour
              </div>
            ) : viewMode === 'list' ? (
              // List View
              userPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #eee',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedPostIds.includes(post.id) ? '#f0f8ff' : 'white',
                  }}
                  onClick={() => handlePostToggle(post.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPostIds.includes(post.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handlePostToggle(post.id);
                    }}
                    style={{ marginRight: '12px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {post.title || 'Untitled'}
                    </div>
                    {post.description && (
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                        {post.description.length > 100 
                          ? `${post.description.substring(0, 100)}...` 
                          : post.description}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {post.isQuickcard ? '📸 Quickcard' : '📹 Vostcard'}
                      {post.state && post.state !== 'posted' && (
                        <span style={{ 
                          marginLeft: '8px', 
                          padding: '2px 6px', 
                          backgroundColor: '#ff9800', 
                          color: 'white', 
                          borderRadius: '8px',
                          fontSize: '10px'
                        }}>
                          {post.state}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedPostIds.includes(post.id) && (
                    <FaCheck style={{ color: '#007aff', marginLeft: '8px' }} />
                  )}
                </div>
              ))
            ) : (
              // Grid View
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
              }}>
                {userPosts.map((post) => (
                  <div
                    key={post.id}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      backgroundColor: '#ddd',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: selectedPostIds.includes(post.id) ? '3px solid #007aff' : '1px solid #eee',
                    }}
                    onClick={() => handlePostToggle(post.id)}
                  >
                    {post.photoURLs && post.photoURLs.length > 0 ? (
                      <img
                        src={post.photoURLs[0]}
                        alt={post.title || 'Post'}
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
                        color: '#999',
                        fontSize: '12px',
                        textAlign: 'center',
                        padding: '8px',
                      }}>
                        {post.isQuickcard ? '📸' : '📹'}
                        <br />
                        {post.title || 'No Title'}
                      </div>
                    )}
                    
                    {/* Selection indicator */}
                    {selectedPostIds.includes(post.id) && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#007aff',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                      }}>
                        <FaCheck size={8} />
                      </div>
                    )}
                    
                    {/* Post type and state indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>{post.isQuickcard ? '📸' : '📹'}</span>
                      {post.state && post.state !== 'posted' && (
                        <span style={{ 
                          backgroundColor: '#ff9800', 
                          padding: '1px 4px', 
                          borderRadius: '2px',
                          fontSize: '8px'
                        }}>
                          {post.state}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ color: '#d32f2f', fontSize: '14px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isCreating}
            style={{
              padding: '12px 24px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTour}
            disabled={isCreating || !tourName.trim() || selectedPostIds.length === 0}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: isCreating || !tourName.trim() || selectedPostIds.length === 0 
                ? '#ccc' 
                : '#007aff',
              color: 'white',
              cursor: isCreating || !tourName.trim() || selectedPostIds.length === 0 
                ? 'not-allowed' 
                : 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            {isCreating ? 'Creating...' : `Create ${getTourTerminology()}`}
          </button>
        </div>
      </div>
    </>
  );
};

export default TourCreationModal; 