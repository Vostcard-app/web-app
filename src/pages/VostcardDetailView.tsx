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
import PrivateShareModal from '../components/PrivateShareModal';
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
  const [showPrivateShareModal, setShowPrivateShareModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('landscape');
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

  // Handle video orientation detection
  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement) => {
    const { videoWidth, videoHeight } = videoElement;
    const aspectRatio = videoWidth / videoHeight;
    
    console.log('📱 Video dimensions:', {
      videoWidth,
      videoHeight,
      aspectRatio: aspectRatio.toFixed(2),
      userAgent: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Other'
    });

    // Enhanced detection for iPhone portrait videos
    const isLikelyiPhonePortrait = (
      aspectRatio > 1.5 && aspectRatio < 2.0 &&
      (
        (videoWidth === 1920 && videoHeight === 1080) ||
        (videoWidth === 1280 && videoHeight === 720) ||
        aspectRatio >= 1.77 && aspectRatio <= 1.78
      )
    );

    if (isLikelyiPhonePortrait) {
      console.log('📱 Detected iPhone portrait video, applying rotation');
      setVideoOrientation('portrait');
    } else {
      setVideoOrientation('landscape');
    }
  };

  const handleFlagClick = () => {
    navigate('/flag-form', { state: { vostcardId: id, vostcardTitle: vostcard?.title } });
  };

  const handleShareClick = () => {
    setShowPrivateShareModal(true);
  };

  const createShareableVostcard = (): Vostcard | null => {
    if (!vostcard) return null;
    
    return {
      id: vostcard.id || id || '',
                    title: vostcard.title || 'Untitled Vostcard',
                    description: vostcard.description || 'No description',
      username: vostcard.username || 'Unknown',
      photoURLs: vostcard.photoURLs || [],
      videoURL: vostcard.videoURL || '',
      createdAt: vostcard.createdAt,
      userID: vostcard.userID || '',
      categories: vostcard.categories || [],
                    latitude: vostcard.latitude || vostcard.geo?.latitude || 0,
                    longitude: vostcard.longitude || vostcard.geo?.longitude || 0,
      state: vostcard.state || 'private'
    };
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
    <div style={{ 
      background: '#fff', 
      minHeight: '100vh', 
      fontFamily: 'system-ui, sans-serif',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch', // Enable smooth scrolling on iOS Safari
      scrollBehavior: 'smooth', // Smooth scrolling for modern browsers
      height: '100vh' // Ensure full viewport height for proper scrolling container
    }}>
      {/* Banner */}
      <div style={{ background: '#07345c', padding: '32px 0 24px 0', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, position: 'relative', textAlign: 'center' }}>
        <button style={{ position: 'absolute', right: 16, top: 36, background: 'rgba(0,0,0,0.10)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate('/home')}>
          <FaHome color="#fff" size={28} />
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
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  transform: videoOrientation === 'portrait' ? 'rotate(90deg)' : 'none',
                  transformOrigin: 'center center'
                }}
                muted
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
                pointerEvents: 'none'
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
          <FaRegComment size={32} color="#222" style={{ marginBottom: 4 }} />
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

      {/* Pin Placer Button - Only visible to creator */}
      {user && user.uid === vostcard?.userID && (
        <div style={{
          textAlign: 'center',
          margin: '24px 0 16px 0'
        }}>
          <button
            onClick={() => {
              // Navigate to Pin Placer tool with vostcard data
              navigate('/pin-placer', {
                state: {
                  pinData: {
                    id: vostcard.id || id,
                    title: vostcard.title || 'Untitled Vostcard',
                    description: vostcard.description || 'No description',
                    latitude: vostcard.latitude || vostcard.geo?.latitude || 0,
                    longitude: vostcard.longitude || vostcard.geo?.longitude || 0,
                    isOffer: false,
                    userID: vostcard.userID
                  }
                }
              });
            }}
            style={{
              backgroundColor: '#ff6b35',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e55a2b';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ff6b35';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.3)';
            }}
          >
            <FaMapPin size={16} />
            Pin Placer
          </button>
        </div>
      )}

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

      {/* Full-screen Video Modal */}
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
            
            {/* Video */}
            <video
              src={videoURL}
              style={{
                maxWidth: videoOrientation === 'portrait' ? '100vh' : '100%',
                maxHeight: videoOrientation === 'portrait' ? '100vw' : '100%',
                objectFit: 'contain',
                borderRadius: 0,
                boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                transform: videoOrientation === 'portrait' ? 'rotate(90deg)' : 'none',
                transformOrigin: 'center center',
              }}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              onContextMenu={e => e.preventDefault()}
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
            />
          </div>
        </div>
      )}

      {/* Private Share Modal */}
      {showPrivateShareModal && createShareableVostcard() && (
        <PrivateShareModal
          isOpen={showPrivateShareModal}
          onClose={() => setShowPrivateShareModal(false)}
          vostcard={createShareableVostcard()!}
        />
      )}
    </div>
  );
};

export default VostcardDetailView;
