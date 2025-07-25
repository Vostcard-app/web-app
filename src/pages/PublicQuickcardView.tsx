import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaRegComment, FaShare, FaUserCircle, FaMap, FaTimes, FaSync, FaFlag, FaArrowLeft, FaVolumeUp, FaPlay, FaPause, FaStar, FaInfo } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import MultiPhotoModal from '../components/MultiPhotoModal';
import RoundInfoButton from '../assets/RoundInfo_Button.png';

// Helper function to clean Firebase Timestamps from data
const cleanFirebaseTimestamps = (data: any): any => {
  const cleaned = { ...data };
  
  // Remove common timestamp fields that might contain Firebase Timestamps
  const timeStampFields = ['createdAt', 'updatedAt', 'lastModified', 'timestamp', 'dateCreated', 'dateUpdated'];
  
  timeStampFields.forEach(field => {
    delete cleaned[field];
  });
  
  // Also check for any remaining Firebase Timestamp objects
  Object.keys(cleaned).forEach(key => {
    const value = cleaned[key];
    if (value && typeof value === 'object' && 
        value.hasOwnProperty && 
        value.hasOwnProperty('seconds') && 
        value.hasOwnProperty('nanoseconds')) {
      delete cleaned[key];
      console.warn(`🚨 Removed Firebase Timestamp from field: ${key}`);
    }
  });
  
  return cleaned;
};

const PublicQuickcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const { fixBrokenSharedVostcard } = useVostcard();
  
  // Debug logging
  console.log('🔍 PublicQuickcardView Debug - Rendering with ID:', id);
  console.log('🔍 PublicQuickcardView Debug - User:', user?.uid);
  console.log('🔍 PublicQuickcardView Debug - Window location:', window.location.href);
  
  const [quickcard, setQuickcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isPrivateShared, setIsPrivateShared] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showLikeMessage, setShowLikeMessage] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // ✅ Multi-photo modal state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [showMultiPhotoModal, setShowMultiPhotoModal] = useState(false);

  // ✅ Audio functionality
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ Enhanced loading states
  const [loadingProgress, setLoadingProgress] = useState('Connecting...');
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);
  
  // New states for enhanced shared view
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userRating, setUserRating] = useState(0);

  // ✅ Performance optimization - memoize photo URLs
  const photoURLs = useMemo(() => quickcard?.photoURLs || [], [quickcard?.photoURLs]);
  const hasAudio = useMemo(() => !!(quickcard?.audioURL || quickcard?.audio || quickcard?._firebaseAudioURL), [quickcard?.audioURL, quickcard?.audio, quickcard?._firebaseAudioURL]);

  // ✅ Enhanced load quickcard data with better timeout and retry logic
  const fetchQuickcard = useCallback(async (attempt: number = 1) => {
    if (!id) {
      setError('No quickcard ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setShowRetryButton(false);
    setRetryCount(attempt - 1);
    
    // ✅ Increased timeout and added progress indicators
    const TIMEOUT_DURATION = 45000; // Increased from 30s to 45s for better loading
    const timeoutId = setTimeout(() => {
      setLoadingProgress('Connection timeout...');
      setError('Loading timed out. The quickcard may be in a remote location or the connection is slow.');
      setLoading(false);
      setShowRetryButton(true);
    }, TIMEOUT_DURATION);

    try {
      setLoadingProgress(attempt > 1 ? `Retrying... (Attempt ${attempt})` : 'Loading quickcard...');
      
      console.log(`📱 Loading quickcard for sharing (attempt ${attempt}):`, id);
      const docRef = doc(db, 'vostcards', id);
      
      // ✅ Add progress indicator for Firebase call
      setLoadingProgress('Connecting to database...');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📱 Quickcard found:', {
          id: data.id,
          state: data.state,
          isPrivatelyShared: data.isPrivatelyShared,
          title: data.title,
          isQuickcard: data.isQuickcard,
          hasAudio: !!data.audioURL,
          audioURL: data.audioURL,
          photoCount: data.photoURLs?.length || 0
        });
        
        if (!data.isQuickcard) {
          setError('This is not a quickcard.');
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        // Format createdAt if available
        let formattedDate = 'Unknown date';
        if (data.createdAt) {
          const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          formattedDate = date.toLocaleDateString();
        }
        
        setLoadingProgress('Processing quickcard data...');
        
        // Clean all Firebase Timestamps to prevent rendering errors
        const cleanData = cleanFirebaseTimestamps(data);
        
        setQuickcard({ id: docSnap.id, ...cleanData, formattedDate });
        setIsPrivateShared(data.isPrivatelyShared || false);
        
        clearTimeout(timeoutId);
        setLoading(false);
        setLoadingProgress('');
      } else {
        console.log('📱 Quickcard not found, trying to fix...');
        setLoadingProgress('Quickcard not found, attempting recovery...');
        
        try {
          const fixed = await fixBrokenSharedVostcard(id);
          if (fixed) {
            console.log('📱 Quickcard fixed, retrying load...');
            setLoadingProgress('Recovery successful, loading quickcard...');
            
            const retryDocSnap = await getDoc(docRef);
            if (retryDocSnap.exists()) {
              const retryData = retryDocSnap.data();
              if (retryData.isQuickcard) {
                // Format createdAt if available
                let retryFormattedDate = 'Unknown date';
                if (retryData.createdAt) {
                  const date = retryData.createdAt.toDate ? retryData.createdAt.toDate() : new Date(retryData.createdAt);
                  retryFormattedDate = date.toLocaleDateString();
                }
                
                // Clean all Firebase Timestamps to prevent rendering errors
                const cleanRetryData = cleanFirebaseTimestamps(retryData);
                
                setQuickcard({ id: retryDocSnap.id, ...cleanRetryData, formattedDate: retryFormattedDate });
                setIsPrivateShared(retryData.isPrivatelyShared || false);
                clearTimeout(timeoutId);
                setLoading(false);
                setLoadingProgress('');
                return;
              }
            }
          }
        } catch (fixError) {
          console.error('📱 Failed to fix quickcard:', fixError);
          setLoadingProgress('Recovery failed...');
        }
        
        setError('Quickcard not found. It may have been deleted, moved, or the link is invalid.');
        setShowRetryButton(true);
        clearTimeout(timeoutId);
        setLoading(false);
        setLoadingProgress('');
      }
    } catch (err: any) {
      console.error('📱 Error loading quickcard:', err);
      
      // ✅ Better error messages based on error type
      let errorMessage = 'Failed to load Quickcard. ';
      if (err.code === 'permission-denied') {
        errorMessage += 'Access denied. The quickcard may be private or restricted.';
      } else if (err.code === 'unavailable') {
        errorMessage += 'Service temporarily unavailable. Please try again.';
      } else if (err.message?.includes('network')) {
        errorMessage += 'Network connection issue. Please check your internet connection.';
      } else {
        errorMessage += 'Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
      setShowRetryButton(true);
      clearTimeout(timeoutId);
      setLoading(false);
      setLoadingProgress('');
    }
  }, [id, fixBrokenSharedVostcard]);

  useEffect(() => {
    fetchQuickcard();
  }, [fetchQuickcard]);

  // ✅ Retry function
  const handleRetry = useCallback(async () => {
    const newAttempt = retryCount + 2; // Next attempt number
    if (newAttempt <= 3) { // Allow up to 3 attempts
      console.log(`🔄 Retrying quickcard load (attempt ${newAttempt})`);
      await fetchQuickcard(newAttempt);
    } else {
      setError('Maximum retry attempts reached. Please try again later or check if the link is correct.');
      setShowRetryButton(false);
    }
  }, [retryCount, fetchQuickcard]);

  // ✅ Enhanced photo click handler for thumbnails (not main photo)
  const handlePhotoClick = useCallback((photoUrl: string) => {
    if (photoURLs && photoURLs.length > 1) {
      const index = photoURLs.indexOf(photoUrl);
      setSelectedPhotoIndex(index >= 0 ? index : 0);
      setShowMultiPhotoModal(true);
    } else {
      setSelectedPhoto(photoUrl);
    }
  }, [photoURLs]);

  // ✅ NEW: Main photo click handler - triggers audio if available, otherwise shows photo
  const handleMainPhotoClick = useCallback(() => {
    if (hasAudio) {
      // If audio exists, play/pause audio instead of showing photo
      console.log('🎵 Main photo clicked - triggering audio playback');
      handleAudioClick();
    } else {
      // No audio, fall back to photo viewing
      console.log('📸 Main photo clicked - no audio, showing photo');
      if (photoURLs[0]) {
        handlePhotoClick(photoURLs[0]);
      }
    }
  }, [hasAudio, photoURLs, handlePhotoClick]);

  // ✅ Fixed audio click handler - check for audioURL (Firebase field)
  const handleAudioClick = useCallback(() => {
    if (hasAudio) {
      if (isPlayingAudio) {
        // Stop audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlayingAudio(false);
      } else {
        // Play audio
        playAudio();
      }
    }
  }, [hasAudio, isPlayingAudio]);

  // ✅ Enhanced audio playing function
  const playAudio = useCallback(async () => {
    // Check for all possible audio field names
    const audioSource = quickcard?.audioURL || 
                       quickcard?.audio || 
                       quickcard?._firebaseAudioURL;
    
    if (!audioSource) {
      console.error('No audio source available');
      return;
    }
    
    try {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;

      // Set audio source
      if (audioSource instanceof Blob) {
        audio.src = URL.createObjectURL(audioSource);
      } else if (typeof audioSource === 'string') {
        audio.src = audioSource;
      } else {
        console.error('Invalid audio source type:', typeof audioSource);
        return;
      }

      // Set up event listeners
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };

      audio.onplay = () => {
        setIsPlayingAudio(true);
      };

      audio.onpause = () => {
        setIsPlayingAudio(false);
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsPlayingAudio(false);
        audioRef.current = null;
      };

      // Play audio
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlayingAudio(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
    }
  }, [quickcard]);

  const handleLikeClick = useCallback(() => {
    setIsLiked(!isLiked);
    setShowLikeMessage(true);
    setTimeout(() => setShowLikeMessage(false), 3000);
  }, [isLiked]);

  if (loading) {
    console.log('🔍 PublicQuickcardView Debug - Still loading, showing loading screen');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white',
        flexDirection: 'column',
        padding: '20px'
      }}>
        {/* ✅ Enhanced loading screen with progress indicator */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Loading spinner */}
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007aff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          
          <div style={{ 
            fontSize: '18px', 
            color: '#333', 
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            Loading Quickcard...
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '16px'
          }}>
            {loadingProgress}
          </div>

          {retryCount > 0 && (
            <div style={{ 
              fontSize: '12px', 
              color: '#888',
              fontStyle: 'italic'
            }}>
              Attempt {retryCount + 1} of 3
            </div>
          )}
        </div>

        {/* CSS for loading spinner */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    console.log('🔍 PublicQuickcardView Debug - Error state:', error);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white',
        flexDirection: 'column',
        padding: '20px'
      }}>
        {/* ✅ Enhanced error screen with retry options */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            opacity: 0.5 
          }}>
            📱
          </div>
          
          <div style={{ 
            fontSize: '20px', 
            color: '#333', 
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            Couldn't Load Quickcard
          </div>
          
          <div style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '24px',
            lineHeight: 1.5
          }}>
            {error}
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {showRetryButton && (
              <button 
                onClick={handleRetry}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaSync size={14} />
                Retry {retryCount < 2 ? `(${3 - retryCount - 1} left)` : ''}
              </button>
            )}
            
            <button 
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Go Home
            </button>
          </div>

          {retryCount >= 2 && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#666',
              textAlign: 'left'
            }}>
              <strong>Troubleshooting tips:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li>Verify the shared link is correct</li>
                <li>The quickcard may have been deleted</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!quickcard) {
    console.log('🔍 PublicQuickcardView Debug - No quickcard data available');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>No quickcard data</div>
      </div>
    );
  }

  const { title, description, formattedDate, username: quickcardUsername } = quickcard;
  
  console.log('🔍 PublicQuickcardView Debug - Successfully rendering quickcard:', {
    id: quickcard.id,
    title: quickcard.title,
    hasPhotos: !!photoURLs?.length,
    photoCount: photoURLs?.length || 0,
    hasAudio,
    audioURL: quickcard.audioURL,
    username: quickcardUsername
  });
  
  return (
    <div style={{
      background: '#fff',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: '#07345c',
        padding: '15px 16px 24px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>
          Vōstcard
        </span>
        
        <div 
          onClick={() => setShowTutorialModal(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img 
            src={RoundInfoButton} 
            alt="Round Info Button" 
            style={{
              width: '40px',
              height: '40px',
              marginBottom: '2px'
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center'
          }}>
            User Guide
          </span>
        </div>
      </div>

      {/* Creator Info and Login Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        backgroundColor: '#fff'
      }}>
        {/* Creator Avatar and Username */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#007aff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            {quickcardUsername?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#333'
            }}>
              {quickcardUsername || 'Anonymous User'}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#666'
            }}>
              Creator
            </div>
          </div>
        </div>

        {/* Login/Register Button */}
        <button
          onClick={() => navigate('/user-guide')}
          style={{
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Login / Register
        </button>
      </div>

      {/* Like Message */}
      {showLikeMessage && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '12px 16px',
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
        {/* REMOVED: Old action icons section - moved to below description */}

        {/* Title */}
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center',
          lineHeight: 1.2
        }}>
          {title || 'Untitled Quickcard'}
        </h1>

        {/* ✅ Enhanced High-Resolution Multi-Photo Display with Audio-Triggered Main Photo */}
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '450px', // ✅ Increased minimum height for better resolution
          maxHeight: '75vh' // ✅ Increased max height for larger displays
        }}>
          {photoURLs && photoURLs.length > 0 ? (
            <div style={{ 
              width: '100%',
              maxWidth: '900px', // ✅ Increased max width for better resolution
              display: 'flex',
              gap: '16px', // ✅ Increased gap for better separation
              overflow: 'hidden'
            }}>
              {/* ✅ Main Photo - Now triggers audio if available */}
              <div style={{ 
                flex: photoURLs.length === 1 ? 1 : 0.75, // ✅ Increased main photo ratio
                backgroundColor: 'transparent',
                borderRadius: '20px', // ✅ Increased border radius
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                minHeight: '450px', // ✅ Ensure minimum height for quality
                boxShadow: '0 12px 48px rgba(0,0,0,0.15)' // ✅ Enhanced shadow
              }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  minHeight: '450px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '20px',
                  overflow: 'hidden'
                }}>
                  <img
                    src={photoURLs[0]}
                    alt="Quickcard"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain', // ✅ Changed from 'cover' to 'contain' to show full image
                      objectPosition: 'center',
                      // ✅ High-quality image rendering hints
                      imageRendering: 'crisp-edges' as any,
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                      transform: 'translateZ(0)', // ✅ Hardware acceleration
                      // ✅ Additional quality settings
                      filter: 'contrast(1.03) saturate(1.08) brightness(1.02)', // ✅ Enhanced image quality
                    } as React.CSSProperties}
                    onClick={handleMainPhotoClick} // ✅ NEW: Use main photo click handler
                    loading="eager" // ✅ Prioritize loading
                    fetchPriority="high" // ✅ Ensure high priority loading
                    // ✅ Add error handling for better loading
                    onError={(e) => {
                      console.error('Failed to load main image:', photoURLs[0]);
                    }}
                  />
                  
                  {/* ✅ Enhanced visual indicators */}
                  <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {/* REMOVED: Audio indicator on main photo - "Tap to play" button */}
                    
                    {/* Photo counter - moved to right side */}
                    {photoURLs.length > 1 && (
                      <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.85)', // ✅ Increased opacity
                        color: 'white',
                        padding: '8px 16px', // ✅ Increased padding
                        borderRadius: '20px', // ✅ Increased border radius
                        fontSize: '15px', // ✅ Increased font size
                        fontWeight: 'bold',
                        backdropFilter: 'blur(12px)', // ✅ Enhanced blur effect
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)' // ✅ Enhanced shadow
                      }}>
                        1/{photoURLs.length}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Photos Thumbnail Strip - Higher Resolution */}
              {photoURLs.length > 1 && (
                <div style={{
                  flex: 0.25,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px', // ✅ Increased gap
                  overflow: 'hidden',
                  minHeight: '450px'
                }}>
                  {photoURLs.slice(1, 4).map((photoUrl: string, index: number) => (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        borderRadius: '16px', // ✅ Increased border radius
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: 'pointer',
                        minHeight: '140px', // ✅ Increased minimum height
                        boxShadow: '0 6px 24px rgba(0,0,0,0.12)', // ✅ Enhanced shadow
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onClick={() => handlePhotoClick(photoUrl)} // ✅ Thumbnails still show photos
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)'; // ✅ Slightly increased scale
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)';
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo ${index + 2}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          // ✅ High-quality image rendering
                          imageRendering: 'crisp-edges' as any,
                          WebkitBackfaceVisibility: 'hidden',
                          backfaceVisibility: 'hidden',
                          transform: 'translateZ(0)',
                          filter: 'contrast(1.03) saturate(1.08) brightness(1.02)', // ✅ Enhanced quality
                        } as React.CSSProperties}
                        loading="lazy" // ✅ Lazy load thumbnails
                        onError={(e) => {
                          console.error(`Failed to load thumbnail ${index + 2}:`, photoUrl);
                        }}
                      />
                      {index === 2 && photoURLs.length > 4 && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', // ✅ Increased opacity
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px', // ✅ Increased font size
                          fontWeight: 'bold',
                          backdropFilter: 'blur(6px)' // ✅ Enhanced blur effect
                        }}>
                          +{photoURLs.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              width: '100%',
              maxWidth: '600px',
              height: '400px',
              position: 'relative',
              backgroundColor: '#f8f9fa',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #dee2e6'
            }}>
              <div style={{
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '18px'
              }}>
                <FaMap size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontSize: '16px', fontWeight: '500' }}>
                  No photos available
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Three Buttons: Intro, Detail, View on Map */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Intro Button - Always show if there's any audio */}
          {hasAudio && (
            <button
              onClick={() => {
                console.log('🎵 Intro button clicked');
                // Play audio functionality (reuse existing)
                if (audioRef.current) {
                  if (isPlayingAudio) {
                    audioRef.current.pause();
                    setIsPlayingAudio(false);
                  } else {
                    audioRef.current.play();
                    setIsPlayingAudio(true);
                  }
                }
              }}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '100px',
                boxShadow: '0 2px 8px rgba(0,43,77,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001f35'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
            >
              <FaPlay size={14} style={{ marginRight: '8px' }} />
              Intro
            </button>
          )}

          {/* Detail Button - Show for all quickcards with audio */}
          {hasAudio && (
            <button
              onClick={() => {
                console.log('🎵 Detail button clicked');
                // Play same audio for now (since this is temporary solution)
                if (audioRef.current) {
                  if (isPlayingAudio) {
                    audioRef.current.pause();
                    setIsPlayingAudio(false);
                  } else {
                    audioRef.current.play();
                    setIsPlayingAudio(true);
                  }
                }
              }}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '100px',
                boxShadow: '0 2px 8px rgba(0,43,77,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001f35'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
            >
              <FaPlay size={14} style={{ marginRight: '8px' }} />
              Detail
            </button>
          )}

          {/* View on Map Button - Always show if location data exists */}
          {quickcard?.latitude && quickcard?.longitude && (
            <button
              onClick={() => {
                console.log('📍 Opening quickcard location on public map');
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
                      createdAt: quickcard.formattedDate,
                      visibility: 'public',
                      state: 'posted'
                    }
                  }
                });
              }}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '120px',
                boxShadow: '0 2px 8px rgba(0,43,77,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001f35'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
            >
              <FaMap size={14} style={{ marginRight: '8px' }} />
              View on Map
            </button>
          )}
        </div>

        {/* Description */}
        <div style={{ 
          color: '#333',
          lineHeight: 1.6, // ✅ Improved line height
          fontSize: '18px', // ✅ Increased font size
          marginBottom: '24px', // ✅ Increased margin
          maxWidth: '900px', // ✅ Match photo max width
          margin: '0 auto 24px auto', // ✅ Center align with photos
          padding: '0 12px' // ✅ Increased padding for mobile
        }}>
          {description || 'No description available.'}
        </div>

        {/* Action Icons Row: Like, Star, Comment, Share */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '20px 40px',
          borderBottom: '1px solid #eee',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* Like Button */}
          <button
            onClick={() => {
              setIsLiked(!isLiked);
              setShowLikeMessage(true);
              setTimeout(() => setShowLikeMessage(false), 3000);
            }}
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

          {/* Star Rating */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setUserRating(userRating === star ? 0 : star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: star <= userRating ? '#ffd700' : '#ccc',
                  padding: '2px'
                }}
              >
                <FaStar size={24} />
              </button>
            ))}
          </div>

          {/* Comment Button - Shows login prompt */}
          <button
            onClick={() => setShowLoginModal(true)}
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

          {/* Share Button */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: title || 'Quickcard',
                  text: description || 'Check out this quickcard!',
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
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
            <FaShare size={30} />
          </button>
        </div>

        {/* Worth Seeing Rating */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderBottom: '1px solid #eee',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '10px'
          }}>
            Worth Seeing
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#007aff' }}>
              {userRating > 0 ? userRating.toFixed(1) : '0.0'}
            </span>
            <span style={{ color: '#666' }}>/ 5.0</span>
          </div>
        </div>

        {/* Description Link Section */}
        <div style={{ 
          padding: '20px',
          textAlign: 'center',
          borderBottom: '1px solid #eee',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <button
            onClick={() => {
              // Navigate to a detailed description page or show modal
              alert('Description details would be shown here');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#007aff',
              fontSize: '28px',
              fontWeight: 'bold',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            Description
          </button>
        </div>

        <div style={{ 
          textAlign: 'center', 
          color: '#888', 
          fontSize: '16px', // ✅ Increased size
          marginBottom: '40px', // ✅ Increased margin
          fontWeight: '500'
        }}>
          Posted: {formattedDate}
        </div>

        {/* Bottom message and link */}
        <div style={{ 
          textAlign: 'center', 
          borderTop: '1px solid #eee',
          paddingTop: '40px', // ✅ Increased padding
          marginTop: '40px'
        }}>
          <div style={{ 
            color: '#666', 
            fontSize: '16px', // ✅ Increased size
            lineHeight: 1.4, 
            marginBottom: '20px' // ✅ Increased margin
          }}>
            Made with Vōstcard
          </div>
          <button 
            onClick={() => navigate('/user-guide')}
            style={{
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '14px', // ✅ Increased border radius
              padding: '16px 32px', // ✅ Increased padding
              fontSize: '18px', // ✅ Increased font size
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 6px 24px rgba(0,122,255,0.35)', // ✅ Enhanced shadow
              minHeight: '56px' // ✅ Increased minimum height
            }}
            onMouseDown={(e) => e.currentTarget.style.backgroundColor = '#0056d3'}
            onMouseUp={(e) => e.currentTarget.style.backgroundColor = '#007aff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007aff'}
          >
            Get Vōstcard Free
          </button>
        </div>
      </div>

      {/* ✅ Multi Photo Modal */}
      <MultiPhotoModal
        photos={photoURLs || []}
        initialIndex={selectedPhotoIndex}
        isOpen={showMultiPhotoModal}
        onClose={() => setShowMultiPhotoModal(false)}
        title={title || 'Quickcard Photos'}
      />

      {/* Single Photo Modal (fallback) */}
      {selectedPhoto && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)', // ✅ Darker background
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <img 
            src={selectedPhoto}
            alt="Full size"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'auto',
              // ✅ High-quality full-screen rendering
                                    imageRendering: 'crisp-edges' as any,
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              filter: 'contrast(1.03) saturate(1.08) brightness(1.02)', // ✅ Enhanced quality
            } as React.CSSProperties}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
            loading="eager"
                          fetchPriority="high"
          />
        </div>
      )}

      {/* Tutorial Video Modal */}
      <AnimatePresence>
        {showTutorialModal && (
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
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowTutorialModal(false)}
          >
            <button
              onClick={() => setShowTutorialModal(false)}
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
                zIndex: 10001,
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
              <iframe
                src="https://www.youtube.com/embed/J-ix67eZ7J4?autoplay=1&rel=0&modestbranding=1&playsinline=1"
                width="100%"
                height="100%"
                style={{
                  minHeight: '315px',
                  maxWidth: '560px',
                  aspectRatio: '16/9',
                  borderRadius: 8,
                  border: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onClick={(e) => e.stopPropagation()}
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
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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

      {/* Login Modal for Comments */}
      {showLoginModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <FaRegComment size={48} color="#007aff" style={{ marginBottom: '20px' }} />
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '16px'
            }}>
              Join the Conversation
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '24px',
              lineHeight: 1.5
            }}>
              To comment on this quickcard, please login or register for a free Vōstcard account.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  navigate('/user-guide');
                }}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Login / Register
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  backgroundColor: '#f8f9fa',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicQuickcardView; 