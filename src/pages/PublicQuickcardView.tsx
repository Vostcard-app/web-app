import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaRegComment, FaShare, FaUserCircle, FaMap, FaTimes, FaSync, FaFlag, FaArrowLeft } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import InfoPin from '../assets/Info_pin.png'; // Add this import

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
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false); // Add this for the video modal

  // YouTube video ID extracted from the provided URL
  const youtubeVideoId = 'CCOErz2RxwI';
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

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
      
      const timeoutId = setTimeout(() => {
        setError('Loading timed out. Please try again.');
        setLoading(false);
      }, 15000);

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
            setError('This quickcard is not available for sharing.');
            setLoading(false);
            return;
          }
        } else {
          console.log('📱 Quickcard not found in database, attempting to fix broken share link...');
          
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Fixed broken quickcard share link, retrying load...');
              
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
            console.error('📱 Failed to fix broken quickcard share link:', fixError);
          }
          
          clearTimeout(timeoutId);
          setError('Quickcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        console.error('📱 Error loading quickcard:', err);
        clearTimeout(timeoutId);
        setError('Failed to load quickcard. Please check your internet connection and try again.');
        setLoading(false);
      }
    };

    fetchQuickcard();
  }, [id, fixBrokenSharedVostcard]);

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!quickcard?.userID) return;
      
      try {
        const userDocRef = doc(db, 'users', quickcard.userID);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data());
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [quickcard]);

  // Handle like functionality
  const handleLike = async () => {
    if (!quickcard) return;
    
    try {
      const docRef = doc(db, 'vostcards', id!);
      const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;
      
      if (user) {
        await updateDoc(docRef, {
          likeCount: newLikeCount
        });
      }
      
      setLikeCount(newLikeCount);
      setIsLiked(!isLiked);
      
      if (!isLiked) {
        setShowLikeMessage(true);
        setTimeout(() => setShowLikeMessage(false), 2000);
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  // Handle share functionality
  const handleShare = async () => {
    const shareData = {
      title: `Check out this Quickcard: "${quickcard.title}"`,
      text: `${quickcard.description || 'A quickcard shared via Vostcard'}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFlag = () => {
    alert('Flag functionality not implemented yet');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>📱</div>
          <div>Loading quickcard...</div>
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
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😔</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            Oops! Something went wrong
          </div>
          <div style={{ color: '#666', marginBottom: '16px' }}>
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    title = 'Untitled Quickcard',
    description = '',
    photoURLs = [],
    username: quickcardUsername = 'Anonymous',
    createdAt = new Date().toLocaleDateString(),
    userID = null,
    geo = null
  } = quickcard || {};

  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        overflowY: 'auto',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Header - Added InfoPin where back button was */}
      <div style={{ 
        background: '#07345c', 
        padding: '15px 16px 24px 16px', 
        position: 'relative', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between' // Changed back to space-between for InfoPin
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>
          Vōstcard
        </span>
        {/* Added InfoPin where back button used to be */}
        <div 
          onClick={() => setShowVideoModal(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img 
            src={InfoPin} 
            alt="Info Pin" 
            style={{
              width: '50px',
              height: '50px',
              marginBottom: '2px'
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center'
          }}>
            What is Vōstcard?
          </span>
        </div>
      </div>

      {/* User Info - Modified to have Login/Register button */}
      <div style={{ 
        padding: '5px 20px', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%', 
            overflow: 'hidden', 
            marginRight: 16,
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {userProfile?.avatarURL ? (
              <img 
                src={userProfile.avatarURL} 
                alt="User Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
              />
            ) : (
              <FaUserCircle size={50} color="#ccc" />
            )}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
            {quickcardUsername || 'Anonymous'}
          </div>
        </div>
        {/* Replaced map button with Login/Register button */}
        <button
          onClick={() => navigate('/user-guide')}
          style={{
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Login/Register
        </button>
      </div>

      {/* Title - Matching QuickcardDetailView */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center'
        }}>
          {title}
        </h1>
      </div>

      {/* Photo Section - Matching QuickcardDetailView */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center',
        height: '300px'
      }}>
        {photoURLs.length > 0 ? (
          <div style={{ 
            width: '100%',
            backgroundColor: 'transparent',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <img
              src={photoURLs[0]}
              alt="Quickcard"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedPhoto(photoURLs[0])}
            />
          </div>
        ) : (
          <div style={{ 
            width: '100%',
            backgroundColor: '#f0f0f0',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '18px'
          }}>
            No photo available
          </div>
        )}
      </div>

      {/* Added text under photo */}
      <div style={{
        textAlign: 'center',
        color: '#666',
        fontSize: '14px',
        fontStyle: 'italic',
        marginTop: '-10px',
        marginBottom: '20px',
        padding: '0 20px'
      }}>
        Made with Vostcard a free app
      </div>

      {/* Action Icons Row - Removed top padding */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 40px 20px 40px', // Changed from '20px 40px' to '10px 40px 20px 40px' to reduce top padding
        borderBottom: '1px solid #eee'
      }}>
        <button
          onClick={handleLike}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLiked ? '#ff3b30' : '#666'
          }}
        >
          <FaHeart size={30} />
        </button>

        <button
          onClick={() => alert('Comments not available in public view')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaRegComment size={30} />
        </button>

        {/* Map icon */}
        <button
          onClick={() => {
            if (quickcard?.latitude && quickcard?.longitude) {
              navigate('/public-map', {
                state: {
                  singleVostcard: {
                    id: quickcard.id,
                    title: quickcard.title,
                    description: quickcard.description,
                    latitude: quickcard.latitude || quickcard.geo?.latitude,
                    longitude: quickcard.longitude || quickcard.geo?.longitude,
                    photoURLs: quickcard.photoURLs,
                    username: quickcard.username,
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
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaMap size={30} />
        </button>

        <button
          onClick={handleShare}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaShare size={30} />
        </button>
      </div>

      {/* Counts Row - Matching QuickcardDetailView */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 40px',
        fontSize: '18px',
        color: '#666'
      }}>
        <span>{likeCount}</span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Description Link, Flag Icon, and Refresh Button - Removed top padding */}
      <div style={{ 
        padding: '5px 20px 20px 20px', // Changed from '20px' to '5px 20px 20px 20px' to reduce top padding
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Flag Icon - 15px from left */}
        <button
          onClick={handleFlag}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ff3b30',
            position: 'absolute',
            left: '15px'
          }}
        >
          <FaFlag size={24} />
        </button>
        
        {/* Description Link - Centered */}
        <div
          onClick={() => setShowDescriptionModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007aff',
            fontSize: '28px',
            fontWeight: 'bold',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            display: 'inline-block'
          }}
        >
          Description
        </div>

        {/* Refresh Button - 20px from right */}
        <button
          onClick={handleRefresh}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#007aff',
            position: 'absolute',
            right: '20px'
          }}
        >
          <FaSync size={24} />
        </button>
      </div>

      {/* Bottom CTA section - Keep original design for marketing */}
      <div style={{ 
        textAlign: 'center', 
        borderTop: '1px solid #eee',
        paddingTop: '24px',
        marginTop: '24px',
        padding: '24px 20px'
      }}>
        <div style={{ 
          color: '#666', 
          fontSize: 14, 
          lineHeight: 1.4, 
          marginBottom: '12px' 
        }}>
          This quickcard was created with Vostcard
        </div>
        <button
          onClick={() => navigate('/user-guide')}
          style={{
            backgroundColor: '#002B4D',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Create Your Own Free Account
        </button>
      </div>

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
          }}
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Description</h3>
              <button
                onClick={() => setShowDescriptionModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div style={{ fontSize: '16px', lineHeight: 1.6, color: '#555' }}>
              {description || 'No description available.'}
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={() => setSelectedPhoto(null)}
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

      {/* Like Message */}
      <AnimatePresence>
        {showLikeMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#28a745',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              zIndex: 1000,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}
          >
            Thanks for the love! ❤️
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Animation - Moved inside the main div */}
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