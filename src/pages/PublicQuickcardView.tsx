import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaRegComment, FaShare, FaUserCircle, FaMap, FaTimes, FaSync, FaFlag, FaArrowLeft } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';

const PublicQuickcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const { fixBrokenSharedVostcard } = useVostcard();
  
  const [quickcard, setQuickcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isPrivateShared, setIsPrivateShared] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showLikeMessage, setShowLikeMessage] = useState(false);

  // Load quickcard data
  useEffect(() => {
    const fetchQuickcard = async () => {
      if (!id) {
        setError('No quickcard ID provided');
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
        console.log('📱 Loading quickcard for sharing:', id);
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Quickcard found:', {
            id: data.id,
            state: data.state,
            isPrivatelyShared: data.isPrivatelyShared,
            title: data.title,
            isQuickcard: data.isQuickcard
          });
          
          if (!data.isQuickcard) {
            setError('This is not a quickcard.');
            setLoading(false);
            return;
          }
          
          if (data.state === 'posted' || data.isPrivatelyShared) {
            clearTimeout(timeoutId);
            setQuickcard(data);
            setLikeCount(data.likeCount || 0);
            setIsPrivateShared(data.isPrivatelyShared || false);
            setLoading(false);
            return;
          } else {
            console.log('📱 Quickcard found but not configured for sharing, attempting to fix...');
            
            // Try to fix the sharing configuration
            try {
              const fixed = await fixBrokenSharedVostcard(id);
              if (fixed) {
                console.log('📱 Quickcard fixed, retrying load...');
                
                // Retry loading after fix
                const retryDocSnap = await getDoc(docRef);
                if (retryDocSnap.exists()) {
                  const retryData = retryDocSnap.data();
                  if (retryData.isQuickcard && (retryData.state === 'posted' || retryData.isPrivatelyShared)) {
                    clearTimeout(timeoutId);
                    setQuickcard(retryData);
                    setLikeCount(retryData.likeCount || 0);
                    setIsPrivateShared(retryData.isPrivatelyShared || false);
                    setLoading(false);
                    return;
                  }
                }
              }
            } catch (fixError) {
              console.error('📱 Failed to fix quickcard:', fixError);
            }
            
            // If we get here, the quickcard exists but can't be shared
            clearTimeout(timeoutId);
            setError('This Quickcard is not available for public viewing.');
            setLoading(false);
            return;
          }
        } else {
          console.log('📱 Quickcard not found in Firebase, attempting to fix...');
          
          // Second attempt - try to fix broken shared quickcard
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Quickcard potentially fixed, retrying load...');
              
              // Retry loading after fix attempt
              const retryDocSnap = await getDoc(docRef);
              if (retryDocSnap.exists()) {
                const retryData = retryDocSnap.data();
                console.log('📱 Retry successful, found quickcard:', {
                  id: retryData.id,
                  state: retryData.state,
                  isPrivatelyShared: retryData.isPrivatelyShared,
                  title: retryData.title,
                  isQuickcard: retryData.isQuickcard
                });
                
                if (retryData.isQuickcard && (retryData.state === 'posted' || retryData.isPrivatelyShared)) {
                  clearTimeout(timeoutId);
                  setQuickcard(retryData);
                  setLikeCount(retryData.likeCount || 0);
                  setIsPrivateShared(retryData.isPrivatelyShared || false);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix missing quickcard:', fixError);
          }
          
          // If we get here, the quickcard truly doesn't exist
          clearTimeout(timeoutId);
          setError('Quickcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('📱 Error loading quickcard:', err);
        clearTimeout(timeoutId);
        setError('Failed to load Quickcard. Please check your internet connection and try again.');
        setLoading(false);
      }
    };

    fetchQuickcard();
  }, [id, fixBrokenSharedVostcard]);

  // Fetch user profile when quickcard is loaded
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!quickcard?.userID) return;
      
      try {
        const userRef = doc(db, 'users', quickcard.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (quickcard?.userID) {
      fetchUserProfile();
    }
  }, [quickcard?.userID]);

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

  const handleShareClick = async () => {
    try {
      if (quickcard?.id) {
        const quickcardRef = doc(db, 'vostcards', quickcard.id);
        await updateDoc(quickcardRef, {
          isPrivatelyShared: true,
          sharedAt: new Date()
        });
      }
      
      const privateUrl = `${window.location.origin}/share-quickcard/${id}`;
      
      const shareText = `Check it out I made this with Vōstcard


"${quickcard.title || 'Untitled Quickcard'}"


"${quickcard.description || 'No description'}"


${privateUrl}`;
      
      if (navigator.share) {
        navigator.share({
          text: shareText
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Private share message copied to clipboard!');
        }).catch(() => {
          alert(`Share this message: ${shareText}`);
        });
      }
    } catch (error) {
      console.error('Error sharing Quickcard:', error);
      alert('Failed to share Quickcard. Please try again.');
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
        <div style={{ marginBottom: '10px' }}>Loading Quickcard...</div>
        <div style={{ 
          fontSize: 14, 
          color: '#666',
          maxWidth: '300px',
          lineHeight: 1.4
        }}>
          This may take a moment if the quickcard needs to be synced from the creator's device.
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

  if (error || !quickcard) {
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
          {error?.includes('not found') ? 'Quickcard Not Found' : 'Unable to Load Quickcard'}
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: '#666', 
          marginBottom: '24px',
          maxWidth: '400px',
          lineHeight: 1.5
        }}>
          {error?.includes('not found') 
            ? 'This quickcard may have been deleted or the link is invalid. Please check the link and try again.'
            : error?.includes('not available') 
            ? 'This quickcard is private and not available for public viewing.'
            : error?.includes('timed out')
            ? 'The quickcard is taking too long to load. This may happen if it needs to be synced from the creator\'s device.'
            : error || 'There was an error loading the quickcard.'
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

  const { title, description, photoURLs = [], username: quickcardUsername, createdAt: rawCreatedAt } = quickcard;
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
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y'
    }}>
      {/* Banner */}
      <div style={{
        background: '#07345c',
        padding: '15px 0 24px 0',
        textAlign: 'left',
        paddingLeft: '16px',
        height: 30,
        display: 'flex',
        alignItems: 'center',
      }}>
        <span 
          onClick={() => navigate('/home')}
          style={{ color: 'white', fontWeight: 700, fontSize: '30px', marginLeft: 0, cursor: 'pointer' }}>Vōstcard</span>
      </div>

      {/* 20% Container with User Info */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '20%', // 20% height
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '5px 20px 20px 20px'
        }}>
          {/* Avatar and Username - Left Justified */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ 
              width: 60, 
              height: 60, 
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
                  alt={quickcardUsername || 'User'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
                />
              ) : (
                <FaUserCircle size={60} color="#ccc" />
              )}
            </div>
            <div style={{ 
              fontWeight: 600, 
              fontSize: 18,
              color: '#333'
            }}>
              {quickcardUsername || 'Unknown User'}
            </div>
          </div>
        </div>
      </div>

      {/* Like Message for Anonymous Users */}
      {showLikeMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
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
        padding: '16px 16px 40px 16px',
        minHeight: 'calc(100vh - 200px)',
        boxSizing: 'border-box'
      }}>
        {/* Map Icon, Heart Icon, and Free Account Button - All on same line */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 16,
          marginBottom: '16px',
          marginTop: '25px',
          flexWrap: 'wrap'
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
              // Navigate all users to public map view regardless of authentication status
              if (quickcard.latitude && quickcard.longitude) {
                console.log('📍 Opening quickcard location on public map for all users');
                navigate('/public-map', {
                  state: {
                    singleVostcard: {
                      id: quickcard.id,
                      title: quickcard.title,
                      description: quickcard.description,
                      latitude: quickcard.latitude,
                      longitude: quickcard.longitude,
                      photoURLs: quickcard.photoURLs,
                      username: quickcard.username,
                      isOffer: false,
                      isQuickcard: true,
                      categories: quickcard.categories,
                      createdAt: quickcard.createdAt,
                      visibility: 'public',
                      state: 'posted'
                    }
                  }
                });
              } else {
                alert('No location data available for this quickcard');
              }
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

          {/* Free Account Button */}
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
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none',
              whiteSpace: 'nowrap'
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
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Join Free
          </button>
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

        {/* Single Photo Display - Same structure as Vostcard but only one thumbnail */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: '16px' }}>
          {/* Single Photo Thumbnail */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            width: 180,
            height: 240
          }}>
            {photoURLs.length > 0 ? (
              <div 
                key={0}
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 16, 
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPhoto(photoURLs[0])}
              >
                <img 
                  src={photoURLs[0]} 
                  alt="Quickcard Photo" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              </div>
            ) : (
              <div 
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ccc',
                  width: '100%',
                  height: '100%'
                }}
              >
                <FaMap size={20} />
              </div>
            )}
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
              padding: 0,
              display: 'block',
              margin: '0 auto',
              textAlign: 'center'
            }}
          >
            Learn more about Vōstcard
          </button>
        </div>
      </div>

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

export default PublicQuickcardView; 