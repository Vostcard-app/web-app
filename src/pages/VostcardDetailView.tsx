import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaFlag, FaSyncAlt, FaUserCircle, FaMapPin } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import FollowButton from '../components/FollowButton';
import RatingStars from '../components/RatingStars';
import CommentsModal from '../components/CommentsModal';
import { RatingService, type RatingStats } from '../services/ratingService';
import type { Vostcard } from '../context/VostcardContext';

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [commentCount, setCommentCount] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showVideoControls, setShowVideoControls] = useState(true);
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

  // Set up real-time comment count listener
  useEffect(() => {
    if (!id) return;

    const commentsRef = collection(db, 'vostcards', id, 'comments');
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      setCommentCount(snapshot.size);
    });

    return unsubscribe;
  }, [id]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async () => {
    if (!id) return;
    try {
      await toggleLike(id);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [id, toggleLike]);

  // Handle rating submission
  const handleRatingSubmit = useCallback(async (rating: number) => {
    if (!id) return;
    try {
      await RatingService.submitRating(id, rating);
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  }, [id]);

  // Handle video orientation - ALWAYS PORTRAIT
  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement) => {
    const { videoWidth, videoHeight } = videoElement;
    
    console.log('📱 Video dimensions (ALWAYS PORTRAIT):', {
      videoWidth,
      videoHeight,
      aspectRatio: videoWidth && videoHeight ? (videoWidth / videoHeight).toFixed(2) : 'unknown'
    });

    // All videos are portrait
    setVideoOrientation('portrait');
  };

  const handleFlagClick = () => {
    navigate('/flag-form', { state: { vostcardId: id, vostcardTitle: vostcard?.title } });
  };

  const handleShareClick = () => {
    // Remove private sharing functionality
    if (navigator.share) {
      navigator.share({
        title: vostcard.title || 'Check out this Vostcard!',
        text: vostcard.description || 'I found an interesting Vostcard',
        url: window.location.href
      }).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'red' }}>{error}</div>
      </div>
    );
  }

  if (!vostcard) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Vostcard not found</div>
        </div>
    );
  }

  const { title, description, photoURLs = [], videoURL, username } = vostcard;
  const avatarUrl = userProfile?.avatarURL;

  // Format creation date
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
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        paddingBottom: '100px',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        position: 'relative',
        width: '100%',
        height: '100vh'
      }}
    >
      {/* Banner */}
      <div style={{ background: '#07345c', padding: '15px 0 24px 0', position: 'relative', textAlign: 'left', paddingLeft: '16px' }}>
        <button style={{ position: 'absolute', right: 16, top: 26, background: 'rgba(0,0,0,0.10)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate('/home')}>
          <FaHome color="#fff" size={36} />
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>Vōstcard</span>
      </div>

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '5px 24px 0 24px' }}>
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
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 24, margin: '2px 0 8px 0' }}>{title}</div>

      {/* Media Thumbnails */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '8px 0 8px 0' }}>
        <div 
          style={{ 
            width: 180, 
            height: 240, 
            background: '#111', 
            borderRadius: 16, 
            overflow: 'hidden', 
            cursor: videoURL ? 'pointer' : 'default',
            position: 'relative'
          }}
          onClick={() => videoURL && setShowVideoModal(true)}
        >
          {videoURL ? (
            <>
              <video 
                src={videoURL} 
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover', // This will fill the container and crop if needed
                  pointerEvents: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
                onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
              />
              {/* Play overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 1
              }}>
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '20px solid white',
                  borderTop: '12px solid transparent',
                  borderBottom: '12px solid transparent',
                  marginLeft: '4px'
                }} />
              </div>
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>No Video</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {photoURLs.length > 0 ? (
            photoURLs.slice(0, 2).map((url: string, idx: number) => (
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
            size={24} 
            color={isLikedStatus ? "#ff4444" : "#222"} 
            style={{ 
              marginBottom: 4,
              transition: 'color 0.2s'
            }} 
          />
          <div style={{ fontSize: 18 }}>{likeCount}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaStar size={24} color="#ffc107" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{ratingStats.averageRating.toFixed(1)}</div>
        </div>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={() => setShowCommentsModal(true)}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaRegComment size={24} color="#222" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{commentCount}</div>
        </div>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleShareClick}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaShare size={24} color="#222" style={{ marginBottom: 4 }} />
        </div>
      </div>

      {/* Worth Seeing? Rating System */}
      <div style={{ textAlign: 'center', margin: '5px 0 0 0', fontSize: 18 }}>Worth Seeing?</div>
      <div style={{ margin: '8px 0 0 0' }}>
        {/* Rating Stars */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <RatingStars
            currentRating={currentUserRating}
            averageRating={ratingStats.averageRating}
            ratingCount={ratingStats.ratingCount}
            onRate={handleRatingSubmit}
          />
        </div>
      </div>

      {/* Description Link with FaFlag and FaSyncAlt icons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '16px 0 0 0',
          width: '100%',
          maxWidth: 420,
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
        }}
      >
        <FaFlag
          size={24}
          color="#e53935"
          style={{ 
            cursor: 'pointer', 
            padding: '5px',
            position: 'absolute',
            left: '50px'
          }}
          onClick={handleFlagClick}
        />
        <button
          onClick={() => setShowDescriptionModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007aff',
            fontWeight: 700,
            fontSize: 24,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Description
        </button>
        <FaSyncAlt
          size={24}
          color="#007aff"
          style={{ 
            padding: '5px',
            position: 'absolute',
            right: '50px'
          }}
        />
      </div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 }}>Posted: {createdAt}</div>
      
      {/* Add extra content to ensure scrolling works */}
      <div style={{ height: '50vh', padding: '20px', color: '#666', fontSize: 16, lineHeight: 1.6 }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
          Additional Information
        </div>
        <p>This Vōstcard shows content from the location where it was created. You can interact with it by liking, rating, or commenting.</p>
        <p>Use the Description button above to read more details about this location or experience.</p>
        <p>The rating system helps other users discover the most interesting Vōstcards in their area.</p>
        <p>You can also follow the creator to see more of their content.</p>
        <div style={{ height: '100px' }}></div>
        <div style={{ textAlign: 'center', color: '#999', fontSize: 14 }}>
          End of Vōstcard details
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        vostcardID={id!}
        vostcardTitle={vostcard?.title}
      />

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

      {/* Full-screen Video Modal - ALWAYS PORTRAIT */}
      {showVideoModal && videoURL && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            cursor: 'pointer',
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideoModal(false);
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                zIndex: 1002,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
            
            {/* Video - Fill screen properly */}
            <video
              src={videoURL}
              style={{
                width: '100vw',
                height: '100vh',
                objectFit: 'cover', // Fill the screen, crop if needed
                position: 'absolute',
                top: 0,
                left: 0
              }}
              controls={showVideoControls}
              loop
              playsInline
              onClick={(e) => {
                e.stopPropagation();
                setShowVideoControls(!showVideoControls);
                // Hide controls after 3 seconds if they're shown
                if (!showVideoControls) {
                  setTimeout(() => setShowVideoControls(false), 3000);
                }
              }}
              onContextMenu={e => e.preventDefault()}
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
              onPlay={() => {
                // Hide controls after 3 seconds when video starts playing
                setTimeout(() => setShowVideoControls(false), 3000);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VostcardDetailView;
