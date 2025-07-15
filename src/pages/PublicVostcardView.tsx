import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaUserCircle, FaMap, FaTimes, FaLock, FaEnvelope } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';

const PublicVostcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const { fixBrokenSharedVostcard } = useVostcard();
  
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    ratingCount: 0
  });
  const [isPrivateShared, setIsPrivateShared] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showLikeMessage, setShowLikeMessage] = useState(false);
  
  // Add video ref for control management
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Add video control functions
  const handleVideoPlay = () => {
    if (videoRef.current) {
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.controls = false;
        }
      }, 1000);
    }
  };
  
  const handleVideoInteraction = () => {
    if (videoRef.current) {
      videoRef.current.controls = true;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.controls = false;
        }
      }, 3000);
    }
  };

  // Load vostcard data
  useEffect(() => {
    const fetchVostcard = async () => {
      if (!id) {
        setError('No vostcard ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setError('Loading timed out. Please try again.');
        setLoading(false);
      }, 15000); // 15 second timeout

      try {
        console.log('📱 Loading vostcard for sharing:', id);
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Vostcard found:', {
            id: data.id,
            state: data.state,
            isPrivatelyShared: data.isPrivatelyShared,
            title: data.title
          });
          
          if (data.state === 'posted' || data.isPrivatelyShared) {
            clearTimeout(timeoutId);
            setVostcard(data);
            setLikeCount(data.likeCount || 0);
            setRatingStats({
              averageRating: data.averageRating || 0,
              ratingCount: data.ratingCount || 0
            });
            setIsPrivateShared(data.isPrivatelyShared || false);
            setLoading(false);
            return;
          } else {
            console.log('📱 Vostcard found but not configured for sharing, attempting to fix...');
            
            // Try to fix the sharing configuration
            try {
              const fixed = await fixBrokenSharedVostcard(id);
              if (fixed) {
                console.log('📱 Vostcard fixed, retrying load...');
                
                // Retry loading after fix
                const retryDocSnap = await getDoc(docRef);
                if (retryDocSnap.exists()) {
                  const retryData = retryDocSnap.data();
                  if (retryData.state === 'posted' || retryData.isPrivatelyShared) {
                    clearTimeout(timeoutId);
                    setVostcard(retryData);
                    setLikeCount(retryData.likeCount || 0);
                    setRatingStats({
                      averageRating: retryData.averageRating || 0,
                      ratingCount: retryData.ratingCount || 0
                    });
                    setIsPrivateShared(retryData.isPrivatelyShared || false);
                    setLoading(false);
                    return;
                  }
                }
              }
            } catch (fixError) {
              console.error('📱 Failed to fix vostcard:', fixError);
            }
            
            // If we get here, the vostcard exists but can't be shared
            clearTimeout(timeoutId);
            setError('This Vostcard is not available for public viewing.');
            setLoading(false);
            return;
          }
        } else {
          console.log('📱 Vostcard not found in Firebase, attempting to fix...');
          
          // Second attempt - try to fix broken shared vostcard
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Vostcard potentially fixed, retrying load...');
              
              // Retry loading after fix attempt
              const retryDocSnap = await getDoc(docRef);
              if (retryDocSnap.exists()) {
                const retryData = retryDocSnap.data();
                console.log('📱 Retry successful, found vostcard:', {
                  id: retryData.id,
                  state: retryData.state,
                  isPrivatelyShared: retryData.isPrivatelyShared,
                  title: retryData.title
                });
                
                if (retryData.state === 'posted' || retryData.isPrivatelyShared) {
                  clearTimeout(timeoutId);
                  setVostcard(retryData);
                  setLikeCount(retryData.likeCount || 0);
                  setRatingStats({
                    averageRating: retryData.averageRating || 0,
                    ratingCount: retryData.ratingCount || 0
                  });
                  setIsPrivateShared(retryData.isPrivatelyShared || false);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix missing vostcard:', fixError);
          }
          
          // If we get here, the vostcard truly doesn't exist
          clearTimeout(timeoutId);
          setError('Vostcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('📱 Error loading vostcard:', err);
        clearTimeout(timeoutId);
        setError('Failed to load Vostcard. Please check your internet connection and try again.');
        setLoading(false);
      }
    };

    fetchVostcard();
  }, [id, fixBrokenSharedVostcard]);

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

  // Add keyboard support for photo modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPhoto(null);
      }
    };

    if (selectedPhoto) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedPhoto]);

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

  const handleLikeToggle = async () => {
    if (!user) {
      // For anonymous users, show a message
      setShowLikeMessage(true);
      setTimeout(() => setShowLikeMessage(false), 3000);
      return;
    }

    try {
      // Toggle like logic here
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
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
    const subjectLine = `Look what I made with Vōstcard "${vostcard.title || 'Untitled Vostcard'}"`;
    const shareText = `Hi, I've sent you a Vostcard

Check it out.

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

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: 18,
        background: '#fff',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #07345c',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <div style={{ marginBottom: '10px' }}>Loading Vostcard...</div>
        <div style={{ 
          fontSize: 14, 
          color: '#666',
          maxWidth: '300px',
          lineHeight: 1.4
        }}>
          This may take a moment if the vostcard needs to be synced from the creator's device.
        </div>
        
        {/* Add CSS for spinner animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
        background: '#fff',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '16px' 
        }}>
          {error?.includes('not found') ? 'Vostcard Not Found' : 'Unable to Load Vostcard'}
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: '#666', 
          marginBottom: '24px',
          maxWidth: '400px',
          lineHeight: 1.5
        }}>
          {error?.includes('not found') 
            ? 'This vostcard may have been deleted or the link is invalid. Please check the link and try again.'
            : error?.includes('not available') 
            ? 'This vostcard is private and not available for public viewing.'
            : error?.includes('timed out')
            ? 'The vostcard is taking too long to load. This may happen if it needs to be synced from the creator\'s device.'
            : error || 'There was an error loading the vostcard.'
          }
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Join Vōstcard
          </button>
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
      background: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      height: '100vh'
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%', 
            overflow: 'hidden',
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={vostcardUsername || 'User'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
              />
            ) : (
              <FaUserCircle size={50} color="#ccc" />
            )}
          </div>
          <div style={{ 
            fontWeight: 600, 
            fontSize: 14,
            color: '#333'
          }}>
            {vostcardUsername || 'Unknown User'}
          </div>
        </div>
        <button
          type="button"
          style={{
            cursor: 'pointer',
            transition: 'transform 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#002B4D',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            border: 'none',
            transform: 'translateX(-20px)',
            zIndex: 9999,
            position: 'relative'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Free Account button clicked!');
            navigate('/user-guide');
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Free Account button touched!');
            navigate('/user-guide');
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'translateX(-20px) scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'translateX(-20px) scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(-20px) scale(1)'}
        >
          Free Account
        </button>
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
          animation: 'slideDown 0.3s ease-out',
          textAlign: 'center',
          maxWidth: '300px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 4 }}>❤️ Like saved!</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              <button
                onClick={() => navigate('/user-guide')}
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

      {/* Scrollable Main Content */}
      <div style={{ 
        marginTop: 120,
        padding: '16px 16px 40px 16px',
        minHeight: 'calc(100vh - 120px)',
        boxSizing: 'border-box',
        overflowY: 'auto',
        height: 'calc(100vh - 120px)',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      } as React.CSSProperties}>
        {/* Map and Heart Icons - Above Title */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 24,
          marginBottom: '16px',
          marginTop: '25px'
        }}>
          {/* Map Icon */}
          <div 
            style={{
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}
            onClick={() => {
              navigate('/public-map', {
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
            <FaMap size={28} color="#333" />
          </div>

          {/* Heart Icon */}
          <div 
            style={{ 
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              background: isLiked ? '#ffe6e6' : '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: isLiked ? '1px solid #ffb3b3' : '1px solid #e0e0e0',
              minWidth: '80px'
            }}
            onClick={handleLikeToggle}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FaHeart 
              size={28} 
              color={isLiked ? "#ff4444" : "#333"} 
              style={{ 
                transition: 'color 0.2s ease',
                filter: isLiked ? 'drop-shadow(0 0 4px rgba(255,68,68,0.5))' : 'none'
              }} 
            />
            <span style={{ 
              fontSize: 18, 
              fontWeight: 600,
              color: isLiked ? "#ff4444" : "#333"
            }}>
              {likeCount}
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ 
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {title || 'Untitled'}
        </div>

        {/* Video/Photo Display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: '16px' }}>
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
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#666'
              }}>
                No Video
              </div>
            )}
          </div>

          {/* Photos Grid */}
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
                  height: '116px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPhoto(url)}
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
                <FaMap size={20} />
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ 
          color: '#333',
          lineHeight: 1.5,
          fontSize: 16,
          marginBottom: '16px'
        }}>
          {description || 'No description available.'}
        </div>

        <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginBottom: '24px' }}>
          Posted: {createdAt}
        </div>

        {/* Bottom message and link */}
        <div style={{ 
          textAlign: 'center', 
          borderTop: '1px solid #eee',
          paddingTop: '24px',
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

      {/* Video Modal */}
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
              padding: '20px'
            }}
            onClick={() => setShowVideoModal(false)}
          >
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
                ref={videoRef}
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
                onPlay={handleVideoPlay}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoInteraction();
                }}
                onMouseMove={handleVideoInteraction}
                onTouchStart={handleVideoInteraction}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </div>

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

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
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

      {/* CSS Animation */}
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
        
        /* Prevent bounce scrolling on body when this page is active */
        body {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }
        
        /* Ensure smooth scrolling on iOS */
        * {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};

export default PublicVostcardView; 