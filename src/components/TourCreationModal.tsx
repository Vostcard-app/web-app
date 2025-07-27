import React, { useState, useEffect } from 'react';
import { FaTimes, FaMapPin, FaCheck, FaEye, FaEyeSlash, FaShare } from 'react-icons/fa';
import { TourService } from '../services/tourService';
import type { TourPost } from '../types/TourTypes';

interface TourCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTourCreated: () => void;
  creatorId: string;
  userPosts: TourPost[];
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
  }, [isOpen]);

  const handlePostToggle = (postId: string) => {
    setSelectedPostIds(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
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
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Select Posts for {getTourTerminology()} * ({selectedPostIds.length} selected)
          </label>
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
            ) : (
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
                    onChange={() => handlePostToggle(post.id)}
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