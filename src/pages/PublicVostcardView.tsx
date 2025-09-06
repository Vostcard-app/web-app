import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaUserCircle, FaMap, FaTimes, FaLock, FaEnvelope, FaPlay } from 'react-icons/fa';
import { updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import MultiPhotoModal from '../components/MultiPhotoModal';
import RoundInfoButton from '../assets/RoundInfo_Button.png';
import { useVostcardData } from '../hooks/useVostcardData';

const PublicVostcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, username } = useAuth();
  
  // Use the new useVostcardData hook
  const {
    vostcard,
    userProfile,
    loading,
    error,
    likeCount,
    ratingStats,
    hasAudio,
    setUserProfile
  } = useVostcardData(id, {
    loadUserProfile: true,
    loadInteractionData: false, // Public view doesn't need interaction data
    checkLocalFirst: false,
    timeout: 15000,
    allowPrivateShared: true // Allow private shared vostcards
  });
  
  const [isLiked, setIsLiked] = useState(false);
  const [isPrivateShared, setIsPrivateShared] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showLikeMessage, setShowLikeMessage] = useState(false);
  
  // Normalize stored youtubeURL (may be full URL or ID)
  const getNormalizedYouTubeId = (raw?: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    const idOnly = /^[a-zA-Z0-9_-]{11}$/;
    if (idOnly.test(trimmed)) return trimmed;
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
      const m = trimmed.match(p);
      if (m) return m[1];
    }
    return null;
  };

  // Derive start seconds from stored field or from legacy full URL with t/start
  const getYouTubeStartSeconds = (rawUrl?: string | null, startField?: number | null): number => {
    if (typeof startField === 'number' && startField > 0) return startField;
    const s = (rawUrl || '').match(/[?&](?:t|start)=(\d+)(?:s)?/);
    if (s && s[1]) {
      const n = parseInt(s[1], 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return 0;
  };
  
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

  // ✅ Add audio support - missing from PublicVostcardView
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [showMultiPhotoModal, setShowMultiPhotoModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // Audio detection now handled by useVostcardData hook

  // ✅ Audio playback function
  const handlePlayPause = useCallback(async () => {
    console.log('🎵 PublicVostcardView handlePlayPause called!', { hasAudio, isPlaying });
    
    if (!hasAudio) {
      console.log('❌ No audio detected, returning early');
      return;
    }

    try {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;
      audio.loop = false; // ✅ Ensure audio doesn't repeat/loop

      // ✅ UNIFIED AUDIO FORMAT - Simple source resolution
      const audioSource = vostcard?.audioURLs?.[0] ||          // UNIFIED: Primary audio URL
                         vostcard?.audioURL ||                  // Legacy: Single audio URL (migration support)
                         vostcard?._firebaseAudioURL;           // Legacy: Firebase audio URL (migration support)

      if (!audioSource) {
        console.error('No audio source available');
        return;
      }

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
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        console.log('🎵 PublicVostcardView audio playback ended');
      });

      audio.addEventListener('error', (e) => {
        console.error('🎵 PublicVostcardView audio playback error:', e);
        setIsPlaying(false);
      });

      // Play audio
      await audio.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
      alert('Failed to play audio. Please try again.');
    }
  }, [hasAudio, isPlaying, vostcard]);

  // ✅ Photo click handler with audio support
  const handlePhotoClick = useCallback((photoUrl: string, photoIndex: number = 0) => {
    console.log('🖼️ PublicVostcardView photo clicked - launching audio and showing slideshow:', photoUrl);
    
    // Set up slideshow
    setSelectedPhotoIndex(photoIndex);
    setShowMultiPhotoModal(true);
    
    // Start audio if available
    if (hasAudio) {
      setTimeout(() => {
        handlePlayPause();
      }, 100);
    }
  }, [hasAudio, handlePlayPause]);

  // ✅ Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup audio when leaving the page
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        console.log('🎵 Audio cleaned up on component unmount');
      }
    };
  }, []);

  // Vostcard loading now handled by useVostcardData hook

  // User profile loading now handled by useVostcardData hook
  
  // Update isPrivateShared when vostcard data is loaded
  useEffect(() => {
    if (vostcard) {
      setIsPrivateShared(vostcard.isPrivatelyShared || false);
    }
  }, [vostcard]);

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

  const handleShareClick = async () => {
    try {
      if (vostcard?.id) {
        const vostcardRef = doc(db, 'vostcards', vostcard.id);
        await updateDoc(vostcardRef, {
          isPrivatelyShared: true,
          sharedAt: new Date()
        });
      }
      
      const privateUrl = `${window.location.origin}/share/${id}`;
      
      const shareText = `Check it out I made this with Vōstcard


"${vostcard.title || 'Untitled Vostcard'}"


"${vostcard.description || 'No description'}"


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
      console.error('Error sharing Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  const handlePrivateShare = async () => {
    try {
      const vostcardRef = doc(db, 'vostcards', id!);
      await updateDoc(vostcardRef, {
        isShared: true
      });
      
      const privateUrl = `${window.location.origin}/share/${id}`;
      
      const shareText = `Check it out I made this with Vōstcard


"${vostcard?.title || 'Untitled Vostcard'}"


"${vostcard?.description || 'No description'}"`;
      
      if (navigator.share) {
        navigator.share({
          text: shareText,
          url: privateUrl
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(`${shareText}


${privateUrl}`).then(() => {
          alert('Private share message copied to clipboard!');
        }).catch(() => {
          alert(`Share this message: ${shareText}


${privateUrl}`);
        });
      }
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
            Join (it's free)
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
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y'
    }}>
      {/* Banner */}
      <div style={{
        background: '#07345c',
        padding: '15px 16px 24px 16px',
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}>
        <span 
          onClick={() => navigate('/home')}
          style={{ color: 'white', fontWeight: 700, fontSize: '30px', cursor: 'pointer' }}>
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

        {/* 20% Container with User Info */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '20%', // 20% height
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0',
        marginTop: '69px', // Account for fixed header height
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
            <div 
              style={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                overflow: 'hidden',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (vostcard?.userID) {
                  navigate(`/user-profile/${vostcard.userID}`);
                }
              }}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={vostcardUsername || 'User'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
                />
              ) : (
                <FaUserCircle size={60} color="#ccc" />
              )}
            </div>
            <div 
              style={{ 
                fontWeight: 600, 
                fontSize: 18,
                color: '#333',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (vostcard?.userID) {
                  navigate(`/user-profile/${vostcard.userID}`);
                }
              }}
            >
              {vostcardUsername || 'Unknown User'}
            </div>
          </div>
          {/* Play Video if available */}
          {vostcard?.videoURL && (
            <button
              onClick={() => window.open(vostcard.videoURL!, '_blank')}
              style={{
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: hasAudio ? '8px' : '0'
              }}
            >
              Play Video
            </button>
          )}

          {/* ✅ Play Audio if available */}
          {hasAudio && (
            <button
              onClick={handlePlayPause}
              style={{
                backgroundColor: isPlaying ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isPlaying ? '⏸️ Stop Audio' : '🎵 Play Audio'}
            </button>
          )}
        </div>
      </div>

      {/* Join Button Section */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <button
            onClick={() => {
              // Redirect to login with returnTo parameter pointing to private version
              const privateUrl = `/vostcard/${id}`;
              navigate(`/login?returnTo=${encodeURIComponent(privateUrl)}`);
            }}
            style={{
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)'
            }}
          >
            Join (it's free)
          </button>
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#666',
          marginTop: '8px'
        }}>
          Access comments, ratings, and interactive features
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
                Join (it's free)
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
        {/* Map View button and Like - same row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 16,
          marginBottom: '16px',
          marginTop: '25px',
          flexWrap: 'wrap'
        }}>
          {/* Map View button */}
          <button 
            style={{
              cursor: 'pointer',
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#f5f5f5',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}
            onClick={() => {
              // Navigate all users to public map view regardless of authentication status
              if (vostcard.latitude && vostcard.longitude) {
                console.log('📍 Opening vostcard location on public map for all users');
                navigate('/public-map', {
                  replace: false, // Ensure we add to history so back button works
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
                      userRole: vostcard.userRole, // ✅ ADD: Include userRole for correct pin type
                      isOffer: vostcard.isOffer || false,
                      isQuickcard: vostcard.isQuickcard || false,
                      offerDetails: vostcard.offerDetails,
                      categories: vostcard.categories,
                      createdAt: vostcard.createdAt,
                      visibility: 'public',
                      state: 'posted'
                    }
                  }
                });
              } else {
                alert('No location data available for this vostcard');
              }
            }}
            onMouseDown={(e) => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'}
            onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
          >
            <FaMap size={20} color="#333" />
            <span style={{ fontWeight: 600 }}>Map View</span>
          </button>

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

          {/* (Removed extra Join button here per new design) */}
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

        {/* Video/Photo thumbnails area */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: '16px', alignItems: 'center' }}>
          {vostcard.isQuickcard ? (
            /* Single Photo Display for Quickcards */
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
                    width: '90px',
                    height: '120px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => handlePhotoClick(photoURLs[0], 0)}
                >
                  <img 
                    src={photoURLs[0]} 
                    alt="Quickcard Photo" 
                    style={{ 
                      width: '90px', 
                      height: '120px', 
                      objectFit: 'cover' 
                    }}
                  />
                  {/* Play triangle overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: 0,
                      height: 0,
                      borderLeft: '9px solid white',
                      borderTop: '6px solid transparent',
                      borderBottom: '6px solid transparent',
                      marginLeft: 2
                    }} />
                  </div>
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
          ) : (
            <>
              {/* Video thumbnail (only if video) */}
              {videoURL && (
                <div
                  onClick={(e) => { e.stopPropagation(); setShowVideoModal(true); }}
                  style={{ 
                    background: '#000', 
                    borderRadius: 16, 
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '180px',
                    height: '120px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <video 
                    src={videoURL} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
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
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: 0,
                      height: 0,
                      borderLeft: '10px solid white',
                      borderTop: '6px solid transparent',
                      borderBottom: '6px solid transparent',
                      marginLeft: 2
                    }} />
                  </div>
                </div>
              )}

              {/* Single photo thumbnail to open slideshow */}
              {photoURLs.length > 0 && (
                <div 
                  key={0}
                  style={{ 
                    background: '#f0f0f0', 
                    borderRadius: 16, 
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '180px',
                    height: '120px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => handlePhotoClick(photoURLs[0], 0)}
                >
                  <img 
                    src={photoURLs[0]} 
                    alt={`Photo 1`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Play triangle overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: 0,
                      height: 0,
                      borderLeft: '10px solid white',
                      borderTop: '6px solid transparent',
                      borderBottom: '6px solid transparent',
                      marginLeft: 2
                    }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Description - scrollable after ~4 lines */}
        <div style={{ 
          color: '#333',
          lineHeight: 1.5,
          fontSize: 16,
          marginBottom: '12px',
          maxHeight: '6.2em',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {description || 'No description available.'}
        </div>

        {/* YouTube / Instagram buttons under description */}
        {(getNormalizedYouTubeId(vostcard.youtubeURL || '') || vostcard.instagramURL) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            {getNormalizedYouTubeId(vostcard.youtubeURL || '') && (
              <button
                onClick={() => setShowYouTubeModal(true)}
                style={{
                  backgroundColor: '#FF0000', color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                YouTube
              </button>
            )}
            {vostcard.instagramURL && (
              <button
                onClick={() => window.open(vostcard.instagramURL!, '_blank')}
                style={{
                  background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                  color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Instagram
              </button>
            )}
          </div>
        )}

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
                onEnded={() => setShowVideoModal(false)}
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

      {/* YouTube button (public view) */}
      {getNormalizedYouTubeId(vostcard?.youtubeURL || '') && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          gap: '12px',
          borderBottom: '1px solid #eee'
        }}>
          <button
            onClick={() => setShowYouTubeModal(true)}
            style={{
              backgroundColor: '#FF0000',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(255,0,0,0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#CC0000')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF0000')}
          >
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: 'white',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaPlay size={8} style={{ color: '#FF0000', marginLeft: '1px' }} />
            </div>
            YouTube
          </button>
        </div>
      )}

      {/* YouTube Modal */}
      <AnimatePresence>
        {showYouTubeModal && getNormalizedYouTubeId(vostcard?.youtubeURL || '') && (
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
            onClick={() => setShowYouTubeModal(false)}
          >
            <button
              onClick={() => setShowYouTubeModal(false)}
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
                src={`https://www.youtube.com/embed/${getNormalizedYouTubeId(vostcard.youtubeURL || '')}?autoplay=1&rel=0&modestbranding=1&playsinline=1&start=${getYouTubeStartSeconds(vostcard.youtubeURL, (vostcard as any).youtubeStart)}`}
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
                src="https://www.youtube.com/embed/JyV2HbeCPYA?autoplay=1&rel=0&modestbranding=1&playsinline=1"
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

      {/* ✅ Multi-Photo Modal with Audio Support */}
      {showMultiPhotoModal && vostcard?.photoURLs && (
        <MultiPhotoModal
          photos={vostcard.photoURLs}
          initialIndex={selectedPhotoIndex}
          isOpen={showMultiPhotoModal}
          onClose={() => {
            setShowMultiPhotoModal(false);
            // ✅ FIXED: Always stop audio when modal closes, regardless of isPlaying state
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0; // Reset to beginning
              setIsPlaying(false);
              console.log('🎵 Audio stopped when slideshow closed');
            }
          }}
          title={vostcard.title || 'Photos'}
          autoPlay={false}
        />
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PublicVostcardView;