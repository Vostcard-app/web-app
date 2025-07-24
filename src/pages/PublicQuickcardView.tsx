import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaRegComment, FaShare, FaUserCircle, FaMap, FaTimes, FaSync, FaFlag, FaArrowLeft, FaVolumeUp, FaPlay, FaPause } from 'react-icons/fa';
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
            isQuickcard: data.isQuickcard,
            hasAudio: !!data.audioURL,
            audioURL: data.audioURL,
            photoCount: data.photoURLs?.length || 0
          });
          
          if (!data.isQuickcard) {
            setError('This is not a quickcard.');
            setLoading(false);
            return;
          }

          // Format createdAt if available
          let formattedDate = 'Unknown date';
          if (data.createdAt) {
            const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            formattedDate = date.toLocaleDateString();
          }
          
          // Clean all Firebase Timestamps to prevent rendering errors
          const cleanData = cleanFirebaseTimestamps(data);
          
          setQuickcard({ id: docSnap.id, ...cleanData, formattedDate });
          setIsPrivateShared(data.isPrivatelyShared || false);
          
          clearTimeout(timeoutId);
          setLoading(false);
        } else {
          console.log('📱 Quickcard not found, trying to fix...');
          
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Quickcard fixed, retrying load...');
              
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
                  return;
                }
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix quickcard:', fixError);
          }
          
          setError('Quickcard not found. It may have been deleted or the link is invalid.');
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (err) {
        console.error('📱 Error loading quickcard:', err);
        setError('Failed to load Quickcard. Please check your internet connection and try again.');
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchQuickcard();
  }, [id, fixBrokenSharedVostcard]);

  // ✅ Enhanced photo click handler
  const handlePhotoClick = (photoUrl: string) => {
    if (quickcard.photoURLs && quickcard.photoURLs.length > 1) {
      const index = quickcard.photoURLs.indexOf(photoUrl);
      setSelectedPhotoIndex(index >= 0 ? index : 0);
      setShowMultiPhotoModal(true);
    } else {
      setSelectedPhoto(photoUrl);
    }
  };

  // ✅ Fixed audio click handler - check for audioURL (Firebase field)
  const handleAudioClick = () => {
    const quickcardWithAudio = quickcard as any;
    // Check for Firebase audioURL field (most common) and fallback fields
    if (quickcardWithAudio?.audioURL || quickcardWithAudio?.audio || quickcardWithAudio?._firebaseAudioURL) {
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
  };

  // ✅ Enhanced audio playing function
  const playAudio = async () => {
    const quickcardWithAudio = quickcard as any;
    // Check for all possible audio field names
    const audioSource = quickcardWithAudio?.audioURL || 
                       quickcardWithAudio?.audio || 
                       quickcardWithAudio?._firebaseAudioURL;
    
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
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
    setShowLikeMessage(true);
    setTimeout(() => setShowLikeMessage(false), 3000);
  };

  if (loading) {
    console.log('🔍 PublicQuickcardView Debug - Still loading, showing loading screen');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white',
        flexDirection: 'column'
      }}>
        <div style={{ fontSize: '18px', color: '#666', marginBottom: '16px' }}>
          Loading Quickcard...
        </div>
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
        <div style={{ fontSize: '18px', color: 'red', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
        <button 
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#002B4D',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Go Home
        </button>
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

  const { title, description, photoURLs, formattedDate, username: quickcardUsername } = quickcard;
  
  // ✅ Check if quickcard has audio - improved detection
  const hasAudio = !!(quickcard.audioURL || quickcard.audio || quickcard._firebaseAudioURL);
  
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
        {/* Map Icon, Heart Icon, Audio Button, and Free Account Button - All on same line */}
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
                      createdAt: quickcard.formattedDate,
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

          {/* ✅ Enhanced Audio Button - shows if quickcard has audio */}
          {hasAudio && (
            <div 
              style={{
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '12px',
                background: isPlayingAudio ? '#e6f3ff' : '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `1px solid ${isPlayingAudio ? '#007aff' : '#e0e0e0'}`
              }}
              onClick={handleAudioClick}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isPlayingAudio ? (
                <FaPause size={28} color="#007aff" />
              ) : (
                <FaPlay size={28} color="#333" />
              )}
            </div>
          )}

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
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: isLiked ? '1px solid #ff6b6b' : '1px solid #e0e0e0'
            }}
            onClick={handleLikeClick}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FaHeart size={28} color={isLiked ? '#ff6b6b' : '#333'} />
          </div>
        </div>

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

        {/* ✅ Enhanced High-Resolution Multi-Photo Display */}
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px', // Increased minimum height for better resolution
          maxHeight: '70vh' // Increased max height for larger displays
        }}>
          {photoURLs && photoURLs.length > 0 ? (
            <div style={{ 
              width: '100%',
              maxWidth: '800px', // Increased max width for better resolution
              display: 'flex',
              gap: '12px', // Increased gap for better separation
              overflow: 'hidden'
            }}>
              {/* Main Photo - Higher Resolution */}
              <div style={{ 
                flex: photoURLs.length === 1 ? 1 : 0.75, // Increased main photo ratio
                backgroundColor: 'transparent',
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                minHeight: '400px', // Ensure minimum height for quality
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)' // Enhanced shadow
              }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  minHeight: '400px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}>
                  <img
                    src={photoURLs[0]}
                    alt="Quickcard"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain', // Changed from 'cover' to 'contain' to show full image
                      objectPosition: 'center',
                      // ✅ High-quality image rendering hints
                      imageRendering: 'high-quality',
                      imageRendering: '-webkit-optimize-contrast' as any,
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                      transform: 'translateZ(0)', // Hardware acceleration
                      // Additional quality settings
                      filter: 'contrast(1.02) saturate(1.05)', // Slight enhancement
                    } as React.CSSProperties}
                    onClick={() => handlePhotoClick(photoURLs[0])}
                    loading="eager" // Prioritize loading
                    fetchpriority="high" // Ensure high priority loading
                    // Add error handling for better loading
                    onError={(e) => {
                      console.error('Failed to load main image:', photoURLs[0]);
                    }}
                  />
                  {photoURLs.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '12px', // Increased from 8px
                      right: '12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', // Increased opacity
                      color: 'white',
                      padding: '6px 12px', // Increased padding
                      borderRadius: '16px', // Increased border radius
                      fontSize: '14px', // Increased font size
                      fontWeight: 'bold',
                      backdropFilter: 'blur(8px)', // Added blur effect
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)' // Added shadow
                    }}>
                      1/{photoURLs.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Photos Thumbnail Strip - Higher Resolution */}
              {photoURLs.length > 1 && (
                <div style={{
                  flex: 0.25,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px', // Increased gap
                  overflow: 'hidden',
                  minHeight: '400px'
                }}>
                  {photoURLs.slice(1, 4).map((photoUrl: string, index: number) => (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        borderRadius: '12px', // Increased border radius
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: 'pointer',
                        minHeight: '120px', // Increased minimum height
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)', // Enhanced shadow
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onClick={() => handlePhotoClick(photoUrl)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
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
                          imageRendering: 'high-quality',
                          WebkitBackfaceVisibility: 'hidden',
                          backfaceVisibility: 'hidden',
                          transform: 'translateZ(0)',
                          filter: 'contrast(1.02) saturate(1.05)',
                        } as React.CSSProperties}
                        loading="lazy" // Lazy load thumbnails
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
                          backgroundColor: 'rgba(0, 0, 0, 0.7)', // Increased opacity
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '16px', // Increased font size
                          fontWeight: 'bold',
                          backdropFilter: 'blur(4px)' // Added blur effect
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

        {/* Description */}
        <div style={{ 
          color: '#333',
          lineHeight: 1.6, // Improved line height
          fontSize: '17px', // Slightly larger font
          marginBottom: '20px', // Increased margin
          maxWidth: '800px', // Match photo max width
          margin: '0 auto 20px auto', // Center align with photos
          padding: '0 8px' // Small padding for mobile
        }}>
          {description || 'No description available.'}
        </div>

        <div style={{ 
          textAlign: 'center', 
          color: '#888', 
          fontSize: '15px', // Slightly larger
          marginBottom: '32px', // Increased margin
          fontWeight: '500'
        }}>
          Posted: {formattedDate}
        </div>

        {/* Bottom message and link */}
        <div style={{ 
          textAlign: 'center', 
          borderTop: '1px solid #eee',
          paddingTop: '32px', // Increased padding
          marginTop: '32px'
        }}>
          <div style={{ 
            color: '#666', 
            fontSize: '15px', // Slightly larger
            lineHeight: 1.4, 
            marginBottom: '16px' // Increased margin
          }}>
            Made with Vōstcard
          </div>
          <button 
            onClick={() => navigate('/user-guide')}
            style={{
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '12px', // Increased border radius
              padding: '14px 28px', // Increased padding
              fontSize: '17px', // Increased font size
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(0,122,255,0.3)', // Added shadow
              minHeight: '52px' // Ensure consistent height
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
            backgroundColor: 'rgba(0, 0, 0, 0.95)', // Darker background
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
              imageRendering: 'high-quality',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            } as React.CSSProperties}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
            loading="eager"
            fetchpriority="high"
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