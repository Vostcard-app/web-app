import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaUserCircle, FaMapPin, FaTimes, FaLock } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const PublicVostcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showRegistrationInvite, setShowRegistrationInvite] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    ratingCount: 0
  });
  const [isPrivateShared, setIsPrivateShared] = useState(false);

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

  // Show registration invite after 3 seconds
  useEffect(() => {
    if (vostcard && !loading) {
      const timer = setTimeout(() => {
        setShowRegistrationInvite(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [vostcard, loading]);

  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement) => {
    const { videoWidth, videoHeight } = videoElement;
    
    console.log('�� Video dimensions (ALWAYS PORTRAIT):', {
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
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'red', 
        fontSize: 24,
        background: '#fff'
      }}>
        {error || 'Vostcard not found'}
      </div>
    );
  }

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
    <div style={{ 
      background: '#fff', 
      minHeight: '100vh', 
      fontFamily: 'system-ui, sans-serif',
      position: 'relative'
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

      {/* Main Content */}
      <div style={{ paddingTop: 70 }}>
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
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 8,
            width: 180,
            height: 240
          }}>
            {photoURLs.slice(0, 4).map((url: string, index: number) => (
              <div 
                key={index}
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 8, 
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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
            {photoURLs.length < 4 && Array.from({ length: 4 - photoURLs.length }).map((_, index) => (
              <div 
                key={`empty-${index}`}
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ccc'
                }}
              >
                <FaMapPin size={20} />
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '16px 0 0 0' }}>
          <div style={{ textAlign: 'center' }}>
            <FaHeart size={24} color="#222" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 18 }}>{likeCount}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <FaStar size={24} color="#ffc107" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 18 }}>{ratingStats.averageRating.toFixed(1)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <FaRegComment size={24} color="#222" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 18 }}>0</div>
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

        {/* Share Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          margin: '16px 0 0 0',
          padding: '0 16px'
        }}>
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

          {/* Add a private share button for private Vostcards */}
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

        <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8, padding: '0 16px' }}>
          Posted: {createdAt}
        </div>
      </div>

      {/* Registration Invitation Overlay */}
      <AnimatePresence>
        {showRegistrationInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(135deg, #002B4D 0%, #07345c 100%)',
              color: 'white',
              padding: '24px 20px 40px 20px',
              zIndex: 1000,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <button
              onClick={() => setShowRegistrationInvite(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: 8
              }}
            >
              <FaTimes size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>
                Join Vōstcard!
              </h2>
              <p style={{ fontSize: 16, opacity: 0.9, margin: 0, lineHeight: 1.4 }}>
                It's free, you can make and share your own Vōstcards, and see Vōstcards from around the world.
              </p>
              <button
                onClick={() => navigate('/user-guide')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#87CEEB',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 16,
                  marginTop: 8,
                  padding: 0
                }}
              >
                To find out more click here
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleJoinNow}
                style={{
                  flex: 1,
                  background: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Join Now
              </button>
              <button
                onClick={handleLogin}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 12,
                  padding: '16px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              justifyContent: 'center'
            }}
            onClick={() => setShowVideoModal(false)}
          >
            <div style={{ 
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}>
              <video 
                src={videoURL} 
                controls
                autoPlay
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: 8
                }}
                onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicVostcardView; 