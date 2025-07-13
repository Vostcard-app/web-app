import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useAnimation } from 'framer-motion';
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

const SWIPE_THRESHOLD = 120; // px

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Swipe navigation state
  const vostcardList: string[] = location.state?.vostcardList || [];
  const currentIndex: number = location.state?.currentIndex ?? (vostcardList.indexOf(id!) >= 0 ? vostcardList.indexOf(id!) : 0);

  // For stacked animation, get prev/next ids
  const prevId = currentIndex > 0 ? vostcardList[currentIndex - 1] : null;
  const nextId = currentIndex < vostcardList.length - 1 ? vostcardList[currentIndex + 1] : null;

  // Touch state for swipe detection
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };
  // Add swipeDirection state
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);

  // Update swipe handlers to set direction
  const handleTouchEnd = () => {
    if (touchStartY.current === null || touchEndY.current === null) return;
    const deltaY = touchStartY.current - touchEndY.current;
    if (Math.abs(deltaY) > 50) { // Minimum swipe distance
      if (deltaY > 0 && currentIndex < vostcardList.length - 1) {
        setSwipeDirection('up');
        setTimeout(() => {
          navigate(`/vostcard/${vostcardList[currentIndex + 1]}`, {
            state: { vostcardList, currentIndex: currentIndex + 1 }
          });
        }, 200);
      } else if (deltaY < 0 && currentIndex > 0) {
        setSwipeDirection('down');
        setTimeout(() => {
          navigate(`/vostcard/${vostcardList[currentIndex - 1]}`, {
            state: { vostcardList, currentIndex: currentIndex - 1 }
          });
        }, 200);
      }
    }
    touchStartY.current = null;
    touchEndY.current = null;
  };

  // Animation variants for TikTok-style vertical slide
  const variants = {
    initial: (direction: 'up' | 'down' | null) => ({
      y: direction === 'up' ? '100%' : direction === 'down' ? '-100%' : 0,
      opacity: 1
    }),
    animate: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
    exit: (direction: 'up' | 'down' | null) => ({
      y: direction === 'up' ? '-100%' : direction === 'down' ? '100%' : 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 400, damping: 30 }
    })
  };

  // Reset swipe direction after animation
  useEffect(() => {
    if (swipeDirection) {
      const timeout = setTimeout(() => setSwipeDirection(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [swipeDirection]);

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
    navigate('/flag-form', { state: { vostcardId: id, vostcardTitle: vostcard?.title, username: vostcard?.username } });
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

  const [isDragging, setIsDragging] = useState(false);
  const y = useMotionValue(0);
  const controls = useAnimation();

  // Drag end handler
  const handleDragEnd = (_: any, info: { offset: { y: number } }) => {
    setIsDragging(false);
    if (info.offset.y < -SWIPE_THRESHOLD && nextId) {
      // Swiped up
      controls.start({ y: -window.innerHeight, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } }).then(() => {
        navigate(`/vostcard/${nextId}`, { state: { vostcardList, currentIndex: currentIndex + 1 } });
        y.set(0);
      });
    } else if (info.offset.y > SWIPE_THRESHOLD && prevId) {
      // Swiped down
      controls.start({ y: window.innerHeight, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } }).then(() => {
        navigate(`/vostcard/${prevId}`, { state: { vostcardList, currentIndex: currentIndex - 1 } });
        y.set(0);
      });
    } else {
      // Snap back
      controls.start({ y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } });
    }
  };

  // Reset y on id change
  useEffect(() => { y.set(0); }, [id, y]);

  // Helper to render the card content (so we can use it for prev/next too)
  const renderCardContent = (vostcardId: string | null) => {
    if (!vostcardId) return <div style={{ height: '100vh', background: '#f0f0f0' }} />;
    if (vostcardId !== id) {
      // Only render a placeholder for prev/next
      return <div style={{ height: '100vh', background: '#f0f0f0' }} />;
    }
    // If loading or error, show loading/error state
    if (loading) {
      return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>Loading...</div>;
    }
    if (error || !vostcard) {
      return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontSize: 24 }}>{error || 'Vostcard not found'}</div>;
    }
    // All variables must be defined here for the current card
    const { title, description, photoURLs = [], videoURL, username, createdAt: rawCreatedAt } = vostcard;
    const avatarUrl = userProfile?.avatarURL;
    // Format creation date
    let createdAt = '';
    if (rawCreatedAt) {
      if (typeof rawCreatedAt.toDate === 'function') {
        createdAt = rawCreatedAt.toDate().toLocaleString();
      } else if (rawCreatedAt instanceof Date) {
        createdAt = rawCreatedAt.toLocaleString();
      } else if (typeof rawCreatedAt === 'string' || typeof rawCreatedAt === 'number') {
        createdAt = new Date(rawCreatedAt).toLocaleString();
      } else {
        createdAt = String(rawCreatedAt);
      }
    }
    return (
      <AnimatePresence initial={false} custom={swipeDirection}>
        <motion.div
          key={id}
          custom={swipeDirection}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
          
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#fff' }}>
      {/* Fixed Banner/Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 10,
        background: '#07345c',
        padding: '15px 0 24px 0',
        textAlign: 'left',
        paddingLeft: '16px',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        height: 70,
        display: 'flex',
        alignItems: 'center',
      }}>
        <button style={{ position: 'absolute', right: 16, top: 26, background: 'rgba(0,0,0,0.10)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate('/home')}>
          <FaHome color="#fff" size={36} />
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem', marginLeft: 0 }}>Vōstcard</span>
      </div>
      {/* Previous card (underneath, for swipe down) */}
      {prevId && (
        <motion.div
          style={{
            position: 'absolute',
            top: '-100vh',
            left: 0,
            width: '100%',
            height: '100vh',
            zIndex: 0,
            background: '#f0f0f0',
          }}
        >
          {renderCardContent(prevId)}
        </motion.div>
      )}
      {/* Next card (underneath, for swipe up) */}
      {nextId && (
        <motion.div
          style={{
            position: 'absolute',
            top: '100vh',
            left: 0,
            width: '100%',
            height: '100vh',
            zIndex: 0,
            background: '#f0f0f0',
          }}
        >
          {renderCardContent(nextId)}
        </motion.div>
      )}
      {/* Current card (on top, draggable) */}
      <motion.div
        key={id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 1,
          background: '#fff',
          y: y,
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          overflow: 'auto',
          marginTop: 70, // Add margin to avoid going under the banner
        }}
        drag="y"
        dragConstraints={{ top: prevId ? -window.innerHeight : 0, bottom: nextId ? window.innerHeight : 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={controls}
        transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
      >
        {renderCardContent(id || null)}
      </motion.div>
    </div>
  );
};

export default VostcardDetailView;
