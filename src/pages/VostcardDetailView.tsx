import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaFlag, FaSyncAlt, FaUserCircle, FaLock, FaMap, FaEnvelope } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
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

  const { user: authUser, username: authUsername } = useAuth();
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

        // First, check if it's already loaded in context (from MyVostcardListView)
        if (currentVostcard && currentVostcard.id === id) {
          console.log('✅ Using Vostcard from context');
          setVostcard(currentVostcard);
          setIsPrivate(true); // Context Vostcards are private
          setLoading(false);
          return;
        }

        // Try to load from Firebase (posted Vostcards)
        console.log('🔍 Trying Firebase...');
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log('✅ Found in Firebase');
          const data = docSnap.data();
          setVostcard({ id: docSnap.id, ...data });
          setIsPrivate(data.visibility === 'private'); // Check visibility field
          setLoading(false);
          return;
        }

        // Try to load from IndexedDB (private Vostcards)
        console.log('🔍 Trying IndexedDB...');
        
        // Load the Vostcard from IndexedDB
        await loadLocalVostcard(id);
        
        // Check if it was loaded into context
        if (currentVostcard && currentVostcard.id === id) {
          console.log('✅ Found in IndexedDB');
          setVostcard(currentVostcard);
          setIsPrivate(true); // Local Vostcards are private
          setLoading(false);
          return;
        }
        
        // If we get here, the Vostcard wasn't found
        console.log('❌ Vostcard not found in IndexedDB');
        setError('Vostcard not found');
        setLoading(false);

      } catch (error) {
        console.error('❌ Error loading Vostcard:', error);
        setError('Failed to load Vostcard');
        setLoading(false);
      }
    };

    fetchVostcard();
  }, [id, loadLocalVostcard, currentVostcard]);

  // Create video URL when vostcard is loaded
  useEffect(() => {
    if (vostcard?.video || vostcard?.videoURL) {
      try {
        let url: string;
        
        if (vostcard.video instanceof Blob) {
          // Local Vostcard with Blob video
          url = URL.createObjectURL(vostcard.video);
          console.log('📹 Created Blob URL for local video');
        } else if (typeof vostcard.video === 'string') {
          // Firebase Vostcard with string URL in video field
          url = vostcard.video;
          console.log('📹 Using Firebase URL for video (video field)');
        } else if (typeof vostcard.videoURL === 'string') {
          // Firebase Vostcard with string URL in videoURL field
          url = vostcard.videoURL;
          console.log('📹 Using Firebase URL for video (videoURL field)');
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
    } else {
      console.log('📹 No video found in vostcard:', {
        hasVideo: !!vostcard?.video,
        hasVideoURL: !!vostcard?.videoURL,
        vostcardKeys: vostcard ? Object.keys(vostcard) : 'no vostcard'
      });
      setVideoURL(null);
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
    if (vostcard && !isPrivate && authUser) {
      const cleanup = setupLikeListeners(vostcard.id, (count) => {
        setLikeCount(count);
      }, (isLiked) => {
        setLiked(isLiked);
      });
      return cleanup;
    }
  }, [vostcard, isPrivate, authUser, setupLikeListeners]);

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
    navigate('/flag-form', { state: { vostcardId: id, vostcardTitle: vostcard?.title, username: vostcard?.username } });
  };

  const handleShareClick = async () => {
    try {
      // Update the Vostcard to mark it as privately shared
      if (vostcard?.id) {
        const vostcardRef = doc(db, 'vostcards', vostcard.id);
        await updateDoc(vostcardRef, {
          isPrivatelyShared: true,
          sharedAt: new Date()
        });
      }
      
      // Generate private share URL
      const privateUrl = `${window.location.origin}/share/${id}`;
      
      // Get user's first name (extract from username or use display name)
      const getUserFirstName = () => {
        if (authUsername) {
          // If username contains spaces, take the first part
          return authUsername.split(' ')[0];
        } else if (authUser?.displayName) {
          return authUser.displayName.split(' ')[0];
        } else if (authUser?.email) {
          return authUser.email.split('@')[0];
        }
        return 'Anonymous';
      };

      // Create custom share message template with proper spacing
      const subjectLine = `Check out my Vōstcard "${vostcard?.title || 'Untitled Vostcard'}"`;
      const shareText = `Hi,

I made this with an app called Vōstcard

${privateUrl}

${vostcard?.description || ''}

Cheers,

${getUserFirstName()}`;
      
      if (navigator.share) {
        navigator.share({
          title: subjectLine,
          text: shareText,
          url: privateUrl
        }).catch(console.error);
      } else {
        // Fallback: copy to clipboard with full message
        navigator.clipboard.writeText(`${subjectLine}

${shareText}`).then(() => {
          alert('Private share message copied to clipboard! Copy the subject line from the message.');
        }).catch(() => {
          alert(`Share this private message: ${subjectLine}

${shareText}`);
        });
      }
    } catch (error) {
      console.error('Error sharing Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
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
      
      // Get user's first name (extract from username or use display name)
      const getUserFirstName = () => {
        if (authUsername) {
          // If username contains spaces, take the first part
          return authUsername.split(' ')[0];
        } else if (authUser?.displayName) {
          return authUser.displayName.split(' ')[0];
        } else if (authUser?.email) {
          return authUser.email.split('@')[0];
        }
        return 'Anonymous';
      };

      // Create custom share message template with proper spacing
      const subjectLine = `Check out my Vōstcard "${vostcard?.title || 'Untitled Vostcard'}"`;
      const shareText = `Hi,

I made this with an app called Vōstcard

${privateUrl}

${vostcard?.description || ''}

Cheers,

${getUserFirstName()}`;
      
      if (navigator.share) {
        navigator.share({
          title: subjectLine,
          text: shareText,
          url: privateUrl
        }).catch(console.error);
      } else {
        // Fallback: copy to clipboard with full message
        navigator.clipboard.writeText(`${subjectLine}

${shareText}`).then(() => {
          alert('Private share message copied to clipboard! This Vostcard remains private and won\'t appear on the map.');
        }).catch(() => {
          alert(`Share this private message: ${subjectLine}

${shareText}`);
        });
      }
    } catch (error) {
      console.error('Error sharing private Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  // Add the email sharing function
  const handleEmailShare = async () => {
    try {
      // Update the Vostcard to mark it as privately shared
      if (vostcard?.id) {
        const vostcardRef = doc(db, 'vostcards', vostcard.id);
        await updateDoc(vostcardRef, {
          isPrivatelyShared: true,
          sharedAt: new Date()
        });
      }
      
      // Generate private share URL
      const privateUrl = `${window.location.origin}/share/${id}`;
      
      // Get user's first name
      const getUserFirstName = () => {
        if (authUsername) {
          return authUsername.split(' ')[0];
        } else if (authUser?.displayName) {
          return authUser.displayName.split(' ')[0];
        } else if (authUser?.email) {
          return authUser.email.split('@')[0];
        }
        return 'Anonymous';
      };

      // Create email content with proper spacing
      const subjectLine = `Check out my Vōstcard "${vostcard?.title || 'Untitled Vostcard'}"`;
      const emailBody = `Hi,

I made this with an app called Vōstcard

${privateUrl}

${vostcard?.description || ''}

Cheers,

${getUserFirstName()}`;

      // Create mailto URL with subject and body
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open email client with pre-filled subject and body
      window.open(mailtoUrl, '_blank');
    } catch (error) {
      console.error('Error sharing Vostcard via email:', error);
      alert('Failed to share Vostcard via email. Please try again.');
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
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        maxHeight: '100vh',
        overflowY: 'scroll',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
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
            {userProfile?.avatarURL && !imageLoadError ? (
              <img 
                src={userProfile.avatarURL} 
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
          <span style={{ fontWeight: 500, fontSize: 24 }}>{vostcard?.username}</span>
        </div>
        {vostcard?.userID && (
          <FollowButton 
            targetUserId={vostcard.userID} 
            targetUsername={vostcard?.username}
            size="small"
            variant="secondary"
          />
        )}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 24, margin: '2px 0 8px 0' }}>{vostcard?.title}</div>

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
                  pointerEvents: 'none'
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

      {/* Action Icons - Add the email icon */}
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
        {/* Add Email Share Icon */}
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleEmailShare}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaEnvelope size={24} color="#222" style={{ marginBottom: 4 }} />
        </div>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleViewOnMap}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaMap size={24} color="#222" style={{ marginBottom: 4 }} />
        </div>
      </div>

      {/* Worth Seeing? Rating System */}
      <div style={{ textAlign: 'center', margin: '5px 0 0 0', fontSize: 18 }}>Worth Seeing?</div>
      <div style={{ margin: '8px 0 0 0' }}>
        <RatingStars
          currentRating={currentUserRating}
          averageRating={ratingStats.averageRating}
          ratingCount={ratingStats.ratingCount}
          onRate={handleRatingSubmit}
        />
      </div>

      {/* Description Link with FaFlag and FaSyncAlt icons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
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
            left: '20px'
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
            flex: '1 1 auto',
            textAlign: 'center',
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
            right: '20px'
          }}
        />
      </div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 }}>
        Posted: {vostcard?.createdAt ? (
          typeof vostcard.createdAt.toDate === 'function' ? vostcard.createdAt.toDate().toLocaleString() :
          vostcard.createdAt instanceof Date ? vostcard.createdAt.toLocaleString() :
          typeof vostcard.createdAt === 'string' || typeof vostcard.createdAt === 'number' ? new Date(vostcard.createdAt).toLocaleString() :
          String(vostcard.createdAt)
        ) : 'Unknown'}
      </div>
      
      {/* Modals */}
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
              {vostcard?.description || 'No description available.'}
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
    </div>
  );
};

export default VostcardDetailView;
