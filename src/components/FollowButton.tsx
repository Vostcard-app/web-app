import React, { useState } from 'react';
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
  const { isFollowing, followUser, unfollowUser } = useFollowing();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show button if user is trying to follow themselves
  if (user?.uid === targetUserId) {
    return null;
  }

  const handleFollowToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isFollowing(targetUserId)) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      // Could add toast notification here
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

    const following = isFollowing(targetUserId);
    const variantStyles = {
      primary: {
        background: following ? '#6b7280' : '#007aff',
        color: 'white',
        '&:hover': {
          background: following ? '#4b5563' : '#0056b3'
        }
      },
      secondary: {
        background: following ? '#f3f4f6' : 'transparent',
        color: following ? '#6b7280' : '#007aff',
        border: `1px solid ${following ? '#d1d5db' : '#007aff'}`,
        '&:hover': {
          background: following ? '#e5e7eb' : '#f0f8ff'
        }
      }
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant]
    };
  };

  const buttonText = isFollowing(targetUserId) ? 'Following' : 'Follow';
  const loadingText = isFollowing(targetUserId) ? 'Unfollowing...' : 'Following...';

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      style={getButtonStyle()}
      onMouseEnter={(e) => {
        if (!isLoading) {
          const following = isFollowing(targetUserId);
          if (variant === 'primary') {
            e.currentTarget.style.background = following ? '#4b5563' : '#0056b3';
          } else {
            e.currentTarget.style.background = following ? '#e5e7eb' : '#f0f8ff';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          const following = isFollowing(targetUserId);
          if (variant === 'primary') {
            e.currentTarget.style.background = following ? '#6b7280' : '#007aff';
          } else {
            e.currentTarget.style.background = following ? '#f3f4f6' : 'transparent';
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