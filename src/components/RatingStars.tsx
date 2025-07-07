import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';

interface RatingStarsProps {
  currentRating: number;        // Current user's rating (0 if none)
  averageRating: number;        // Average rating from all users
  ratingCount: number;          // Total number of ratings
  onRate: (rating: number) => void; // Function to submit new rating
  disabled?: boolean;           // Optional disable flag
}

const RatingStars: React.FC<RatingStarsProps> = ({
  currentRating,
  averageRating,
  ratingCount,
  onRate,
  disabled = false
}) => {
  const [hovered, setHovered] = useState<number>(0);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            size={28}
            color={
              star <= (hovered || currentRating) ? '#FFD700' : '#ccc'
            }
            style={{ cursor: disabled ? 'default' : 'pointer' }}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => !disabled && onRate(star)}
          />
        ))}
      </div>
      <p style={{ fontSize: 14, color: '#555', marginTop: 4 }}>
        ⭐ {averageRating.toFixed(1)} ({ratingCount} rating{ratingCount !== 1 ? 's' : ''})
      </p>
    </div>
  );
};

export default RatingStars; 