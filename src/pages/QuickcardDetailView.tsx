import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaTimes, FaSync, FaHeart, FaRegComment, FaShare, FaUserCircle, FaFlag, FaMap, FaPlay, FaPause, FaCoffee, FaChevronDown } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';
import QuickcardPin from '../assets/quickcard_pin.png';
import { useAuth } from '../context/AuthContext';
import { VostboxService } from '../services/vostboxService';
import FriendPickerModal from '../components/FriendPickerModal';
import SharedOptionsModal from '../components/SharedOptionsModal';
import MultiPhotoModal from '../components/MultiPhotoModal';
import { generateShareText } from '../utils/vostcardUtils';
import TipDropdownMenu from '../components/TipDropdownMenu';

// Custom quickcard icon for the map
const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

const QuickcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fixBrokenSharedVostcard } = useVostcard();
  const { user } = useAuth();
  
  const [quickcard, setQuickcard] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [showMultiPhotoModal, setShowMultiPhotoModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showSharedOptions, setShowSharedOptions] = useState(false);

  // ✅ Enhanced audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Tip dropdown state
  const [showTipDropdown, setShowTipDropdown] = useState(false);
  const [tipDropdownPosition, setTipDropdownPosition] = useState({ top: 0, left: 0 });
  const tipButtonRef = useRef<HTMLButtonElement>(null);

  // ✅ Performance optimization - memoize photo URLs and audio detection
  const photoURLs = useMemo(() => quickcard?.photoURLs || [], [quickcard?.photoURLs]);
  const hasAudio = useMemo(() => {
    const audioExists = !!(
      quickcard?.audioURL || 
      quickcard?.audioURLs?.length > 0 || 
      quickcard?.audio || 
      quickcard?._firebaseAudioURL ||
      quickcard?._firebaseAudioURLs?.length > 0 ||
      quickcard?.audioFiles?.length > 0
    );
    console.log('🔍 Audio detection:', {
      audioExists,
      audioURL: quickcard?.audioURL,
      audioURLs: quickcard?.audioURLs,
      audio: quickcard?.audio,
      _firebaseAudioURL: quickcard?._firebaseAudioURL,
      _firebaseAudioURLs: quickcard?._firebaseAudioURLs,
      audioFiles: quickcard?.audioFiles
    });
    return audioExists;
  }, [quickcard?.audioURL, quickcard?.audioURLs, quickcard?.audio, quickcard?._firebaseAudioURL, quickcard?._firebaseAudioURLs, quickcard?.audioFiles]);

  useEffect(() => {
    const fetchQuickcard = async () => {
      if (!id) {
        setError('No quickcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading quickcard:', id);
        
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Quickcard found:', data);
          
          // Verify it's actually a quickcard
          if (data.isQuickcard) {
            setQuickcard(data);
            setLoading(false);
          } else {
            setError('This is not a quickcard.');
            setLoading(false);
          }
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
                  setQuickcard(retryData);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix quickcard:', fixError);
          }
          
          setError('Quickcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        console.error('📱 Error loading quickcard:', err);
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
          const userData = userSnap.data();
          console.log('🔍 QuickcardDetailView Debug - Creator userRole:', userData.userRole);
          console.log('🔍 QuickcardDetailView Debug - Creator buyMeACoffeeURL:', userData.buyMeACoffeeURL);
          setUserProfile(userData);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (quickcard?.userID) {
      fetchUserProfile();
    }
  }, [quickcard?.userID]);

  // ✅ Enhanced audio player effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };

    const handleError = () => {
      console.error('Audio failed to load');
      setIsPlaying(false);
      audioRef.current = null;
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [quickcard?.audioURL, quickcard?.audioURLs]);

  const handleShareClick = async () => {
    if (!quickcard) return;
    
    // Check if this is already a posted/public quickcard
    const isAlreadyPosted = quickcard.state === 'posted' || quickcard.visibility === 'public';
    
    // Only show warning for private/personal posts
    if (!isAlreadyPosted) {
      const confirmMessage = `⚠️ Attention:

This will create a public link for your post. Anyone with the link can see it.

Tap OK to continue.`;
      
      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    }
    
    try {
      // Generate public share URL
      const isQuickcard = quickcard.isQuickcard === true;
      const shareUrl = isQuickcard 
        ? `${window.location.origin}/share-quickcard/${quickcard.id}`
        : `${window.location.origin}/share/${quickcard.id}`;
      
      // Generate share text using utility
      const shareText = generateShareText(quickcard, shareUrl);
      
      // Use native sharing or clipboard
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    }
  };

  const handleLikeClick = useCallback(() => {
    setIsLiked(!isLiked);
  }, [isLiked]);

  const handleMapClick = useCallback(() => {
    if (quickcard?.latitude && quickcard?.longitude) {
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
  }, [quickcard, navigate]);

  // ✅ Enhanced audio playback function - MOVED FIRST
  const handlePlayPause = useCallback(async () => {
    console.log('🎵 handlePlayPause called!', { hasAudio, isPlaying });
    
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
      (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audio;

      // Get audio source - check multiple possible fields
      const audioSource = quickcard?.audioURL || 
                         quickcard?.audioURLs?.[0] || 
                         quickcard?.audio || 
                         quickcard?._firebaseAudioURL;

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

      // Play audio
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
      alert('Failed to play audio. Please try again.');
    }
  }, [hasAudio, isPlaying, quickcard]);

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

  // ✅ NEW: Thumbnail click handler - launches audio and shows clicked photo
  const handleThumbnailClick = useCallback((photoUrl: string) => {
    console.log('🖼️ Thumbnail clicked - launching audio and showing clicked photo:', photoUrl);
    
    // Start audio if available
    if (hasAudio) {
      handlePlayPause();
    }
    
    // Show the specific photo that was clicked
    setSelectedPhoto(photoUrl);
  }, [hasAudio, handlePlayPause]);

  // ✅ Main photo click handler - triggers audio and shows main photo (same as thumbnails)
  const handleMainPhotoClick = useCallback(() => {
    console.log('🚨 CLICK DETECTED ON MAIN PHOTO! 🚨');
    console.log('🖼️ Main photo clicked - launching audio and showing main photo');
    
    // Start audio if available
    if (hasAudio) {
      handlePlayPause();
    }
    
    // Show main photo in full screen (same behavior as thumbnails)
    if (photoURLs[0]) {
      setSelectedPhoto(photoURLs[0]);
    }
  }, [hasAudio, photoURLs, handlePlayPause]);



  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFlag = () => {
    alert('Flag functionality not implemented yet');
  };

  const handleTipButtonClick = () => {
    if (tipButtonRef.current) {
      const rect = tipButtonRef.current.getBoundingClientRect();
      setTipDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2
      });
      setShowTipDropdown(!showTipDropdown);
    }
  };

  // Debug logging for audio detection
  useEffect(() => {
    if (quickcard) {
      console.log('🎵 AUDIO DEBUG - Quickcard data:', {
        id: quickcard.id,
        title: quickcard.title,
        hasAudioURL: !!quickcard.audioURL,
        hasAudioURLs: !!quickcard.audioURLs,
        audioURL: quickcard.audioURL,
        audioURLs: quickcard.audioURLs,
        hasAudioCalculated: hasAudio,
        allKeys: Object.keys(quickcard)
      });
    }
  }, [quickcard, hasAudio]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading Quickcard...</div>
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
        height: '100%',
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

  if (!quickcard) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No Quickcard data</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ 
        background: '#07345c', 
        padding: '15px 16px 9px 16px',
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>
          Vōstcard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={24} />
          </button>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              marginRight: '15px'
            }} 
            onClick={() => navigate('/home')}
          >
            <FaHome color="#fff" size={40} />
          </button>
        </div>
      </div>

      {/* User Info */}
      <div style={{ 
        padding: '25px 20px 5px 20px', // 10px extra padding on top
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: '63px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 50, 
              height: 50, 
              borderRadius: '50%', 
              overflow: 'hidden', 
              marginRight: 16,
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (quickcard?.userID) {
                navigate(`/user-profile/${quickcard.userID}`);
              }
            }}
          >
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
          <div 
            style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#333',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (quickcard?.userID) {
                navigate(`/user-profile/${quickcard.userID}`);
              }
            }}
          >
            {quickcard.username || 'Anonymous'}
          </div>
        </div>
      </div>

      {/* ☕ Tip Button for Guides - Under Avatar */}
      {userProfile?.userRole === 'guide' && 
       user?.uid !== quickcard.userID && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '10px',
          marginBottom: '10px'
        }}>
          <button
            ref={tipButtonRef}
            onClick={handleTipButtonClick}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0px 20px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              pointerEvents: 'auto',
              transition: 'transform 0.1s ease',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: '1',
              gap: '8px'
            }}
          >
            Leave a Tip
            <FaChevronDown size={12} />
          </button>
        </div>
      )}

      {/* Title */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center'
        }}>
          {quickcard.title || 'Untitled Quickcard'}
        </h1>
      </div>

      {/* ✅ Enhanced High-Resolution Single Photo Display with Photo Counter */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center',
        minHeight: '350px', // ✅ Increased minimum height for better resolution
        maxHeight: '65vh' // ✅ Increased max height for larger displays
      }}>
        {photoURLs && photoURLs.length > 0 ? (
          <div style={{ 
            width: '100%',
            maxWidth: '800px', // ✅ Increased max width for better resolution
            display: 'flex',
            overflow: 'hidden'
          }}>
            {/* ✅ Single Main Photo - Full Width */}
            <div style={{ 
              flex: 1, // ✅ Full width for single photo
              backgroundColor: 'transparent',
              borderRadius: '16px', // ✅ Increased border radius
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              minHeight: '350px', // ✅ Ensure minimum height for quality
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)' // ✅ Enhanced shadow
            }}>
              <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '350px',
                backgroundColor: '#f8f9fa',
                borderRadius: '16px',
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
                    cursor: 'pointer',
                    // ✅ High-quality image rendering hints
                    imageRendering: 'crisp-edges' as any,
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)', // ✅ Hardware acceleration
                    // ✅ Additional quality settings
                    filter: 'contrast(1.03) saturate(1.08) brightness(1.02)', // ✅ Enhanced image quality
                  } as React.CSSProperties}
                  onClick={() => {
                    if (photoURLs.length > 1) {
                      setSelectedPhotoIndex(0);
                      setShowMultiPhotoModal(true);
                    } else {
                      handleMainPhotoClick();
                    }
                  }} // ✅ Click handler for single or multiple photos
                  loading="eager" // ✅ Prioritize loading
                  fetchPriority="high" // ✅ Ensure high priority loading
                />
                
                {/* ✅ Photo Counter - Always show if multiple photos */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                  {photoURLs.length > 1 && (
                    <div style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', // ✅ Increased opacity
                      color: 'white',
                      padding: '6px 12px', // ✅ Increased padding
                      borderRadius: '16px', // ✅ Increased border radius
                      fontSize: '14px', // ✅ Increased font size
                      fontWeight: 'bold',
                      backdropFilter: 'blur(4px)', // ✅ Subtle blur effect
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)', // ✅ Enhanced shadow
                    }}>
                      1/{photoURLs.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
            No photos available
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={quickcard.audioURL || quickcard.audioURLs?.[0]}
          preload="metadata"
          style={{ display: 'none' }}
        />
      )}

      {/* Intro/Detail/Map Buttons - Only show if there are recordings */}
      {(hasAudio || (quickcard?.latitude && quickcard?.longitude)) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          gap: '16px',
          flexWrap: 'wrap' // Allow wrapping if needed on smaller screens
        }}>
          {/* Intro Button - Always show if there's any audio */}
          <button
            onClick={() => {
              console.log('🎵 Intro button clicked - showing main photo');
              if (photoURLs[0]) {
                setSelectedPhoto(photoURLs[0]);
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

          {/* Detail Button - Show if there's a second recording in any format */}
          {(() => {
            const hasDetailAudio = (
              // Multiple audio files exist
              (quickcard?.audioURLs && quickcard.audioURLs.length >= 2) ||
              (quickcard?._firebaseAudioURLs && quickcard._firebaseAudioURLs.length >= 2) ||
              (quickcard?.audioFiles && quickcard.audioFiles.length >= 2) ||
              (quickcard?.audioLabels && quickcard.audioLabels.includes('detail')) ||
              // TEMPORARY: Show detail button for all quickcards with any audio (both play same audio)
              (quickcard?.isQuickcard && !!(quickcard?.audioURL || quickcard?.audio || quickcard?._firebaseAudioURL))
            );
            
            // Debug logs removed - issue identified
            
            return hasDetailAudio;
          })() && (
            <button
              onClick={() => {
                console.log('🎵 Detail button clicked - showing main photo');
                if (photoURLs[0]) {
                  setSelectedPhoto(photoURLs[0]);
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
              onClick={handleMapClick}
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
      )}

      {/* Action Icons Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid #eee'
      }}>
        {/* REMOVED: Play Button - speaker icon */}

        <button
          onClick={handleLikeClick}
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
          onClick={() => setShowCommentsModal(true)}
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

        <button
          onClick={handleShareClick}
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

        {/* REMOVED: Map Button - map icon */}
      </div>

      {/* Counts Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 40px',
        fontSize: '18px',
        color: '#666'
      }}>
        {hasAudio && <span></span>}
        <span>0</span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Description Link, Flag Icon, and Refresh Button */}
      <div style={{ 
        padding: '20px',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
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

      {/* Modals */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        vostcardID={id!}
        vostcardTitle={quickcard?.title}
      />

      {/* Map Modal */}
      {showMapModal && quickcard?.latitude && quickcard?.longitude && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowMapModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              height: '70vh',
              maxHeight: '600px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: '#07345c',
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Quickcard Location</h3>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ height: 'calc(100% - 68px)', width: '100%' }}>
              <MapContainer
                center={[quickcard.latitude, quickcard.longitude]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={22}
                />
                <Marker
                  position={[quickcard.latitude, quickcard.longitude]}
                  icon={quickcardIcon}
                />
              </MapContainer>
            </div>
          </div>
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
              {quickcard.description || 'No description available.'}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Photo Modal - Shows first photo when thumbnails are clicked */}
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
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              // ✅ High-quality full-screen rendering
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              filter: 'contrast(1.03) saturate(1.08) brightness(1.02)', // ✅ Enhanced quality
            } as React.CSSProperties}
            draggable={false}
          />
        </div>
      )}

      {/* Multi Photo Modal */}
      <MultiPhotoModal
        photos={photoURLs || []}
        initialIndex={selectedPhotoIndex}
        isOpen={showMultiPhotoModal}
        onClose={() => setShowMultiPhotoModal(false)}
        title={quickcard.title}
      />

      {/* Share Options Modal */}
      <SharedOptionsModal
        isOpen={showSharedOptions}
        onClose={() => setShowSharedOptions(false)}
        item={{
          id: id || '',
          title: quickcard?.title,
          description: quickcard?.description,
          isQuickcard: true
        }}
      />

      {/* Tip Dropdown Menu */}
      <TipDropdownMenu
        userProfile={userProfile}
        isVisible={showTipDropdown}
        onClose={() => setShowTipDropdown(false)}
        position={tipDropdownPosition}
      />
    </div>
  );
};

export default QuickcardDetailView; 