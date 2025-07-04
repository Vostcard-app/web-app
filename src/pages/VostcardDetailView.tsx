import React, { useState } from 'react';
import { FaArrowLeft, FaHeart, FaStar, FaRegComment, FaShare, FaFlag, FaSyncAlt } from 'react-icons/fa';

const avatarUrl = 'https://randomuser.me/api/portraits/men/32.jpg'; // Placeholder
const photoUrl = 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=400&h=400';
const videoThumbUrl = 'https://dummyimage.com/300x400/000/fff&text=Video';

const VostcardDetailView: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const avgRating = 0.0;
  const likes = 0;
  const comments = 0;

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Banner */}
      <div style={{ background: '#07345c', padding: '32px 0 24px 0', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, position: 'relative', textAlign: 'center' }}>
        <button style={{ position: 'absolute', left: 16, top: 36, background: 'rgba(0,0,0,0.10)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <FaArrowLeft color="#fff" size={28} />
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>Vōstcard</span>
      </div>

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 0 24px' }}>
        <img src={avatarUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginRight: 16 }} />
        <span style={{ fontWeight: 500, fontSize: 24 }}>Jay Bond</span>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 32, margin: '16px 0 8px 0' }}>Title</div>

      {/* Media Thumbnails */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '0 0 16px 0' }}>
        <div style={{ width: 180, height: 240, background: '#111', borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}>
          <img src={videoThumbUrl} alt="video" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <img src={photoUrl} alt="photo1" style={{ width: 120, height: 110, borderRadius: 16, objectFit: 'cover', cursor: 'pointer' }} />
          <img src={photoUrl} alt="photo2" style={{ width: 120, height: 110, borderRadius: 16, objectFit: 'cover', cursor: 'pointer' }} />
        </div>
      </div>

      {/* Action Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '16px 0 0 0' }}>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaHeart size={32} color="#222" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{likes}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaStar size={32} color="#ffc107" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{avgRating.toFixed(1)}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaRegComment size={32} color="#222" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{comments}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaShare size={32} color="#222" style={{ marginBottom: 4 }} />
        </div>
      </div>

      {/* Worth Seeing? 5-Star Widget */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0', fontSize: 18 }}>Worth Seeing?</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '4px 0 0 0' }}>
        {[1,2,3,4,5].map((star) => (
          <FaStar
            key={star}
            size={28}
            color={hoverRating >= star || rating >= star ? '#ffc107' : '#ddd'}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
          />
        ))}
      </div>

      {/* Description Link */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0' }}>
        <a href="#description" style={{ color: '#007aff', fontWeight: 700, fontSize: 24, textDecoration: 'underline', cursor: 'pointer' }}>Description</a>
      </div>

      {/* Bottom Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 24px 0 24px' }}>
        <FaFlag size={36} color="#e53935" style={{ cursor: 'pointer' }} />
        <FaSyncAlt size={36} color="#007aff" style={{ cursor: 'pointer' }} />
      </div>
    </div>
  );
};

export default VostcardDetailView;
