import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaStar, FaRegComment, FaShare, FaFlag, FaSyncAlt, FaUserCircle } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';
import FollowButton from '../components/FollowButton';
import RatingStars from '../components/RatingStars';
import { RatingService, type RatingStats } from '../services/ratingService';

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikedStatus, setIsLikedStatus] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [currentUserRating, setCurrentUserRating] = useState(0);
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    vostcardID: '',
    averageRating: 0,
    ratingCount: 0,
    lastUpdated: ''
  });
  const { toggleLike, getLikeCount, isLiked, setupLikeListeners } = useVostcard();

  useEffect(() => {
    const fetchVostcard = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'vostcards', id!);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVostcard(docSnap.data());
        } else {
          setError('Vostcard not found.');
        }
      } catch (err) {
        setError('Failed to load Vostcard.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchVostcard();
  }, [id]);

  // Fetch user profile when vostcard is loaded
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!vostcard?.userID) return;
      
      try {
        const userRef = doc(db, 'users', vostcard.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (vostcard?.userID) {
      fetchUserProfile();
    }
  }, [vostcard?.userID]);

  // Reset image error state when user profile changes
  useEffect(() => {
    setImageLoadError(false);
  }, [userProfile]);

  // Load like data and set up real-time listeners
  useEffect(() => {
    if (!id) return;

    const loadLikeData = async () => {
      try {
        const [count, liked] = await Promise.all([
          getLikeCount(id),
          isLiked(id)
        ]);
        setLikeCount(count);
        setIsLikedStatus(liked);
      } catch (error) {
        console.error('Error loading like data:', error);
      }
    };

    loadLikeData();

    // Set up real-time listeners
    const unsubscribe = setupLikeListeners(
      id,
      (count) => setLikeCount(count),
      (liked) => setIsLikedStatus(liked)
    );

    return unsubscribe;
  }, [id, getLikeCount, isLiked, setupLikeListeners]);

  // Load rating data and set up real-time listeners
  useEffect(() => {
    if (!id) return;

    const loadRatingData = async () => {
      try {
        const [userRating, stats] = await Promise.all([
          RatingService.getCurrentUserRating(id),
          RatingService.getRatingStats(id)
        ]);
        setCurrentUserRating(userRating);
        setRatingStats(stats);
      } catch (error) {
        console.error('Error loading rating data:', error);
      }
    };

    loadRatingData();

    // Set up real-time listeners
    const unsubscribeStats = RatingService.listenToRatingStats(id, (stats) => {
      setRatingStats(stats);
    });

    const unsubscribeUserRating = RatingService.listenToUserRating(id, (rating) => {
      setCurrentUserRating(rating);
    });

    return () => {
      unsubscribeStats();
      unsubscribeUserRating();
    };
  }, [id]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async () => {
    if (!id) return;
    
    try {
      await toggleLike(id);
      // Real-time listeners will update the state automatically
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [id, toggleLike]);

  // Handle rating submission
  const handleRatingSubmit = useCallback(async (rating: number) => {
    if (!id) return;
    
    try {
      await RatingService.submitRating(id, rating);
      // Real-time listeners will update the state automatically
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  }, [id]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;
  }
  if (!vostcard) {
    return <div style={{ padding: 40, textAlign: 'center' }}>No data.</div>;
  }

  // Fallbacks for missing data
  const avatarUrl = userProfile?.avatarURL || vostcard.avatarURL || null;
  
  const photoUrls = vostcard.photoURLs || [];
  const videoUrl = vostcard.videoURL || '';
  const title = vostcard.title || 'Untitled';
  const username = vostcard.username || 'Unknown';
  const likes = vostcard.likes || 0;
  const comments = vostcard.comments || 0;
  const description = vostcard.description || '';

  // Handle flag submission
  const handleFlagClick = useCallback(() => {
    if (!id) return;
    
    // URL-encode the parameters to handle special characters
    const encodedTitle = encodeURIComponent(title);
    const encodedUsername = encodeURIComponent(username);
    
    navigate(`/flag/${id}/${encodedTitle}/${encodedUsername}`);
  }, [id, title, username, navigate]);

  let createdAt = '';
  if (vostcard.createdAt) {
    if (typeof vostcard.createdAt.toDate === 'function') {
      createdAt = vostcard.createdAt.toDate().toLocaleString();
    } else if (vostcard.createdAt instanceof Date) {
      createdAt = vostcard.createdAt.toLocaleString();
    } else if (typeof vostcard.createdAt === 'string' || typeof vostcard.createdAt === 'number') {
      createdAt = new Date(vostcard.createdAt).toLocaleString();
    } else {
      createdAt = String(vostcard.createdAt);
    }
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Banner */}
      <div style={{ background: '#07345c', padding: '32px 0 24px 0', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, position: 'relative', textAlign: 'center' }}>
        <button style={{ position: 'absolute', left: 16, top: 36, background: 'rgba(0,0,0,0.10)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <FaArrowLeft color="#fff" size={28} />
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>Vōstcard</span>
      </div>

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 24px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', marginRight: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
            {avatarUrl && !imageLoadError ? (
              <img 
                src={avatarUrl} 
                alt="avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => {
                  setImageLoadError(true);
                }}
              />
            ) : (
              <FaUserCircle 
                size={64} 
                color="#ccc" 
              />
            )}
          </div>
          <span style={{ fontWeight: 500, fontSize: 24 }}>{username}</span>
        </div>
        {vostcard.userID && (
          <FollowButton 
            targetUserId={vostcard.userID} 
            targetUsername={username}
            size="small"
            variant="secondary"
          />
        )}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 32, margin: '16px 0 8px 0' }}>{title}</div>

      {/* Media Thumbnails */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '8px 0 8px 0' }}>
        <div style={{ width: 180, height: 240, background: '#111', borderRadius: 16, overflow: 'hidden', cursor: videoUrl ? 'pointer' : 'default' }}>
          {videoUrl ? (
            <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>No Video</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {photoUrls.length > 0 ? (
            photoUrls.slice(0, 2).map((url: string, idx: number) => (
              <img
                key={idx}
                src={url}
                alt={`photo${idx+1}`}
                style={{ width: 120, height: 110, borderRadius: 16, objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setSelectedPhoto(url)}
                onContextMenu={e => e.preventDefault()}
              />
            ))
          ) : (
            <>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Photo</div>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Photo</div>
            </>
          )}
        </div>
      </div>

      {/* Action Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '16px 0 0 0' }}>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleLikeToggle}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaHeart 
            size={32} 
            color={isLikedStatus ? "#ff4444" : "#222"} 
            style={{ 
              marginBottom: 4,
              transition: 'color 0.2s'
            }} 
          />
          <div style={{ fontSize: 18 }}>{likeCount}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaStar size={32} color="#ffc107" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{ratingStats.averageRating.toFixed(1)}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaRegComment size={32} color="#222" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{comments}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaShare size={32} color="#222" style={{ marginBottom: 4 }} />
        </div>
      </div>

      {/* Worth Seeing? Rating System */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0', fontSize: 18 }}>Worth Seeing?</div>
      <div style={{ margin: '8px 0 0 0' }}>
        <RatingStars
          currentRating={currentUserRating}
          averageRating={ratingStats.averageRating}
          ratingCount={ratingStats.ratingCount}
          onRate={handleRatingSubmit}
        />
      </div>

      {/* Description Link */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0' }}>
        <button 
          onClick={() => setShowDescriptionModal(true)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#007aff', 
            fontWeight: 700, 
            fontSize: 24, 
            textDecoration: 'underline', 
            cursor: 'pointer' 
          }}
        >
          Description
        </button>
      </div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 }}>Posted: {createdAt}</div>

      {/* Bottom Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 24px 0 24px' }}>
        <FaFlag 
          size={36} 
          color="#e53935" 
          style={{ 
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }} 
          onClick={handleFlagClick}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        <FaSyncAlt size={36} color="#007aff" style={{ cursor: 'pointer' }} />
      </div>

      {/* Modal for full-size photo */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out',
          }}
          onClick={() => setSelectedPhoto(null)}
          onContextMenu={e => e.preventDefault()}
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            style={{
              width: '100vw',
              height: '100vh',
              objectFit: 'contain',
              borderRadius: 0,
              boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
              background: '#000',
              userSelect: 'none',
              pointerEvents: 'auto',
            }}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
          />
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '24px',
              maxWidth: '90%',
              maxHeight: '80%',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowDescriptionModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: '#666',
                padding: 0,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
            
            {/* Header */}
            <h2 style={{ margin: '0 0 16px 0', fontSize: 24, fontWeight: 700, color: '#002B4D' }}>
              Description
            </h2>
            
            {/* Description content */}
            <div style={{ 
              color: '#444', 
              fontSize: 16, 
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {description || 'No description available.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VostcardDetailView;
