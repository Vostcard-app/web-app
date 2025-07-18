import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaRegComment, FaShare, FaUserCircle, FaMap, FaTimes, FaLock, FaEnvelope } from 'react-icons/fa';
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
          
          // Check if it's actually a quickcard
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
          
          // Try to fix broken share link
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
    if (!user || !quickcard) return;
    
    try {
      const docRef = doc(db, 'vostcards', id!);
      const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;
      
      await updateDoc(docRef, {
        likeCount: newLikeCount
      });
      
      setLikeCount(newLikeCount);
      setIsLiked(!isLiked);
      
      // Show like message
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
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle user profile click
  const handleUserClick = () => {
    if (quickcard?.userID) {
      navigate(`/profile/${quickcard.userID}`);
    }
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
    <div style={{ 
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      paddingBottom: '60px'
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #eee',
          backgroundColor: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <FaHeart size={20} color="#e74c3c" />
          <FaMap size={20} color="#28a745" />
        </div>
        <button
          type="button"
          onClick={() => navigate('/user-guide')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Free Account
        </button>
      </motion.div>

      {/* Main Content */}
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
          {geo && (
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
              }}
            >
              <FaMap size={24} color="#28a745" />
            </div>
          )}

          {/* Heart Icon */}
          <div 
            style={{
              cursor: user ? 'pointer' : 'default',
              padding: '12px',
              borderRadius: '12px',
              background: isLiked ? '#ffe6e6' : '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}
            onClick={user ? handleLike : undefined}
          >
            <FaHeart size={24} color={isLiked ? '#e74c3c' : '#666'} />
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
            onClick={() => navigate('/user-guide')}
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
          {title}
        </div>

        {/* Single Photo Display */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          {photoURLs.length > 0 ? (
            <div 
              style={{ 
                width: 300, 
                height: 400, 
                background: '#f0f0f0', 
                borderRadius: 16, 
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}
              onClick={() => setSelectedPhoto(photoURLs[0])}
            >
              <img 
                src={photoURLs[0]} 
                alt="Quickcard photo" 
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
                width: 300, 
                height: 400, 
                background: '#f0f0f0', 
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ccc'
              }}
            >
              <FaMap size={40} />
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ 
          color: '#333',
          lineHeight: 1.5,
          fontSize: 16,
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {description || 'No description available.'}
        </div>

        {/* User Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px',
          cursor: userID ? 'pointer' : 'default'
        }} onClick={handleUserClick}>
          <FaUserCircle size={20} color="#666" />
          <span style={{ color: '#666', fontSize: 14 }}>
            by {quickcardUsername}
          </span>
        </div>

        <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginBottom: '24px' }}>
          Created: {createdAt}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <button
            onClick={handleShare}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: '#666'
            }}
          >
            <FaShare size={24} />
            <span style={{ fontSize: '12px' }}>Share</span>
          </button>
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
      </div>

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