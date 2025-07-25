import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaUserCircle, FaTimes, FaFlag, FaSync, FaArrowLeft, FaUserPlus, FaMap, FaCoffee, FaChevronDown, FaPlay, FaPause } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, increment, addDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';
import MultiPhotoModal from '../components/MultiPhotoModal';
import { VostboxService } from '../services/vostboxService';
import { LikeService } from '../services/likeService';
import { RatingService } from '../services/ratingService';
import { type Friend } from '../types/FriendModels';
import FriendPickerModal from '../components/FriendPickerModal';
import SharedOptionsModal from '../components/SharedOptionsModal';
import { generateShareText } from '../utils/vostcardUtils';
import TipDropdownMenu from '../components/TipDropdownMenu';

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { fixBrokenSharedVostcard } = useVostcard();
  const { user } = useAuth();
  
  // Navigation state from previous view
  const navigationState = location.state as any;
  const vostcardList = navigationState?.vostcardList || [];
  const currentIndex = navigationState?.currentIndex || 0;
  
  const [vostcard, setVostcard] = useState<any>(null);
  const [availableVostcards, setAvailableVostcards] = useState<string[]>([]);
  const [currentVostcardIndex, setCurrentVostcardIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // Multi-Photo Modal state - ENHANCED FOR SWIPE FUNCTIONALITY
  const [showMultiPhotoModal, setShowMultiPhotoModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showSharedOptions, setShowSharedOptions] = useState(false);
  
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  
  // Tip dropdown state
  const [showTipDropdown, setShowTipDropdown] = useState(false);
  const [tipDropdownPosition, setTipDropdownPosition] = useState({ top: 0, left: 0 });
  
  // ✅ NEW: Swipe gesture state
  const [touchStart, setTouchStart] = useState<{ y: number; x: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ y: number; x: number; time: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tipButtonRef = useRef<HTMLButtonElement>(null);

  // ✅ Audio playback functionality for quickcards
  const handleAudioPlayback = async () => {
    if (!vostcard) return;
    
    try {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (isPlayingAudio) {
        setIsPlayingAudio(false);
        return;
      }

      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;

      // Get audio source - check multiple possible fields
      const audioSource = vostcard.audioURL || 
                         vostcard.audioURLs?.[0] || 
                         vostcard.audio || 
                         vostcard._firebaseAudioURL;

      if (!audioSource) {
        console.error('No audio source available');
        return;
      }

      // Set audio source
      audio.src = audioSource;
      console.log('🎵 Playing audio from:', audioSource);

      // Audio event listeners
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
        console.log('🎵 Audio duration:', audio.duration);
      });

      audio.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        console.log('🎵 Audio playback ended');
      });

      audio.addEventListener('error', (e) => {
        console.error('🎵 Audio playback error:', e);
        setIsPlayingAudio(false);
        alert('Failed to play audio. Please try again.');
      });

      // Start playback
      await audio.play();
      setIsPlayingAudio(true);
      console.log('🎵 Audio playback started');

    } catch (error) {
      console.error('🎵 Failed to play audio:', error);
      setIsPlayingAudio(false);
      alert('Failed to play audio. Please try again.');
    }
  };

  // Fetch available vostcards for navigation
  const fetchAvailableVostcards = async () => {
    try {
      const vostcardsQuery = query(
        collection(db, 'vostcards'),
        orderBy('createdAt', 'desc')
      );
      const vostcardSnapshot = await getDocs(vostcardsQuery);
      const allVostcardIds = vostcardSnapshot.docs.map(doc => doc.id);
      
      setAvailableVostcards(allVostcardIds);
      
      // If no navigation state provided, find current vostcard index in fetched list
      if (!vostcardList.length && id) {
        const currentIndex = allVostcardIds.findIndex(vostcardId => vostcardId === id);
        setCurrentVostcardIndex(currentIndex !== -1 ? currentIndex : 0);
      }
    } catch (error) {
      console.error('Failed to fetch available vostcards:', error);
    }
  };

  useEffect(() => {
    fetchAvailableVostcards();
  }, [id]);

  useEffect(() => {
    const fetchVostcard = async () => {
      if (!id) {
        setError('No vostcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading vostcard:', id);
        
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Vostcard found:', data);
          
          // If this is a quickcard, redirect to the dedicated QuickcardDetailView
          if (data.isQuickcard) {
            console.log('📱 Redirecting quickcard to dedicated component');
            navigate(`/quickcard/${id}`, { 
              replace: true,
              state: navigationState // Pass along the navigation state
            });
            return;
          }
          
          setVostcard(data);
          setLoading(false);
        } else {
          console.log('📱 Vostcard not found, trying to fix...');
          
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Vostcard fixed, retrying load...');
              
              const retryDocSnap = await getDoc(docRef);
              if (retryDocSnap.exists()) {
                const retryData = retryDocSnap.data();
                setVostcard(retryData);
                setLoading(false);
                return;
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix vostcard:', fixError);
          }
          
          setError('Vostcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        console.error('📱 Error loading vostcard:', err);
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
          const userData = userSnap.data();
          console.log('🔍 VostcardDetailView Debug - Creator userRole:', userData.userRole);
          console.log('🔍 VostcardDetailView Debug - Creator buyMeACoffeeURL:', userData.buyMeACoffeeURL);
          setUserProfile(userData);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (vostcard?.userID) {
      fetchUserProfile();
    }
  }, [vostcard?.userID]);

  // Load existing like status
  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!user || !vostcard?.id) return;
      
      try {
        const isLiked = await LikeService.isLiked(vostcard.id);
        setIsLiked(isLiked);
      } catch (error) {
        console.error('Failed to load like status:', error);
      }
    };
    
    loadLikeStatus();
  }, [user, vostcard?.id]);

  // Load existing rating
  useEffect(() => {
    const loadUserRating = async () => {
      if (!user || !vostcard?.id) return;
      
      try {
        const rating = await RatingService.getCurrentUserRating(vostcard.id);
        setUserRating(rating);
      } catch (error) {
        console.error('Failed to load user rating:', error);
      }
    };
    
    loadUserRating();
  }, [user, vostcard?.id]);

  // ENHANCED AUDIO DETECTION - Support both regular vostcards and quickcards
  useEffect(() => {
    const detectAudio = async () => {
      const vostcardWithAudio = vostcard as any;
      
      // Check for audio in different formats:
      // - Regular vostcards: .audio, ._firebaseAudioURL
      // - Quickcards: .audioURL, .audioURLs
      const audioSource = vostcardWithAudio?.audio || 
                         vostcardWithAudio?._firebaseAudioURL || 
                         vostcardWithAudio?.audioURL || 
                         vostcardWithAudio?.audioURLs?.[0];
                         
      console.log('🎵 Audio detection:', {
        hasAudio: !!audioSource,
        isQuickcard: vostcardWithAudio?.isQuickcard,
        audioSource: audioSource ? 'found' : 'none',
        audioFields: {
          audio: !!vostcardWithAudio?.audio,
          _firebaseAudioURL: !!vostcardWithAudio?._firebaseAudioURL,
          audioURL: !!vostcardWithAudio?.audioURL,
          audioURLs: !!vostcardWithAudio?.audioURLs
        }
      });
      
      if (audioSource) {
        try {
          // Create temporary audio element to get duration
          const audio = new Audio();
          
          if (vostcardWithAudio.audio instanceof Blob) {
            audio.src = URL.createObjectURL(vostcardWithAudio.audio);
          } else if (audioSource) {
            audio.src = audioSource;
          }
          
          audio.onloadedmetadata = () => {
            setAudioDuration(audio.duration);
            // Clean up
            if (vostcardWithAudio.audio instanceof Blob) {
              URL.revokeObjectURL(audio.src);
            }
          };
        } catch (error) {
          console.error('Error detecting audio:', error);
        }
      }
    };

    if (vostcard) {
      detectAudio();
    }
  }, [vostcard]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);



  const handleShareClick = async () => {
    if (!vostcard) return;
    
    // Check if this is already a posted/public vostcard
    const isAlreadyPosted = vostcard.state === 'posted' || vostcard.visibility === 'public';
    
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
      const isQuickcard = vostcard.isQuickcard === true;
      const shareUrl = isQuickcard 
        ? `${window.location.origin}/share-quickcard/${vostcard.id}`
        : `${window.location.origin}/share/${vostcard.id}`;
      
      // Generate share text using utility
      const shareText = generateShareText(vostcard, shareUrl);
      
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

  const handleMapClick = () => {
    // Navigate all users to public map view regardless of authentication status
    if (vostcard?.latitude && vostcard?.longitude) {
      console.log('📍 Opening vostcard location on public map');
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
  };

  const handleLikeClick = async () => {
    if (!user) {
      alert('Please log in to like this vostcard');
      return;
    }
    
    if (!vostcard?.id) {
      alert('Unable to like this vostcard');
      return;
    }

    try {
      const newLikedState = await LikeService.toggleLike(vostcard.id);
      setIsLiked(newLikedState);
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status. Please try again.');
    }
  };

  // ENHANCED AUDIO PLAY FUNCTION - Support both formats
  const playAudio = async () => {
    const vostcardWithAudio = vostcard as any;
    
    // Check for audio in different formats
    const audioSource = vostcardWithAudio?.audio || 
                       vostcardWithAudio?._firebaseAudioURL || 
                       vostcardWithAudio?.audioURL || 
                       vostcardWithAudio?.audioURLs?.[0];
                       
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
      if (vostcardWithAudio.audio instanceof Blob) {
        audio.src = URL.createObjectURL(vostcardWithAudio.audio);
      } else {
        audio.src = audioSource;
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

      // Play audio
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlayingAudio(false);
    }
  };

  const handleAudioClick = () => {
    const vostcardWithAudio = vostcard as any;
    
    // Check for audio in different formats
    const hasAudio = vostcardWithAudio?.audio || 
                    vostcardWithAudio?._firebaseAudioURL || 
                    vostcardWithAudio?.audioURL || 
                    vostcardWithAudio?.audioURLs?.[0];
                    
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
  };

  // ENHANCED PHOTO CLICK HANDLER - Use MultiPhotoModal for swipe functionality
  const handlePhotoClick = (photoUrl: string) => {
    if (vostcard.photoURLs && vostcard.photoURLs.length > 1) {
      // Multiple photos - use MultiPhotoModal with swipe
      const index = vostcard.photoURLs.indexOf(photoUrl);
      setSelectedPhotoIndex(index >= 0 ? index : 0);
      setShowMultiPhotoModal(true);
    } else {
      // Single photo - use simple modal
      setSelectedPhoto(photoUrl);
    }
  };

  const formatAudioDuration = (duration: number) => {
    if (duration < 60) {
      return `${Math.round(duration)}s`;
    } else {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.round(duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const handleRatingClick = async (rating: number) => {
    if (!user) {
      alert('Please log in to rate this vostcard');
      return;
    }
    
    if (!vostcard?.id) {
      alert('Unable to rate this vostcard');
      return;
    }

    try {
      if (rating > 0) {
        await RatingService.submitRating(vostcard.id, rating);
      }
      setUserRating(rating);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFlag = () => {
    navigate('/flag-form', {
      state: {
        vostcardId: vostcard?.id,
        vostcardTitle: vostcard?.title || 'Untitled Vostcard',
        username: vostcard?.username || 'Anonymous'
      }
    });
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



  // Navigation functions
  const handlePreviousVostcard = () => {
    if (vostcardList.length > 0) {
      // Use provided list navigation
      if (currentIndex > 0) {
        const previousId = vostcardList[currentIndex - 1];
        navigate(`/vostcard/${previousId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex - 1
          }
        });
      }
    } else {
      // Use fetched vostcards navigation
      if (currentVostcardIndex > 0 && availableVostcards.length > 0) {
        const previousId = availableVostcards[currentVostcardIndex - 1];
        navigate(`/vostcard/${previousId}`);
      }
    }
  };

  const handleNextVostcard = () => {
    if (vostcardList.length > 0) {
      // Use provided list navigation
      if (currentIndex < vostcardList.length - 1) {
        const nextId = vostcardList[currentIndex + 1];
        navigate(`/vostcard/${nextId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex + 1
          }
        });
      }
    } else {
      // Use fetched vostcards navigation
      if (currentVostcardIndex < availableVostcards.length - 1 && availableVostcards.length > 0) {
        const nextId = availableVostcards[currentVostcardIndex + 1];
        navigate(`/vostcard/${nextId}`);
      }
    }
  };

  // Check if navigation is available
  const canGoToPrevious = vostcardList.length > 0 
    ? currentIndex > 0 
    : currentVostcardIndex > 0 && availableVostcards.length > 0;
  
  const canGoToNext = vostcardList.length > 0 
    ? currentIndex < vostcardList.length - 1 
    : currentVostcardIndex < availableVostcards.length - 1 && availableVostcards.length > 0;

  // ✅ NEW: Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      y: touch.clientY,
      x: touch.clientX,
      time: Date.now()
    });
    setTouchEnd(null);
    setIsScrolling(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentX = touch.clientX;
    
    setTouchEnd({
      y: currentY,
      x: currentX,
      time: Date.now()
    });

    // Detect if user is scrolling vertically (rather than swiping for navigation)
    const yDiff = Math.abs(currentY - touchStart.y);
    const xDiff = Math.abs(currentX - touchStart.x);
    
    // If the vertical movement is significantly more than horizontal, it's a scroll
    if (yDiff > 20 && yDiff > xDiff * 2) {
      setIsScrolling(true);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || isScrolling) {
      // Reset and allow normal scrolling
      setTouchStart(null);
      setTouchEnd(null);
      setIsScrolling(false);
      return;
    }

    const distance = touchStart.y - touchEnd.y;
    const horizontalDistance = Math.abs(touchStart.x - touchEnd.x);
    const timeDiff = touchEnd.time - touchStart.time;
    
    // Only trigger navigation if:
    // 1. Vertical swipe is significant (>60px)
    // 2. Horizontal movement is minimal (<30px) 
    // 3. Gesture is quick (<400ms)
    // 4. User wasn't scrolling
    const isValidSwipe = Math.abs(distance) > 60 && 
                        horizontalDistance < 30 && 
                        timeDiff < 400 && 
                        !isScrolling;
    
    if (isValidSwipe) {
      if (distance > 0) {
        // Swipe up - go to next vostcard
        if (canGoToNext) {
          handleNextVostcard();
        }
      } else {
        // Swipe down - go to previous vostcard
        if (canGoToPrevious) {
          handlePreviousVostcard();
        }
      }
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
  };

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
          <div style={{ fontSize: '18px', color: '#666' }}>Loading Vostcard...</div>
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

  if (!vostcard) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No Vostcard data</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        height: 'auto',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        touchAction: 'pan-y'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
        <span 
          onClick={() => navigate('/home')}
          style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem', cursor: 'pointer' }}>
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

      {/* ✅ Enhanced swipe indicator with navigation info */}
      {(canGoToPrevious || canGoToNext) && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          zIndex: 10,
          opacity: 0.4,
          pointerEvents: 'none'
        }}>
          {canGoToPrevious && (
            <div style={{
              width: '2px',
              height: '20px',
              backgroundColor: '#333',
              borderRadius: '1px'
            }} />
          )}
          <div style={{
            width: '4px',
            height: '4px',
            backgroundColor: '#333',
            borderRadius: '50%'
          }} />
          {canGoToNext && (
            <div style={{
              width: '2px',
              height: '20px',
              backgroundColor: '#333',
              borderRadius: '1px'
            }} />
          )}
        </div>
      )}

      {/* ✅ Scrollable content area */}
      <div style={{
        paddingTop: '20px', // Minimal top spacing
        paddingBottom: '40px', // Extra space at bottom
        minHeight: 'calc(100vh + 100px)' // Ensure content is taller than viewport for scrolling
      }}>
        {/* User Info */}
        <div style={{ 
          padding: '15px 20px 5px 20px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between', // Changed to space-between for tip button
          marginTop: '60px', // Proper spacing to clear fixed header
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
                if (vostcard?.userID) {
                  navigate(`/user-profile/${vostcard.userID}`);
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
                if (vostcard?.userID) {
                  navigate(`/user-profile/${vostcard.userID}`);
                }
              }}
            >
              {vostcard.username || 'Anonymous'}
          </div>
        </div>

          {/* ☕ Tip Button for Guides - Right aligned with avatar */}
        {userProfile?.userRole === 'guide' && 
         user?.uid !== vostcard.userID && (
            <button
              ref={tipButtonRef}
              onClick={handleTipButtonClick}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                transition: 'transform 0.1s ease',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1',
                gap: '6px'
              }}
            >
              Leave a Tip
              <FaChevronDown size={10} />
            </button>
        )}
        </div>



        {/* Title */}
        <div style={{ padding: '0 20px' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#333',
            textAlign: 'center'
          }}>
            {vostcard.title || 'Untitled Vostcard'}
          </h1>
        </div>

        {/* Media Section */}
        {vostcard.isQuickcard ? (
          <div style={{ 
            padding: '20px', 
            display: 'flex', 
            justifyContent: 'center'
          }}>
            {vostcard.photoURLs && vostcard.photoURLs.length > 0 ? (
              <div style={{ 
                width: '100%',
                maxWidth: '800px',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#f8f9fa',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                position: 'relative',
                cursor: 'pointer'
              }}>
                <img
                  src={vostcard.photoURLs[0]}
                  alt="Quickcard"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    cursor: 'pointer',
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                    filter: 'contrast(1.03) saturate(1.08) brightness(1.02)'
                  } as React.CSSProperties}
                  onClick={() => {
                    const hasAudio = !!(vostcard.audioURL || vostcard.audioURLs?.length > 0 || vostcard.audio || vostcard._firebaseAudioURL || vostcard._firebaseAudioURLs?.length > 0 || vostcard.audioFiles?.length > 0);
                    
                    if (hasAudio) {
                      handleAudioPlayback();
                    } else if (vostcard.photoURLs.length > 1) {
                      setSelectedPhotoIndex(0);
                      setShowMultiPhotoModal(true);
                    } else {
                      handlePhotoClick(vostcard.photoURLs[0]);
                    }
                  }}
                  loading="eager"
                  fetchPriority="high"
                />
                
                {vostcard.photoURLs.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                    1/{vostcard.photoURLs.length}
                  </div>
                )}
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
        ) : (
          // Regular vostcard layout - video thumbnail on left, 2 photos stacked on right
          <div style={{ 
            padding: '20px', 
            display: 'flex', 
            gap: '10px',
            height: '300px'
          }}>
            {/* Video Thumbnail Section */}
            <div style={{ 
              flex: 1,
              backgroundColor: vostcard.videoURL ? 'transparent' : '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {vostcard.videoURL ? (
                <>
                <video
                  ref={videoRef}
                  src={vostcard.videoURL}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  playsInline
                    muted
                  onClick={() => setShowVideoModal(true)}
                />
                  {/* Play Button Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '60px',
                      height: '60px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    onClick={() => setShowVideoModal(true)}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '20px solid white',
                        borderTop: '12px solid transparent',
                        borderBottom: '12px solid transparent',
                        marginLeft: '4px'
                      }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ 
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  No video
                </div>
              )}
            </div>

            {/* Photos Section - 2 photos stacked vertically */}
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              {/* First Photo */}
              {vostcard.photoURLs && vostcard.photoURLs.length > 0 ? (
                <div style={{ 
                  flex: 1,
                  borderRadius: '8px', 
                  overflow: 'hidden'
                }}>
                  <img
                    src={vostcard.photoURLs[0]}
                    alt="Photo 1"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => handlePhotoClick(vostcard.photoURLs[0])}
                  />
                </div>
              ) : (
                <div style={{ 
                  flex: 1,
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '14px'
                }}>
                  No photo
                </div>
              )}
              
              {/* Second Photo */}
              {vostcard.photoURLs && vostcard.photoURLs.length > 1 ? (
                <div style={{ 
                  flex: 1,
                  borderRadius: '8px', 
                  overflow: 'hidden'
                }}>
                  <img
                    src={vostcard.photoURLs[1]}
                    alt="Photo 2"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => handlePhotoClick(vostcard.photoURLs[1])}
                  />
                </div>
              ) : (
                <div style={{ 
                  flex: 1,
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '14px'
                }}>
                  No photo
                </div>
              )}
            </div>
          </div>
        )}

        {/* Intro/Detail/Map Buttons - Show if there are recordings OR location data */}
        {vostcard.isQuickcard && (!!(vostcard.audioURL || vostcard.audioURLs?.length > 0 || vostcard.audio || vostcard._firebaseAudioURL || vostcard._firebaseAudioURLs?.length > 0 || vostcard.audioFiles?.length > 0) || !!(vostcard?.geo?.latitude && vostcard?.geo?.longitude)) && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            gap: '16px'
          }}>
            {/* Intro Button - Always show if there's any audio */}
            <button
              onClick={() => {
                console.log('🎵 Intro button clicked - playing audio and showing swipeable photo gallery');
                // Play audio
                handleAudioPlayback();
                // Show swipeable photo gallery starting with first photo
                if (vostcard.photoURLs && vostcard.photoURLs.length > 0) {
                  setSelectedPhotoIndex(0);
                  setShowMultiPhotoModal(true);
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

            {/* Detail Button - Show ONLY if there's a second recording */}
            {(() => {
              const hasDetailAudio = (
                // Multiple audio files exist in any format
                (vostcard?.audioURLs && vostcard.audioURLs.length >= 2) ||
                (vostcard?._firebaseAudioURLs && vostcard._firebaseAudioURLs.length >= 2) ||
                (vostcard?.audioFiles && vostcard.audioFiles.length >= 2) ||
                // Check if audioLabels includes 'detail' (indicates 2+ audio files)
                (vostcard?.audioLabels && vostcard.audioLabels.includes('detail')) ||
                // Explicit detail audio field exists
                (vostcard?.detailAudioURL) ||
                // Both intro and detail audio fields exist
                (vostcard?.introAudioURL && vostcard?.detailAudioURL)
              );
              
              console.log('🔍 Detail button check:', {
                hasDetailAudio,
                audioFilesLength: vostcard?.audioFiles?.length || 0,
                audioLabels: vostcard?.audioLabels,
                hasDetailLabel: vostcard?.audioLabels?.includes('detail'),
                vostcardId: vostcard?.id
              });
              
              return hasDetailAudio;
            })() && (
              <button
                onClick={() => {
                  console.log('🎵 Detail button clicked - playing detail audio');
                  
                  // Try to find and play the detail audio specifically
                  const detailAudioSource = 
                    // If audioLabels exist, find the detail audio at the same index
                    (vostcard?.audioLabels && vostcard.audioFiles && 
                     vostcard.audioLabels.includes('detail')) ? 
                     vostcard.audioFiles[vostcard.audioLabels.indexOf('detail')] :
                    // Fallback: use second audio file if multiple exist
                    vostcard?.audioURLs?.[1] || 
                    vostcard?._firebaseAudioURLs?.[1] || 
                    vostcard?.audioFiles?.[1] ||
                    vostcard?.detailAudioURL ||
                    // Ultimate fallback: use first audio
                    vostcard?.audioURL;
                    
                  console.log('🎵 Playing detail audio:', !!detailAudioSource);
                  
                  // Use the same playback mechanism but with detail audio
                  if (detailAudioSource) {
                    handleAudioPlayback(); // This will be enhanced to support detail audio
                  }
                  
                  // Show swipeable photo gallery starting with first photo
                  if (vostcard.photoURLs && vostcard.photoURLs.length > 0) {
                    setSelectedPhotoIndex(0);
                    setShowMultiPhotoModal(true);
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
            {vostcard?.latitude && vostcard?.longitude && (
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
            onClick={() => {/* Handle star action */}}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffd700'
            }}
          >
            <FaStar size={30} />
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
          {/* REMOVED: Audio Button - speaker icon */}
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
          <span>0</span>
          <span>0.0</span>
          <span>0</span>
          <span></span>
          {/* Audio duration - ENHANCED for both vostcard types */}
          {(((vostcard as any)?.audio || (vostcard as any)?._firebaseAudioURL || (vostcard as any)?.audioURL || (vostcard as any)?.audioURLs?.[0]) && (
            <span>{audioDuration ? formatAudioDuration(audioDuration) : '...'}</span>
          ))}
        </div>

        {/* Worth Seeing Rating */}
        <div style={{
          padding: '0',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            color: '#333'
          }}>
            Worth Seeing?
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRatingClick(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: star <= userRating ? '#ffd700' : '#ddd'
                }}
              >
                <FaStar size={24} />
              </button>
            ))}
          </div>
        </div>

        {/* Description Link, Flag Icon, and Refresh Button */}
        <div style={{ 
          padding: '20px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Flag Icon - px from left */}
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

        {/* Modals */}
        <CommentsModal
          isOpen={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          vostcardID={id!}
          vostcardTitle={vostcard?.title}
        />

        {/* Description Modal */}
        {showDescriptionModal && (
          <div
            style={{
              position: 'absolute',
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
                {vostcard.description || 'No description available.'}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Multi-Photo Modal with Swipe */}
        {showMultiPhotoModal && vostcard.photoURLs && (
          <MultiPhotoModal
            photos={vostcard.photoURLs}
            initialIndex={selectedPhotoIndex}
            isOpen={showMultiPhotoModal}
            onClose={() => setShowMultiPhotoModal(false)}
            title={vostcard.title}
          />
        )}

        {/* Single Photo Modal (fallback) */}
        {selectedPhoto && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001
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
                cursor: 'pointer'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Video Modal */}
        {showVideoModal && vostcard.videoURL && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => setShowVideoModal(false)}
          >
            <div
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              <video
                src={vostcard.videoURL}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 8,
                  backgroundColor: '#000'
                }}
                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Multi Photo Modal */}
        {/* Share Options Modal */}
        {/* <SharedOptionsModal
          isOpen={showSharedOptions}
          onClose={() => setShowSharedOptions(false)}
          item={{
            id: id || '',
            title: vostcard?.title,
            description: vostcard?.description,
            isQuickcard: vostcard?.isQuickcard
          }}
        /> */}

        {/* Tip Dropdown Menu */}
        <TipDropdownMenu
          userProfile={userProfile}
          isVisible={showTipDropdown}
          onClose={() => setShowTipDropdown(false)}
          position={tipDropdownPosition}
        />
      </div>
    </div>
  );
};

export default VostcardDetailView;