import React, { useState, useEffect } from 'react';
import { useFollowing } from '../context/FollowingContext';
import { useAuth } from '../context/AuthContext';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
}

const FollowButton: React.FC<FollowButtonProps> = ({ 
  targetUserId, 
  targetUsername,
  size = 'medium',
  variant = 'primary'
}) => {
  const { isFollowing, followUser, unfollowUser, following } = useFollowing();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [followingState, setFollowingState] = useState(false);

  // Don't show button if user is trying to follow themselves
  if (user?.uid === targetUserId) {
    return null;
  }

  // Update local following state when context changes
  useEffect(() => {
    const currentlyFollowing = isFollowing(targetUserId);
    setFollowingState(currentlyFollowing);
    console.log('🔄 FollowButton: Following state updated for', targetUserId, ':', currentlyFollowing);
  }, [following, targetUserId, isFollowing]);

  const handleFollowToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    console.log('🔄 FollowButton: Toggling follow for', targetUserId, 'currently following:', followingState);
    
    try {
      if (followingState) {
        await unfollowUser(targetUserId);
        setFollowingState(false); // Immediately update local state
        console.log('✅ FollowButton: Unfollowed', targetUserId);
      } else {
        await followUser(targetUserId);
        setFollowingState(true); // Immediately update local state
        console.log('✅ FollowButton: Followed', targetUserId);
      }
    } catch (error) {
      console.error('❌ FollowButton: Error toggling follow status:', error);
      // Revert local state on error
      setFollowingState(!followingState);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = {
      border: 'none',
      borderRadius: 8,
      cursor: isLoading ? 'not-allowed' : 'pointer',
      fontWeight: 500,
      transition: 'all 0.2s ease',
      opacity: isLoading ? 0.6 : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4
    };

    const sizeStyles = {
      small: { padding: '6px 12px', fontSize: '12px' },
      medium: { padding: '8px 16px', fontSize: '14px' },
      large: { padding: '12px 24px', fontSize: '16px' }
    };

    const variantStyles = {
      primary: {
        background: followingState ? '#6b7280' : '#007aff',
        color: 'white',
        '&:hover': {
          background: followingState ? '#4b5563' : '#0056b3'
        }
      },
      secondary: {
        background: followingState ? '#f3f4f6' : 'transparent',
        color: followingState ? '#6b7280' : '#007aff',
        border: `1px solid ${followingState ? '#d1d5db' : '#007aff'}`,
        '&:hover': {
          background: followingState ? '#e5e7eb' : '#f0f8ff'
        }
      }
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant]
    };
  };

  const buttonText = followingState ? 'Following' : 'Follow';
  const loadingText = followingState ? 'Unfollowing...' : 'Following...';

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      style={getButtonStyle()}
      onMouseEnter={(e) => {
        if (!isLoading) {
          if (variant === 'primary') {
            e.currentTarget.style.background = followingState ? '#4b5563' : '#0056b3';
          } else {
            e.currentTarget.style.background = followingState ? '#e5e7eb' : '#f0f8ff';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          if (variant === 'primary') {
            e.currentTarget.style.background = followingState ? '#6b7280' : '#007aff';
          } else {
            e.currentTarget.style.background = followingState ? '#f3f4f6' : 'transparent';
          }
        }
      }}
      title={targetUsername ? `${buttonText} ${targetUsername}` : buttonText}
    >
      {isLoading ? loadingText : buttonText}
    </button>
  );
};

export default FollowButton; 