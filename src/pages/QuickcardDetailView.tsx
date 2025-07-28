import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaTimes, FaSync, FaHeart, FaRegComment, FaShare, FaUserCircle, FaFlag, FaMap, FaPlay, FaPause, FaCoffee, FaChevronDown, FaStar } from 'react-icons/fa';
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
import { LikeService } from '../services/likeService';
import { RatingService } from '../services/ratingService';
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
  const location = useLocation();
  const { fixBrokenSharedVostcard } = useVostcard();
  const { user } = useAuth();
  
  // Navigation state from previous view
  const navigationState = location.state as any;
  const vostcardList = navigationState?.vostcardList || [];
  const currentIndex = navigationState?.currentIndex || 0;
  
  // Debug navigation state on load and scroll to top
  useEffect(() => {
    console.log('🔍 QuickcardDetailView loaded:', {
      vostcardList: vostcardList.length,
      currentIndex,
      id,
      canGoToPrevious: vostcardList.length > 0 && currentIndex > 0,
      canGoToNext: vostcardList.length > 0 && currentIndex < vostcardList.length - 1
    });
    
    // Ensure page loads at top with avatar visible under banner
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]); // Only log when ID changes, not on every render
  
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
  const [userRating, setUserRating] = useState(0);

  // ✅ Enhanced audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Tip dropdown state
  const [showTipDropdown, setShowTipDropdown] = useState(false);
  const [tipDropdownPosition, setTipDropdownPosition] = useState({ top: 0, left: 0 });
  const tipButtonRef = useRef<HTMLButtonElement>(null);

  // Swipe gesture state for navigation
  const [touchStart, setTouchStart] = useState<{ y: number; x: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ y: number; x: number; time: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

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

  // Removed redundant navigation state logging

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

  // Load existing like status
  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!user || !quickcard?.id) return;
      
      try {
        const isLiked = await LikeService.isLiked(quickcard.id);
        setIsLiked(isLiked);
      } catch (error) {
        console.error('Failed to load like status:', error);
      }
    };
    
    loadLikeStatus();
  }, [user, quickcard?.id]);

  // Load existing rating
  useEffect(() => {
    const loadUserRating = async () => {
      if (!user || !quickcard?.id) return;
      
      try {
        const rating = await RatingService.getCurrentUserRating(quickcard.id);
        setUserRating(rating);
      } catch (error) {
        console.error('Failed to load user rating:', error);
      }
    };
    
    loadUserRating();
  }, [user, quickcard?.id]);

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

  const handleLikeClick = useCallback(async () => {
    if (!user) {
      alert('Please log in to like this quickcard');
      return;
    }
    
    if (!quickcard?.id) {
      alert('Unable to like this quickcard');
      return;
    }

    try {
      const newLikedState = await LikeService.toggleLike(quickcard.id);
      setIsLiked(newLikedState);
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status. Please try again.');
    }
  }, [user, quickcard?.id]);

  const handleMapClick = useCallback(() => {
    if (quickcard?.latitude && quickcard?.longitude) {
      console.log('📍 Opening quickcard location on private map at full zoom');
      navigate('/home', {
        replace: false, // Ensure we add to history so back button works
        state: {
          singleVostcard: {
            id: quickcard.id,
            title: quickcard.title,
            description: quickcard.description,
            latitude: quickcard.latitude,
            longitude: quickcard.longitude,
            photoURLs: quickcard.photoURLs,
            username: quickcard.username,
            userRole: quickcard.userRole,
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

  // ✅ NEW: Enhanced audio playback functions for Intro and Detail
  const handleIntroAudioPlayback = useCallback(async () => {
    console.log('🎵 Playing intro audio');
    
    if (!hasAudio) {
      console.log('❌ No audio detected');
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

      // Get intro audio source - prioritize intro-specific fields
      const introAudioSource = quickcard?.introAudioURL || 
                              quickcard?.audioURL || 
                              quickcard?.audioURLs?.[0] || 
                              quickcard?.audio || 
                              quickcard?._firebaseAudioURL;

      if (!introAudioSource) {
        console.error('No intro audio source available');
        return;
      }

      // Set audio source
      if (introAudioSource instanceof Blob) {
        audio.src = URL.createObjectURL(introAudioSource);
      } else if (typeof introAudioSource === 'string') {
        audio.src = introAudioSource;
      } else {
        console.error('Invalid audio source type:', typeof introAudioSource);
        return;
      }

      // Audio event listeners
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        console.log('🎵 Intro audio playback ended');
      });

      audio.addEventListener('error', (e) => {
        console.error('🎵 Intro audio playback error:', e);
        setIsPlaying(false);
      });

      // Play audio
      await audio.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Error playing intro audio:', error);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
    }
  }, [hasAudio, isPlaying, quickcard]);

  const handleDetailAudioPlayback = useCallback(async () => {
    console.log('🎵 Playing detail audio');
    
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

      // Get detail audio source
      const detailAudioSource = 
        // Check for explicit detail audio
        quickcard?.detailAudioURL ||
        // Check for labeled audio
        (quickcard?.audioLabels && quickcard.audioFiles && 
         quickcard.audioLabels.includes('detail')) ? 
         quickcard.audioFiles[quickcard.audioLabels.indexOf('detail')] :
        // Check for second audio in arrays
        quickcard?.audioURLs?.[1] || 
        quickcard?._firebaseAudioURLs?.[1] || 
        quickcard?.audioFiles?.[1] ||
        // Fallback to first audio
        quickcard?.audioURL ||
        quickcard?.audioURLs?.[0] ||
        quickcard?.audio ||
        quickcard?._firebaseAudioURL;

      if (!detailAudioSource) {
        console.error('No detail audio source available');
        return;
      }

      // Set audio source
      if (detailAudioSource instanceof Blob) {
        audio.src = URL.createObjectURL(detailAudioSource);
      } else if (typeof detailAudioSource === 'string') {
        audio.src = detailAudioSource;
      } else {
        console.error('Invalid audio source type:', typeof detailAudioSource);
        return;
      }

      // Audio event listeners
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        console.log('🎵 Detail audio playback ended');
      });

      audio.addEventListener('error', (e) => {
        console.error('🎵 Detail audio playback error:', e);
        setIsPlaying(false);
      });

      // Play audio
      await audio.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Error playing detail audio:', error);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
    }
  }, [isPlaying, quickcard]);


  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFlag = () => {
    navigate('/flag-form', {
      state: {
        vostcardId: quickcard?.id,
        vostcardTitle: quickcard?.title || 'Untitled Quickcard',
        username: quickcard?.username || 'Anonymous'
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

  // Navigation functions for swipe gestures
  const canGoToPrevious = vostcardList.length > 0 && currentIndex > 0;
  const canGoToNext = vostcardList.length > 0 && currentIndex < vostcardList.length - 1;

  const handlePreviousQuickcard = () => {
    // Scroll to top before navigation to show avatar under banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('🔄 handlePreviousQuickcard called:', { canGoToPrevious, currentIndex, vostcardList: vostcardList.length });
    if (canGoToPrevious) {
      const previousId = vostcardList[currentIndex - 1];
      console.log('📱 Navigating to previous:', previousId, 'index:', currentIndex - 1);
      try {
        navigate(`/vostcard/${previousId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex - 1
          }
        });
        console.log('✅ Navigation to previous completed successfully');
      } catch (error) {
        console.error('🚨 ERROR during navigation to previous:', error);
      }
    } else {
      console.log('❌ Cannot navigate to previous:', { canGoToPrevious, currentIndex });
    }
  };

  const handleNextQuickcard = () => {
    // Scroll to top before navigation to show avatar under banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('🔄 handleNextQuickcard called:', { canGoToNext, currentIndex, vostcardList: vostcardList.length });
    if (canGoToNext) {
      const nextId = vostcardList[currentIndex + 1];
      console.log('📱 Navigating to next:', nextId, 'index:', currentIndex + 1);
      try {
        navigate(`/vostcard/${nextId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex + 1
          }
        });
        console.log('✅ Navigation to next completed successfully');
      } catch (error) {
        console.error('🚨 ERROR during navigation to next:', error);
      }
    } else {
      console.log('❌ Cannot navigate to next:', { canGoToNext, currentIndex, listLength: vostcardList.length });
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    console.log('🔍 Touch START detected:', { 
      y: touch.clientY, 
      x: touch.clientX,
      currentIndex,
      vostcardList: vostcardList.length,
      id
    });
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

    // Simplified: Let the swipe validation handle all gesture detection
    // Removed aggressive scrolling detection that was blocking swipe gestures
  };

  const handleTouchEnd = () => {
    console.log('🔍 Touch END detected:', { 
      touchStart: !!touchStart, 
      touchEnd: !!touchEnd, 
      isScrolling,
      currentIndex,
      vostcardList: vostcardList.length,
      id
    });
    
    try {
      if (!touchStart || !touchEnd || isScrolling) {
        // Reset and allow normal scrolling
        console.log('🔍 Touch END - Early return:', { 
          touchStart: !!touchStart, 
          touchEnd: !!touchEnd, 
          isScrolling,
          reason: !touchStart ? 'no touchStart' : !touchEnd ? 'no touchEnd' : 'isScrolling'
        });
        setTouchStart(null);
        setTouchEnd(null);
        setIsScrolling(false);
        return;
      }

    const distance = touchStart.y - touchEnd.y;
    const horizontalDistance = Math.abs(touchStart.x - touchEnd.x);
    const timeDiff = touchEnd.time - touchStart.time;
    
    // Device-adaptive thresholds for better mobile experience
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const verticalThreshold = 30;
    const horizontalThreshold = isMobile ? 80 : 150; // Mobile: tighter, Laptop: looser
    const timeThreshold = isMobile ? 800 : 1500; // Mobile: faster, Laptop: slower
    
    const isValidSwipe = Math.abs(distance) > verticalThreshold && 
                        horizontalDistance < horizontalThreshold && 
                        timeDiff < timeThreshold && 
                        !isScrolling;
    
    console.log('🔍 QuickcardDetailView Swipe Debug:', {
      distance,
      horizontalDistance,
      timeDiff,
      isValidSwipe,
      isScrolling,
      canGoToNext,
      canGoToPrevious,
      vostcardList: vostcardList.length,
      currentIndex,
      deviceType: isMobile ? 'mobile' : 'desktop',
      thresholds: { vertical: verticalThreshold, horizontal: horizontalThreshold, time: timeThreshold }
    });
    
    if (isValidSwipe) {
      if (distance > 0) {
        // Swipe up - go to next quickcard
        console.log('📱 Swiping up to next item...', { distance, canGoToNext, currentIndex, listLength: vostcardList.length });
        if (canGoToNext) {
          handleNextQuickcard();
        } else {
          console.log('❌ Cannot go to next - at end of list');
        }
      } else {
        // Swipe down - go to previous quickcard
        console.log('📱 Swiping down to previous item...', { distance, canGoToPrevious, currentIndex, listLength: vostcardList.length });
        if (canGoToPrevious) {
          handlePreviousQuickcard();
        } else {
          console.log('❌ Cannot go to previous - at start of list', { currentIndex, canGoToPrevious });
        }
      }
    } else {
      console.log('❌ Invalid swipe gesture');
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
    
    } catch (error) {
      console.error('🚨 ERROR in handleTouchEnd:', error);
      console.log('🔧 Resetting touch state after error');
      setTouchStart(null);
      setTouchEnd(null);
      setIsScrolling(false);
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
        overscrollBehavior: 'contain',
        touchAction: 'manipulation'
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

      {/* Swipe navigation indicators */}
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

      {/* User Info */}
      <div style={{ 
        padding: '15px 20px 5px 20px',
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '60px', // Minimal spacing to clear fixed header
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

        {/* ☕ Tip Button for Guides - Right side of avatar row */}
      {userProfile?.userRole === 'guide' && 
       user?.uid !== quickcard.userID && (
          <button
            ref={tipButtonRef}
            onClick={handleTipButtonClick}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              pointerEvents: 'auto',
              transition: 'transform 0.1s ease',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: '1',
              gap: '4px'
            }}
          >
            Leave a Tip
            <FaChevronDown size={8} />
          </button>
      )}
      </div>

      {/* Title */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center'
        }}>
          {quickcard.title || 'Untitled Quickcard'}
        </h1>
      </div>

      {/* ✅ UPDATED: Auto-Height Single Photo Display */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        {photoURLs && photoURLs.length > 0 ? (
          <div style={{ 
            width: '100%',
            maxWidth: '75%',
            borderRadius: '16px',
              overflow: 'hidden',
            backgroundColor: '#f8f9fa',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              position: 'relative',
            cursor: 'pointer'
              }}>
                <img
                  src={photoURLs[0]}
                  alt="Quickcard"
                  style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '1',
                    objectFit: 'cover',
                    display: 'block',
                    cursor: 'pointer',
                    imageRendering: 'crisp-edges' as any,
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                    filter: 'contrast(1.03) saturate(1.08) brightness(1.02)'
                  } as React.CSSProperties}
                  onClick={() => {
                console.log('🖼️ Main photo clicked - launching audio and showing slideshow');
                // Play intro audio if available
                if (hasAudio) {
                  handleIntroAudioPlayback();
                }
                // Show photo slideshow starting with first photo WITH AUTO-PLAY
                if (photoURLs && photoURLs.length > 0) {
                      setSelectedPhotoIndex(0);
                      setShowMultiPhotoModal(true);
                    }
              }}
              loading="eager"
              fetchPriority="high"
                />
                
                  {photoURLs.length > 1 && (
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
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                    }}>
                      1/{photoURLs.length}
                    </div>
                  )}
          </div>
        ) : (
          <div style={{ 
            width: '100%',
            maxWidth: '75%',
            aspectRatio: '1',
            backgroundColor: '#f8f9fa',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #dee2e6'
          }}>
            <FaMap size={48} color="#ccc" />
          </div>
        )}
        
        {/* ✅ ADDED: "Tap Thumbnail to play" text */}
        <div style={{
          fontSize: '22px',
          color: '#666',
          textAlign: 'center',
          fontStyle: 'italic',
          fontWeight: 'bold'
        }}>
          Tap Thumbnail to play
        </div>
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
          padding: '0px',
          gap: '5px',
          flexWrap: 'wrap' // Allow wrapping if needed on smaller screens
        }}>
          {/* Detail Button - Show ONLY if there's a second recording */}
          {(() => {
            const hasDetailAudio = (
              // Multiple audio files exist
              (quickcard?.audioURLs && quickcard.audioURLs.length >= 2) ||
              (quickcard?._firebaseAudioURLs && quickcard._firebaseAudioURLs.length >= 2) ||
              (quickcard?.audioFiles && quickcard.audioFiles.length >= 2) ||
              (quickcard?.audioLabels && quickcard.audioLabels.includes('detail')) ||
              // Explicit detail audio field exists
              (quickcard?.detailAudioURL) ||
              // Both intro and detail audio fields exist
              (quickcard?.introAudioURL && quickcard?.detailAudioURL)
            );
            
            return hasDetailAudio;
          })() && (
            <button
              onClick={() => {
                console.log('🎵 Detail button clicked - playing detail audio and showing slideshow');
                // Play detail audio
                handleDetailAudioPlayback();
                // Show photo slideshow starting with first photo WITH AUTO-PLAY
                if (photoURLs && photoURLs.length > 0) {
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
              More
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
          <FaHeart size={22} />
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
          <FaRegComment size={22} />
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
          <FaShare size={22} />
        </button>

        {/* Map View Button - Always show if location data exists */}
        {quickcard?.latitude && quickcard?.longitude && (
          <button
            onClick={handleMapClick}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: '60px',
              boxShadow: '0 2px 6px rgba(0,43,77,0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001f35'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
          >
            <FaMap size={12} style={{ marginRight: '4px' }} />
            Map View
          </button>
        )}
      </div>

      {/* Description Link, Flag Icon, and Refresh Button */}
      <div style={{ 
        padding: '2px 20px 5px 20px',
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
                          fontSize: '22px',
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

      {/* Worth Seeing Rating Widget */}
      <div style={{
        textAlign: 'center',
        padding: '0px 20px 20px 20px',
        borderBottom: '1px solid #eee',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '5px'
        }}>
          Worth seeing?
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={async () => {
                if (!user) {
                  alert('Please log in to rate this quickcard');
                  return;
                }
                
                if (!quickcard?.id) {
                  alert('Unable to rate this quickcard');
                  return;
                }

                const newRating = userRating === star ? 0 : star;
                
                try {
                  if (newRating > 0) {
                    await RatingService.submitRating(quickcard.id, newRating);
                  } else {
                    // Remove rating when user clicks same star
                    await RatingService.removeRating(quickcard.id);
                  }
                  setUserRating(newRating);
                } catch (error) {
                  console.error('Error submitting rating:', error);
                  alert('Failed to submit rating. Please try again.');
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: star <= userRating ? '#ffd700' : '#ccc',
                padding: '4px',
                transition: 'color 0.2s ease'
              }}
            >
              <FaStar size={24} />
            </button>
          ))}
        </div>
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
              {(() => {
                const description = quickcard.description || 'No description available.';
                // Auto-detect URLs and make them clickable
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const parts = description.split(urlRegex);
                
                return parts.map((part: string, index: number) => {
                  if (urlRegex.test(part)) {
                    return (
                      <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#007aff',
                          textDecoration: 'underline',
                          wordBreak: 'break-all'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(part, '_blank');
                        }}
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                });
              })()}
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

      {/* MultiPhotoModal with AUTO-PLAY - 7 SECOND INTERVALS */}
      {showMultiPhotoModal && (
      <MultiPhotoModal
          photos={photoURLs}
        initialIndex={selectedPhotoIndex}
        isOpen={showMultiPhotoModal}
          onClose={() => {
            setShowMultiPhotoModal(false);
            // Stop audio when slideshow is closed
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
          }}
          title={quickcard?.title}
          autoPlay={true}
          autoPlayInterval={7000}
          audioDuration={quickcard?.audioDuration}
      />
      )}

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