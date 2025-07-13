import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useAnimation } from 'framer-motion';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaFlag, FaSyncAlt, FaUserCircle, FaMapPin, FaLock, FaMap, FaArrowLeft } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
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
  const { 
    toggleLike, 
    getLikeCount, 
    isLiked, 
    setupLikeListeners, 
    loadLocalVostcard, 
    currentVostcard 
  } = useVostcard();

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
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [photoURLs, setPhotoURLs] = useState<string[]>([]);
  const [liked, setLiked] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Load Vostcard (Firebase or Local)
  useEffect(() => {
    const fetchVostcard = async () => {
      if (!id) {
        setError('No Vostcard ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Loading Vostcard:', id);

        // First, try to load from Firebase (posted Vostcards)
        console.log('🔍 Trying Firebase...');
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log('✅ Found in Firebase');
          const data = docSnap.data();
          setVostcard({ id: docSnap.id, ...data });
          setIsPrivate(false); // Firebase Vostcards are public
          setLoading(false);
          return;
        }

        // Try to load from IndexedDB (private Vostcards)
        console.log('🔍 Trying IndexedDB...');
        await loadLocalVostcard(id);
        
        // The loadLocalVostcard function will update currentVostcard
        // We'll handle this in a separate useEffect below
        
      } catch (err) {
        console.error('❌ Error loading Vostcard:', err);
        setError('Failed to load Vostcard');
        setLoading(false);
      }
    };

    fetchVostcard();
  }, [id, loadLocalVostcard]);

  // Handle currentVostcard updates from IndexedDB
  useEffect(() => {
    if (currentVostcard && currentVostcard.id === id) {
      console.log('✅ Using Vostcard from IndexedDB');
      setVostcard(currentVostcard);
      setIsPrivate(true); // Context Vostcards are private
      setLoading(false);
    } else if (currentVostcard === null && !loading) {
      // If we tried to load from IndexedDB but got null, and we're not loading from Firebase
      console.log('❌ Vostcard not found in IndexedDB');
      setError('Vostcard not found');
      setLoading(false);
    }
  }, [currentVostcard, id, loading]);

  // Create video and photo URLs when vostcard is loaded
  useEffect(() => {
    if (vostcard?.video) {
      try {
        let url: string;
        
        if (vostcard.video instanceof Blob) {
          // Local Vostcard with Blob video
          url = URL.createObjectURL(vostcard.video);
          console.log('📹 Created Blob URL for local video');
        } else if (typeof vostcard.video === 'string') {
          // Firebase Vostcard with string URL
          url = vostcard.video;
          console.log('📹 Using Firebase URL for video');
        } else {
          throw new Error('Invalid video format');
        }
        
        setVideoURL(url);
        
        // Cleanup function for Blob URLs
        return () => {
          if (vostcard.video instanceof Blob) {
            URL.revokeObjectURL(url);
          }
        };
      } catch (err) {
        console.error('❌ Error creating video URL:', err);
        setError('Failed to load video');
      }
    }
  }, [vostcard]);

  // Create photo URLs when vostcard is loaded
  useEffect(() => {
    if (vostcard?.photos && vostcard.photos.length > 0) {
      try {
        let urls: string[] = [];
        
        if (vostcard.photos[0] instanceof Blob) {
          // Local Vostcard with Blob photos
          urls = vostcard.photos.map((photo: Blob) => URL.createObjectURL(photo));
          console.log('📸 Created Blob URLs for local photos, count:', urls.length);
        } else if (typeof vostcard.photos[0] === 'string') {
          // Firebase Vostcard with string URLs
          urls = vostcard.photos;
          console.log('📸 Using Firebase URLs for photos, count:', urls.length);
        } else if (vostcard.photoURLs) {
          // Fallback to photoURLs property
          urls = vostcard.photoURLs;
          console.log('📸 Using photoURLs property, count:', urls.length);
        }
        
        setPhotoURLs(urls);
        
        // Cleanup function for Blob URLs
        return () => {
          if (vostcard.photos[0] instanceof Blob) {
            urls.forEach(url => URL.revokeObjectURL(url));
          }
        };
      } catch (err) {
        console.error('❌ Error creating photo URLs:', err);
      }
    } else {
      setPhotoURLs([]);
    }
  }, [vostcard]);

  // Setup like listeners for public Vostcards
  useEffect(() => {
    if (vostcard && !isPrivate && user) {
      const cleanup = setupLikeListeners(vostcard.id, (count) => {
        setLikeCount(count);
      }, (isLiked) => {
        setLiked(isLiked);
      });
      return cleanup;
    }
  }, [vostcard, isPrivate, user, setupLikeListeners]);

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
    // Generate public share URL
    const publicUrl = `${window.location.origin}/share/${id}`;
    
    if (navigator.share) {
      navigator.share({
        title: vostcard.title || 'Check out this Vostcard!',
        text: vostcard.description || 'I found an interesting Vostcard',
        url: publicUrl
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(publicUrl).then(() => {
        alert('Share link copied to clipboard!');
      }).catch(() => {
        alert('Share this link: ' + publicUrl);
      });
    }
  };

  const handlePrivateShare = async () => {
    try {
      // Update the Vostcard to mark it as shared but keep it private
      const vostcardRef = doc(db, 'vostcards', id!);
      await updateDoc(vostcardRef, {
        isShared: true
      });
      
      // Generate private share URL
      const privateUrl = `${window.location.origin}/share/${id}`;
      
      if (navigator.share) {
        navigator.share({
          title: vostcard.title || 'Check out this private Vostcard!',
          text: vostcard.description || 'I found an interesting private Vostcard',
          url: privateUrl
        }).catch(console.error);
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(privateUrl).then(() => {
          alert('Private share link copied to clipboard! This Vostcard remains private and won\'t appear on the map.');
        }).catch(() => {
          alert('Share this private link: ' + privateUrl);
        });
      }
    } catch (error) {
      console.error('Error sharing private Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  const handleViewOnMap = () => {
    if (!vostcard?.latitude || !vostcard?.longitude) {
      alert('This Vostcard does not have location data.');
      return;
    }

    // Navigate to home view with the Vostcard's location
    const navigationState = {
      browseLocation: {
        coordinates: [vostcard.latitude, vostcard.longitude],
        name: vostcard.title || 'Vostcard Location',
        id: vostcard.id,
        type: 'vostcard',
        place: vostcard.title || 'Vostcard Location',
      },
    };

    console.log('️ Navigating to map with Vostcard location:', navigationState);
    navigate('/home', { state: navigationState });
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
    if (!vostcard) return null;
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
    const { title, description, username, createdAt: rawCreatedAt } = vostcard;
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
            {videoURL && (
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                height: '711px', // 400 * (16/9) = 711 for 9:16 aspect ratio
                margin: '0 auto',
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: '#000'
              }}>
                <video
                  ref={videoRef}
                  src={videoURL}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover' // Fill the container
                  }}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    const { videoWidth, videoHeight } = video;
                    
                    console.log('📱 Vostcard playback:', {
                      videoWidth,
                      videoHeight,
                      isPortrait: videoHeight > videoWidth,
                      aspectRatio: videoWidth && videoHeight ? (videoWidth / videoHeight).toFixed(3) : 'unknown'
                    });
                  }}
                  playsInline
                  preload="metadata"
                />
              </div>
            )}
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
            {vostcard.state === 'private' && (
              <div 
                style={{ 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                  marginTop: 8
                }}
                onClick={handlePrivateShare}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ 
                  background: '#007aff', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: 20, 
                  fontSize: 14, 
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <FaLock size={12} />
                  Share Privately
                </div>
              </div>
            )}
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

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading Vostcard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: 'red', marginBottom: '16px' }}>{error}</div>
          <button 
            onClick={() => navigate(-1)}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!vostcard) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No Vostcard data</div>
        </div>
      </div>
    );
  }

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
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', // Changed to space-between
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '30px', marginLeft: 0 }}>Vōstcard</span>
        
        {/* View on Map Button */}
        {vostcard?.latitude && vostcard?.longitude && (
          <button
            style={{
              background: 'rgba(0,0,0,0.10)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginRight: 60, // Space for home button
            }}
            onClick={handleViewOnMap}
            title="View on Map"
          >
            <FaMap color="#fff" size={24} />
          </button>
        )}
        
        <button
          style={{
            position: 'absolute',
            right: 44,
            top: 15,
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/home')}
        >
          <FaHome color="#fff" size={36} />
        </button>
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
