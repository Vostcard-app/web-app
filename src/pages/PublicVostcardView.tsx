import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaUserCircle, FaMapPin, FaTimes, FaLock, FaEnvelope } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';

const PublicVostcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [likeCount, setLikeCount] = useState(0);
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    ratingCount: 0
  });
  const [isPrivateShared, setIsPrivateShared] = useState(false);
  const [isLiked, setIsLiked] = useState(false); // Track if current user liked
  const [showLikeMessage, setShowLikeMessage] = useState(false); // Show registration encouragement
  const { user, username } = useAuth();
  const { debugSpecificVostcard, fixBrokenSharedVostcard } = useVostcard();

  // Add debug handlers
  const handleDebugVostcard = async () => {
    if (!id) return;
    
    console.log('🔍 Starting debug for vostcard:', id);
    try {
      await debugSpecificVostcard(id);
      console.log('✅ Debug completed - check console for details');
    } catch (error) {
      console.error('❌ Debug failed:', error);
    }
  };

  const handleFixVostcard = async () => {
    if (!id) return;
    
    console.log('🔧 Starting fix for vostcard:', id);
    try {
      const fixed = await fixBrokenSharedVostcard(id);
      if (fixed) {
        console.log('✅ Vostcard fixed successfully');
        alert('Vostcard fixed! Try refreshing the page.');
        // Optionally refresh the page
        window.location.reload();
      } else {
        console.log('❌ Could not fix vostcard');
        alert('Could not fix vostcard. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Fix failed:', error);
      alert('Fix failed. Check console for details.');
    }
  };

  // Anonymous like management using localStorage
  const getAnonymousLikeKey = (vostcardId: string) => `anonymous_like_${vostcardId}`;
  const getAnonymousLikeCountKey = (vostcardId: string) => `anonymous_like_count_${vostcardId}`;

  // Check if anonymous user has liked this vostcard
  const checkAnonymousLike = (vostcardId: string) => {
    return localStorage.getItem(getAnonymousLikeKey(vostcardId)) === 'true';
  };

  // Get stored anonymous like count for this vostcard
  const getStoredAnonymousLikeCount = (vostcardId: string) => {
    const stored = localStorage.getItem(getAnonymousLikeCountKey(vostcardId));
    return stored ? parseInt(stored, 10) : 0;
  };

  // Store anonymous like count for this vostcard
  const setStoredAnonymousLikeCount = (vostcardId: string, count: number) => {
    localStorage.setItem(getAnonymousLikeCountKey(vostcardId), count.toString());
  };

  // Initialize like state when vostcard loads
  useEffect(() => {
    if (vostcard && id) {
      if (user) {
        // For registered users, you could implement actual like checking here
        setIsLiked(false); // Placeholder - implement actual like checking
      } else {
        // For anonymous users, check localStorage
        const anonymousLiked = checkAnonymousLike(id);
        setIsLiked(anonymousLiked);
        
        // Add stored anonymous likes to the displayed count
        const storedAnonymousCount = getStoredAnonymousLikeCount(id);
        setLikeCount(prev => prev + storedAnonymousCount);
      }
    }
  }, [vostcard, id, user]);

  // Handle like toggle for both registered and anonymous users
  const handleLikeToggle = () => {
    if (!id) return;

    if (user) {
      // For registered users - implement actual Firebase like toggle
      console.log('Registered user like toggle - implement Firebase logic');
      // TODO: Implement actual like service call here
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    } else {
      // For anonymous users - use localStorage
      const currentlyLiked = checkAnonymousLike(id);
      const newLikedState = !currentlyLiked;
      
      // Store the like state
      localStorage.setItem(getAnonymousLikeKey(id), newLikedState.toString());
      
      // Update local state
      setIsLiked(newLikedState);
      
      // Update like count
      const currentStoredCount = getStoredAnonymousLikeCount(id);
      const newStoredCount = newLikedState ? currentStoredCount + 1 : Math.max(0, currentStoredCount - 1);
      setStoredAnonymousLikeCount(id, newStoredCount);
      
      // Update displayed count
      setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
      
      // Show registration encouragement message
      if (newLikedState) {
        setShowLikeMessage(true);
        setTimeout(() => setShowLikeMessage(false), 3000);
      }
    }
  };

  useEffect(() => {
    const fetchVostcard = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'vostcards', id!);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Allow viewing of posted vostcards or privately shared vostcards
          if (data.state === 'posted' || data.isPrivatelyShared) {
            setVostcard(data);
            setLikeCount(data.likeCount || 0);
            setRatingStats({
              averageRating: data.averageRating || 0,
              ratingCount: data.ratingCount || 0
            });
            setIsPrivateShared(data.isPrivatelyShared || false);
          } else {
            setError('This Vostcard is not available for public viewing.');
            setLoading(false);
            return;
          }
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

  // Add keyboard support for video modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showVideoModal) {
        setShowVideoModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showVideoModal]);

  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement) => {
    const { videoWidth, videoHeight } = videoElement;
    
    console.log('🎬 Video dimensions (ALWAYS PORTRAIT):', {
      videoWidth,
      videoHeight,
      aspectRatio: videoWidth && videoHeight ? (videoWidth / videoHeight).toFixed(2) : 'unknown'
    });

    // All videos are portrait
    setVideoOrientation('portrait');
  };

  const handleShareClick = () => {
    // Generate public share URL
    const publicUrl = `${window.location.origin}/share/${id}`;
    
    // Get user's first name (extract from username or use display name)
    const getUserFirstName = () => {
      if (username) {
        // If username contains spaces, take the first part
        return username.split(' ')[0];
      } else if (user?.displayName) {
        return user.displayName.split(' ')[0];
      } else if (user?.email) {
        return user.email.split('@')[0];
      }
      return 'Anonymous';
    };

    // Create custom share message template with proper spacing
    const subjectLine = `Check out my Vōstcard "${vostcard.title || 'Untitled Vostcard'}"`;
    const shareText = `Hi,

I made this with an app called Vōstcard

${publicUrl}

${vostcard.description || ''}

Cheers,

${getUserFirstName()}`;
    
    if (navigator.share) {
      navigator.share({
        title: subjectLine,
        text: shareText,
        url: publicUrl
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard with full message
      navigator.clipboard.writeText(`${subjectLine}

${shareText}`).then(() => {
        alert('Share message copied to clipboard!');
      }).catch(() => {
        alert(`Share this message: ${subjectLine}

${shareText}`);
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
      
      // Get user's first name (extract from username or use display name)
      const getUserFirstName = () => {
        if (username) {
          // If username contains spaces, take the first part
          return username.split(' ')[0];
        } else if (user?.displayName) {
          return user.displayName.split(' ')[0];
        } else if (user?.email) {
          return user.email.split('@')[0];
        }
        return 'Anonymous';
      };

      // Create custom share message template with proper spacing
      const subjectLine = `Check out my Vōstcard "${vostcard.title || 'Untitled Vostcard'}"`;
      const shareText = `Hi,

I made this with an app called Vōstcard

${privateUrl}

${vostcard.description || ''}

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

  const handleJoinNow = () => {
    navigate('/register', { 
      state: { 
        fromSharedVostcard: true,
        vostcardId: id,
        vostcardTitle: vostcard?.title 
      } 
    });
  };

  const handleLogin = () => {
    navigate('/login', { 
      state: { 
        fromSharedVostcard: true,
        vostcardId: id,
        vostcardTitle: vostcard?.title 
      } 
    });
  };

  // Add FaEnvelope to the imports
  // Add the email sharing function
  const handleEmailShare = async () => {
    try {
      if (!id) {
        throw new Error('No vostcard ID');
      }

      // First, ensure the vostcard exists in Firebase with proper sharing flags
      await fixBrokenSharedVostcard(id);

      // Generate email-specific share URL
      const emailUrl = `${window.location.origin}/email/${id}`;
      
      // Get user's first name
      const getUserFirstName = () => {
        if (username) {
          return username.split(' ')[0];
        } else if (user?.displayName) {
          return user.displayName.split(' ')[0];
        } else if (user?.email) {
          return user.email.split('@')[0];
        }
        return 'Anonymous';
      };

      // Create email content using the exact template specified
      const subjectLine = `Check out my Vōstcard: "${vostcard.title || 'Title'}"`;
      
      const emailBody = `Hi,

I made this with an app called Vōstcard

View it here: ${emailUrl}

${vostcard.description || 'Description'}

Cheers!

${getUserFirstName()}`;
      
      // Create mailto URL
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open email client
      window.open(mailtoUrl, '_blank');
      
    } catch (error) {
      console.error('Error sharing Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  // Add the private email sharing function
  const handlePrivateEmailShare = async () => {
    try {
      if (!id) {
        throw new Error('No vostcard ID');
      }

      // First, ensure the vostcard exists in Firebase with proper sharing flags
      await fixBrokenSharedVostcard(id);

      // Generate email-specific share URL
      const emailUrl = `${window.location.origin}/email/${id}`;
      
      // Get user's first name
      const getUserFirstName = () => {
        if (username) {
          return username.split(' ')[0];
        } else if (user?.displayName) {
          return user.displayName.split(' ')[0];
        } else if (user?.email) {
          return user.email.split('@')[0];
        }
        return 'Anonymous';
      };

      // Create email content using the exact template specified
      const subjectLine = `Check out my Vōstcard: "${vostcard.title || 'Title'}"`;
      
      const emailBody = `Hi,

I made this with an app called Vōstcard

View it here: ${emailUrl}

${vostcard.description || 'Description'}

Cheers!

${getUserFirstName()}`;
      
      // Create mailto URL with subject and body
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open email client with pre-filled subject and body
      window.open(mailtoUrl, '_blank');
      
    } catch (error) {
      console.error('Error sharing private Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: 24,
        background: '#fff'
      }}>
        Loading...
      </div>
    );
  }

  if (error || !vostcard) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'red', 
        fontSize: 24,
        background: '#fff',
        padding: '20px'
      }}>
        <div style={{ marginBottom: '20px' }}>
          {error || 'Vostcard not found'}
        </div>
        
        {/* Debug buttons for troubleshooting */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={handleDebugVostcard}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔍 Debug This Vostcard
          </button>
          
          <button 
            onClick={handleFixVostcard}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔧 Fix This Vostcard
          </button>
        </div>
        
        <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
          ID: {id}<br/>
          Use the debug button to see detailed information in the console.
        </div>
      </div>
    );
  }

  const { title, description, photoURLs = [], videoURL, username: vostcardUsername, createdAt: rawCreatedAt } = vostcard;
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
    <div style={{ 
      background: '#fff', 
      minHeight: '100vh', 
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
      // Enhanced scrolling properties
      overflowY: 'auto', // Ensure vertical scrolling
      WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
      height: '100vh' // Set explicit height to enable scrolling
    }}>
      {/* Fixed Header */}
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
        height: 30,
        display: 'flex',
        alignItems: 'center',
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '30px', marginLeft: 0 }}>Vōstcard</span>
      </div>

      {/* Navigation Icons - Under the banner */}
      <div style={{
        position: 'fixed',
        top: 70,
        left: 0,
        width: '100%',
        zIndex: 9,
        background: '#fff',
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 20
      }}>
        {/* Join Button - Updated styling to match HomeView */}
        <div 
          style={{ 
            cursor: 'pointer',
            transition: 'transform 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#002B4D', // Dark blue like HomeView
            color: 'white',
            padding: '12px 20px', // Square proportions like HomeView
            borderRadius: '8px', // More square like HomeView
            fontSize: 16,
            fontWeight: 500, // Medium weight like HomeView
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)', // Subtle shadow like HomeView
            pointerEvents: 'auto'
          }}
          onClick={() => navigate('/register')}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Join
        </div>

        {/* Map Icon - Modified to show only this vostcard */}
        <div 
          style={{ 
            cursor: 'pointer',
            transition: 'transform 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            // Navigate to map showing only this vostcard
            navigate('/home', {
              state: {
                singleVostcard: {
                  id: vostcard.id,
                  title: vostcard.title,
                  description: vostcard.description,
                  latitude: vostcard.latitude,
                  longitude: vostcard.longitude,
                  videoURL: vostcard.videoURL,
                  photoURLs: vostcard.photoURLs,
                  username: vostcard.username,
                  isOffer: vostcard.isOffer,
                  offerDetails: vostcard.offerDetails,
                  categories: vostcard.categories,
                  createdAt: vostcard.createdAt,
                  visibility: 'public',
                  state: 'posted'
                }
              }
            });
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaMapPin size={24} color="#222" />
        </div>

        {/* Heart Icon - Moved from stats section */}
        <div 
          style={{ 
            cursor: 'pointer',
            transition: 'transform 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4
          }}
          onClick={handleLikeToggle}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaHeart 
            size={24} 
            color={isLiked ? "#ff4444" : "#222"} 
            style={{ 
              transition: 'color 0.2s ease',
              filter: isLiked ? 'drop-shadow(0 0 4px rgba(255,68,68,0.5))' : 'none'
            }} 
          />
          <span style={{ fontSize: 18, color: '#222' }}>{likeCount}</span>
        </div>
      </div>

      {/* Like Message for Anonymous Users */}
      {showLikeMessage && (
        <div style={{
          position: 'fixed',
          top: '140px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#002B4D',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          zIndex: 1000,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 4 }}>❤️ Like saved!</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              <button
                onClick={() => navigate('/register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#87CEEB',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: 0
                }}
              >
                Join Vōstcard
              </button>
              {' '}to sync across devices
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animation for the message */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {/* Main Content - Enhanced scrolling container */}
      <div style={{ 
        paddingTop: 120,
        paddingBottom: 40, // Add bottom padding for better scroll experience
        // Enhanced scrolling properties
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth' // Smooth scrolling for anchor links
      }}>
        {/* User Info */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '16px 16px 8px 16px',
          borderBottom: '1px solid #eee'
        }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', 
            overflow: 'hidden', 
            marginRight: 12,
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={username || 'User'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
              />
            ) : (
              <FaUserCircle size={48} color="#ccc" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{username || 'Unknown User'}</div>
            <div style={{ color: '#888', fontSize: 14 }}>Shared Vostcard</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ 
          padding: '16px 16px 8px 16px',
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2
        }}>
          {title || 'Untitled'}
        </div>

        {/* Video/Photo Display */}
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
            onClick={(e) => {
              e.stopPropagation();
              if (videoURL) setShowVideoModal(true);
            }}
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
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
                  muted
                  loop
                  playsInline
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '12px solid white',
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    marginLeft: 4
                  }} />
                </div>
              </>
            ) : 
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#666'
              }}>
                No Video
              </div>
            }
          </div>

          {/* Photos Grid - Changed to show only 2 photos */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 8,
            width: 180,
            height: 240
          }}>
            {photoURLs.slice(0, 2).map((url: string, index: number) => (
              <div 
                key={index}
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 8, 
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '116px' // Half the height minus gap
                }}
              >
                <img 
                  src={url} 
                  alt={`Photo ${index + 1}`} 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              </div>
            ))}
            {photoURLs.length < 2 && Array.from({ length: 2 - photoURLs.length }).map((_, index) => (
              <div 
                key={`empty-${index}`}
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ccc',
                  height: '116px'
                }}
              >
                <FaMapPin size={20} />
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ 
          padding: '16px 16px 8px 16px',
          color: '#333',
          lineHeight: 1.5,
          fontSize: 16
        }}>
          {description || 'No description available.'}
        </div>

        <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8, padding: '0 16px' }}>
          Posted: {createdAt}
        </div>

        {/* Bottom message and link */}
        <div style={{ 
          padding: '24px 16px 40px 16px', // Extra bottom padding for scroll clearance
          textAlign: 'center', 
          borderTop: '1px solid #eee',
          marginTop: '24px'
        }}>
          <div style={{ 
            color: '#666', 
            fontSize: 14, 
            lineHeight: 1.4, 
            marginBottom: '12px' 
          }}>
            This was made with Vōstcard, a free app that lets you create, share privately or post to the map and see Vōstcards anywhere they are posted
          </div>
          <button
            onClick={() => navigate('/user-guide')}
            style={{
              background: 'none',
              border: 'none',
              color: '#007aff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0
            }}
          >
            Learn more about Vōstcard
          </button>
        </div>
      </div>

      {/* Remove the Registration Invitation Overlay completely */}

      {/* Video Modal - Improved with better mobile support */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px' // Add padding for better mobile experience
            }}
            onClick={() => setShowVideoModal(false)}
          >
            {/* Close button - prominent and easy to tap */}
            <button
              onClick={() => setShowVideoModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2001,
                fontSize: '18px',
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
            >
              <FaTimes />
            </button>

            {/* Video container */}
            <div style={{ 
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <video 
                src={videoURL} 
                controls
                autoPlay
                playsInline
                webkit-playsinline="true"
                controlsList="nodownload nofullscreen noremoteplayback"
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: 8,
                  backgroundColor: '#000'
                }}
                onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.preventDefault(); // Prevent double-click fullscreen
                  e.stopPropagation();
                }}
                onFullscreenChange={(e) => {
                  console.log('📹 Video fullscreen change in modal:', e);
                }}
                onWebkitFullscreenChange={(e) => {
                  console.log('📹 Video webkit fullscreen change in modal:', e);
                }}
              />
            </div>

            {/* Tap instructions for mobile */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              Tap outside video or ✕ to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Buttons */}
      <button onClick={() => debugSpecificVostcard('7a90077c-a140-420c-888a-d3ebfd5607dd')}>
        Debug This Vostcard
      </button>
      
      <button onClick={() => fixBrokenSharedVostcard('7a90077c-a140-420c-888a-d3ebfd5607dd')}>
        Fix This Vostcard
      </button>

      {/* Temporary Debug Buttons - Add before closing </div> */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <button 
          onClick={() => debugSpecificVostcard(id!)}
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🔍 Debug Photos
        </button>
        
        <button 
          onClick={() => fixBrokenSharedVostcard(id!)}
          style={{
            padding: '10px 15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🔧 Re-upload Photos
        </button>
      </div>
    </div>
  );
};

export default PublicVostcardView; 