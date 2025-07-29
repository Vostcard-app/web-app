import React, { useEffect, useState, useCallback, useRef } from 'react';

// Mobile debugging console - ADMIN ONLY
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow, FaFilter, FaMapPin, FaTimes, FaInfo } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useDriveMode } from '../context/DriveModeContext';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import './HomeView.css';
import LocationDebugger from '../components/LocationDebugger';
import DriveModePlayer from '../components/DriveModePlayer';
import InfoButton from '../assets/Info_button.png';
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import QuickcardPin from '../assets/quickcard_pin.png';
import { AVAILABLE_CATEGORIES, AVAILABLE_TYPES } from '../types/VostcardTypes';

// FIXED: Import pin images from assets folder for better Leaflet compatibility
const vostcardIcon = new L.Icon({
  iconUrl: VostcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

const offerIcon = new L.Icon({
  iconUrl: OfferPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

const guideIcon = new L.Icon({
  iconUrl: '/Guide_pin.png', // ✅ Use the working PNG from public directory  
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

// Blue dot icon for user location
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzQyODVGNCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiLz4KPC9zdmc+',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// MapUpdater component - DISABLED automatic updates
const MapUpdater = ({ targetLocation, singleVostcard, shouldUpdateMapView, stableShouldUpdateMapView }: { 
  targetLocation: [number, number] | null; 
  singleVostcard?: any;
  shouldUpdateMapView: boolean;
  stableShouldUpdateMapView: (value: boolean) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    // ONLY update if explicitly requested via shouldUpdateMapView flag
    if (targetLocation && map && shouldUpdateMapView) {
      console.log('🗺️ MapUpdater: EXPLICIT map update requested to:', targetLocation);
      
      // Preserve user's current zoom level instead of forcing specific zoom
      const currentZoom = map.getZoom();
      console.log('🗺️ MapUpdater: Preserving current zoom level:', currentZoom);
      
      map.setView(targetLocation, currentZoom);
      // Reset the flag after updating the map
      stableShouldUpdateMapView(false);
      console.log('🗺️ MapUpdater: Map updated, shouldUpdateMapView reset to false');
    } else if (shouldUpdateMapView) {
      console.log('🗺️ MapUpdater: Update requested but missing targetLocation or map');
    }
    // No logging for normal case to reduce console spam
  }, [targetLocation, map, singleVostcard, shouldUpdateMapView, stableShouldUpdateMapView]);

  return null;
};

// Zoom controls component
const ZoomControls = () => {
  const map = useMap();

  const handleZoomIn = () => {
    console.log('🔍 Zoom In clicked');
    map.zoomIn();
  };

  const handleZoomOut = () => {
    console.log('🔍 Zoom Out clicked'); 
    map.zoomOut();
  };

  return (
    <>
      {/* Zoom controls */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: 20,
        transform: 'translateY(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <button 
          onClick={handleZoomIn} // ✅ Fixed: Added proper zoom in handler
          style={{
            background: '#fff',
            color: '#002B4D',
            border: '1px solid #ddd',
            borderRadius: 8,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          <FaPlus />
        </button>
        <button 
          onClick={handleZoomOut} // ✅ Fixed: Added proper zoom out handler
          style={{
            background: '#fff',
            color: '#002B4D',
            border: '1px solid #ddd',
            borderRadius: 8,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          <FaMinus />
        </button>
      </div>
    </>
  );
};

const HomeView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    clearVostcard, 
    loadLocalVostcard, 
    savedVostcards, 
    loadAllLocalVostcardsImmediate,
    createQuickcard
  } = useVostcard();
  const { user, username, userID, userRole, loading, refreshUserRole } = useAuth();
  const { isDesktop } = useResponsive();
  const shouldUseContainer = isDesktop;

  // Redirect advertisers to advertiser portal
  useEffect(() => {
    console.log('🏪 HomeView useEffect: Checking advertiser redirect - loading:', loading, 'userRole:', userRole, 'user:', !!user);
    if (!loading && user && userRole === 'advertiser') {
      console.log('🏪 HomeView useEffect: REDIRECTING advertiser to advertiser portal');
      try {
        navigate('/advertiser-portal');
        console.log('🏪 HomeView useEffect: Navigate called successfully');
      } catch (error) {
        console.error('🏪 HomeView useEffect: Navigate failed:', error);
      }
    }
  }, [userRole, loading, navigate, user]);

  // Also add a direct effect to watch userRole changes
  useEffect(() => {
    console.log('🏪 HomeView: userRole changed to:', userRole);
    
    // Role change logging only
    // Debug alerts removed per user request
  }, [userRole]);

  // Mobile debugging console - ADMIN ONLY
  useEffect(() => {
    if (userRole === 'admin' && typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // Only load if not already loaded
      if (!(window as any).eruda) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        document.head.appendChild(script);
        script.onload = () => {
          if ((window as any).eruda) {
            (window as any).eruda.init();
            console.log('📱 Admin mobile debug console loaded');
          }
        };
      }
    }
  }, [userRole]);

  // State variables
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [loadingVostcards, setLoadingVostcards] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [actualUserLocation, setActualUserLocation] = useState<[number, number] | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showAuthLoading, setShowAuthLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [singleVostcard, setSingleVostcard] = useState<any>(null);
  const [browseLocation, setBrowseLocation] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [userFriends, setUserFriends] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [currentTutorialVideo, setCurrentTutorialVideo] = useState<string>('J-ix67eZ7J4'); // Default "What is Vōstcard"
  const [isCreatePressed, setIsCreatePressed] = useState(false);
  const [isQuickcardPressed, setIsQuickcardPressed] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [shouldUpdateMapView, setShouldUpdateMapView] = useState(false); // Flag to control when map should recenter
  const [showTooltip, setShowTooltip] = useState<{ show: boolean; title: string; x: number; y: number }>({ show: false, title: '', x: 0, y: 0 });
  const [hasInitialPosition, setHasInitialPosition] = useState(false); // Track if we've set initial position
  const [mapTargetLocation, setMapTargetLocation] = useState<[number, number] | null>(null); // Separate state for map positioning
  
  // Stable callback to prevent MapUpdater from re-running constantly
  const stableShouldUpdateMapView = useCallback((value: boolean) => {
    setShouldUpdateMapView(value);
  }, []);
  const [staticMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Static center - never changes
  const { isDriveModeEnabled } = useDriveMode();
  
  // Use ref to track browse location for geolocation closure
  const browseLocationRef = useRef<any>(null);
  // Use ref to track singleVostcard for geolocation closure
  const singleVostcardRef = useRef<any>(null);

  // Navigation state from previous view
  const navigationState = location.state as any;
  const browseLocationState = navigationState?.browseLocation;
  const singleVostcardState = navigationState?.singleVostcard;

  // Handle browse location from navigation
  useEffect(() => {
    if (browseLocationState) {
      console.log('🗺️ Browse location received:', browseLocationState);
      console.log('📍 Coordinates:', browseLocationState.coordinates);
      console.log('📍 Setting browse location and user location...');
      setBrowseLocation(browseLocationState);
      browseLocationRef.current = browseLocationState;
      setMapTargetLocation(browseLocationState.coordinates);
      setShouldUpdateMapView(true); // Allow map to center on browse location
      console.log('🗺️ Navigation: Setting map target for browse area (intentional override)');
      // Remove the immediate state clearing - let it persist for this render cycle
    }
  }, [browseLocationState]);

  // Separate effect to clear state after browse location is set (NOT GPS updates)
  useEffect(() => {
    if (browseLocation && mapTargetLocation && browseLocationState) {
      console.log('🗺️ Clearing navigation state after browse location set');
      // Clear the navigation state after the location has been set
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [browseLocation, browseLocationState, navigate, location.pathname]);

  // Update ref when browse location changes
  useEffect(() => {
    browseLocationRef.current = browseLocation;
  }, [browseLocation]);

  // Update ref when singleVostcard changes
  useEffect(() => {
    singleVostcardRef.current = singleVostcard;
  }, [singleVostcard]);

  // Handle target quickcard from navigation - center map but show all content
  useEffect(() => {
    if (singleVostcardState) {
      console.log('📍 Centering map on target quickcard:', singleVostcardState.title);
      setSingleVostcard(singleVostcardState);
      singleVostcardRef.current = singleVostcardState;
      if (singleVostcardState.latitude && singleVostcardState.longitude) {
        const vostcardLocation: [number, number] = [singleVostcardState.latitude, singleVostcardState.longitude];
        setMapTargetLocation(vostcardLocation);
        setActualUserLocation(vostcardLocation);
        setShouldUpdateMapView(true); // Allow map to center on single vostcard
        console.log('📍 Navigation: Setting map target for single vostcard (intentional override):', vostcardLocation);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [singleVostcardState, navigate, location.pathname]);

  // Debug authentication state and manage auth loading overlay
  useEffect(() => {
    console.log('🏠 HomeView: Auth state:', {
      user: !!user,
      username,
      userID,
      userRole,
      loading,
      authCurrentUser: !!auth.currentUser
    });
    
    // FIXED: More aggressive loading overlay management
    if (loading) {
      console.log('🏠 HomeView: Auth loading detected, will hide overlay after 3 seconds');
      const loadingTimeout = setTimeout(() => {
        console.log('⏰ HomeView: Hiding auth loading overlay to prevent UI blocking');
        setShowAuthLoading(false);
      }, 3000);
      
      return () => clearTimeout(loadingTimeout);
    } else {
      // Immediately hide loading overlay when auth is complete
      console.log('✅ HomeView: Auth complete, hiding loading overlay');
      setShowAuthLoading(false);
    }
  }, [user, username, userID, userRole, loading]);

  // Load vostcards function
  const loadVostcards = useCallback(async (forceRefresh: boolean = false) => {
    // Remove the early return - we want to load all vostcards even when singleVostcard is set
    // This allows the private map to show all posts nearby while centering on the specific quickcard
    
    if (loadingVostcards && !forceRefresh) {
      return;
    }
    
    try {
      setLoadingVostcards(true);
      setMapError(null);
      
      if (forceRefresh) {
        console.log('🔄 Force refreshing vostcards after posting');
      } else {
        console.log('🔄 Loading posted vostcards and quickcards');
      }
      
      const q1 = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
      const snapshot1 = await getDocs(q1);
      const postedVostcards = snapshot1.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      const allContent = postedVostcards.filter(v => 
        !v.isQuickcard || 
        (v.isQuickcard && v.state === 'posted')
      );
      
      console.log('📋 Loaded vostcards and quickcards:', allContent.length, {
        regular: allContent.filter(v => !v.isQuickcard).length,
        quickcards: allContent.filter(v => v.isQuickcard).length
      });

      // 🔍 DEBUG: Log userRole values for all quickcards
      allContent.filter(v => v.isQuickcard).forEach(qc => {
        console.log('🔍 DEBUG: Loaded quickcard:', {
          id: qc.id,
          title: qc.title,
          userRole: qc.userRole,
          username: qc.username,
          isQuickcard: qc.isQuickcard,
          isOffer: qc.isOffer || false
        });
      });
      
      setVostcards(allContent);
      setHasInitialLoad(true);
    } catch (error) {
      console.error('❌ Error loading vostcards:', error);
      setMapError('Failed to load content. Please check your connection and try again.');
    } finally {
      setLoadingVostcards(false);
    }
  }, [singleVostcard, loadingVostcards]);

  // Load user avatar
  useEffect(() => {
    const loadUserAvatar = async () => {
      if (user?.uid) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.avatarURL) {
              setUserAvatar(userData.avatarURL);
            }
          }
        } catch (error) {
          console.error('Failed to load user avatar:', error);
        }
      }
    };

    if (user?.uid && !userAvatar) {
      loadUserAvatar();
    }
  }, [user?.uid, userAvatar]);

  // Initial load
  useEffect(() => {
    if (!loading && !hasInitialLoad) {
      loadVostcards();
    }
  }, [loading, hasInitialLoad, loadVostcards]);

  // Handle fresh load after posting
  useEffect(() => {
    const navigationState = location.state as any;
    if (navigationState?.freshLoad || navigationState?.justPosted) {
      console.log('🔄 Fresh load requested after posting:', navigationState.justPosted);
      
      // Force refresh the vostcards to show newly posted content
      loadVostcards(true);
      
      // Clear the navigation state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, loadVostcards]);

  // Retry mechanism
  useEffect(() => {
    if (retryCount > 0) {
      loadVostcards(true);
    }
  }, [retryCount, loadVostcards]);

  // Location handling - IMPROVED FOR LAPTOPS
  useEffect(() => {
    let watchId: number | null = null;

    const handleLocationSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log('✅ Location updated:', { 
        latitude: latitude.toFixed(6), 
        longitude: longitude.toFixed(6), 
        accuracy: `${accuracy}m`,
        source: accuracy < 50 ? 'GPS' : 'Network/WiFi'
      });
      
      // GPS update logging only (alerts removed per user request)
      
      // Always update actualUserLocation for the recenter button
      setActualUserLocation([latitude, longitude]);
      
      // Only set initial position ONCE, never update map automatically again
      if (!hasInitialPosition) {
        console.log('📍 MOBILE DEBUG: Setting initial position ONCE on first load');
        console.log('📍 MOBILE DEBUG: Device type:', /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
        setUserLocation([latitude, longitude]);
        setHasInitialPosition(true); // Mark that we've set initial position
      } else {
        console.log('🔒 MOBILE DEBUG: GPS update received - actualUserLocation updated, map position unchanged');
        console.log('🔒 MOBILE DEBUG: hasInitialPosition:', hasInitialPosition, 'shouldUpdateMapView:', shouldUpdateMapView);
      }
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.error('❌ Location error:', {
        code: error.code,
        message: error.message,
        type: error.code === 1 ? 'Permission Denied' : 
               error.code === 2 ? 'Position Unavailable' : 
               error.code === 3 ? 'Timeout' : 'Unknown'
      });
      
      // Show user-friendly error in console
      const errorMsg = error.code === 1 ? 
        'Location permission denied. Click the location icon in your address bar to allow.' :
        error.code === 2 ?
        'Location unavailable. Check your device location settings.' :
        'Location timeout. Using default location.';
        
      console.warn('📍 Location help:', errorMsg);
      
      const defaultLocation: [number, number] = [40.7128, -74.0060];
      
      // Only set default location on very first load, never again
      if (!hasInitialPosition) {
        console.log('📍 Setting default location ONCE on first load due to error');
        setUserLocation(defaultLocation);
        setMapTargetLocation(defaultLocation);
        setShouldUpdateMapView(true); // Allow map to center on initial load
        setHasInitialPosition(true); // Mark that we've set initial position
      }
      setActualUserLocation(defaultLocation);
    };

    const startLocationWatch = () => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        return;
      }

      console.log('📍 Starting location watch...');
      watchId = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    };

    // Start location watching if we have user permission
    if (navigator.geolocation) {
      startLocationWatch();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []); // Empty dependency - location watch should only start once and never restart

  // Close help menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHelpMenu) {
        setShowHelpMenu(false);
      }
    };

    if (showHelpMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelpMenu]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getVostcardIcon = (isOffer: boolean, userRole?: string, isQuickcard?: boolean) => {
    if (isOffer) return offerIcon;
    // For quickcards, check user role first to determine correct pin
    if (isQuickcard) {
      // If the quickcard is posted by a guide or admin, use Guide_pin
      if (userRole === 'guide' || userRole === 'admin') return guideIcon;
      // Otherwise, use regular Vostcard_pin for user quickcards
      return vostcardIcon;
    }
    if (userRole === 'guide') return guideIcon;
    return vostcardIcon;
  };

  const handleListViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('📋 Navigating to All Posted Vostcards View');
    navigate('/all-posted-vostcards');
  };

  const handleOffersClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🎁 Navigating to Offers List');
    navigate('/offers-list');
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    clearVostcard();
    navigate('/create-step1');
  };

  const handleCreateQuickcard = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log(' Starting Quickcard creation - opening native camera');
    clearVostcard();
    
    // Open native camera app directly
    const cameraInput = document.getElementById('quickcard-native-camera') as HTMLInputElement;
    if (cameraInput) {
      cameraInput.click();
    }
  };

  const handleCreateTouchStart = () => setIsCreatePressed(true);
  const handleCreateTouchEnd = () => setIsCreatePressed(false);
  const handleQuickcardTouchStart = () => setIsQuickcardPressed(true);
  const handleQuickcardTouchEnd = () => setIsQuickcardPressed(false);

  const handleNativeCameraPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && userLocation) {
      console.log('📸 Photo captured from native camera:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Create quickcard with the captured photo
      createQuickcard(file, {
        latitude: userLocation[0],
        longitude: userLocation[1]
      });
      
      // Navigate to photo thumbnails step
      navigate('/quickcard-step2');
    } else if (!userLocation) {
      alert('Location not available. Please enable location services.');
    }
    
    // Clear the input so same photo can be selected again
    event.target.value = '';
  };

  const handleRetryLoad = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleRecenter = () => {
    if (actualUserLocation) {
      console.log('🎯 Manual recenter requested to user location:', actualUserLocation);
      setMapTargetLocation(actualUserLocation);
      setShouldUpdateMapView(true); // Allow map to center on manual recenter
      console.log('🎯 Map will recenter to current GPS location');
    }
  };

  const filterVostcards = (vostcards: any[]) => {
    let filtered = vostcards;
    
    if (selectedCategories.length > 0 && !selectedCategories.includes('None')) {
      filtered = filtered.filter(v => {
        if (v.isOffer) return true;
        if (!v.categories || !Array.isArray(v.categories)) return false;
        return v.categories.some((cat: string) => selectedCategories.includes(cat));
      });
    }
    
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(v => {
        if (v.isOffer) return true;
        if (selectedTypes.includes('Vostcard') && !v.isQuickcard && !v.isOffer && v.userRole !== 'guide') return true;
        if (selectedTypes.includes('Quickcard') && v.isQuickcard) return true;
        if (selectedTypes.includes('Guide') && v.userRole === 'guide' && !v.isOffer) return true;
        return false;
      });
    }
    
    if (showFriendsOnly) {
      filtered = filtered.filter(v => {
        if (v.isOffer) return true;
        return userFriends.includes(v.userID || v.userId);
      });
    }
    
    return filtered;
  };

  // FIXED: Always show all pins, but center on singleVostcard if present
  const filteredVostcards = filterVostcards(vostcards);

  // Menu style
  const menuStyle = {
    position: 'absolute' as const,
    top: '65px',
    right: '16px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 2000,
    minWidth: '180px',
    maxWidth: '200px',
    maxHeight: '70vh',
    overflow: 'auto'
  };

  const menuItemStyle = {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    textAlign: 'left' as const,
    color: '#333',
    transition: 'background-color 0.2s ease'
  };

  // Tutorial video handlers
  const handleTutorialVideo = (videoId: string, title: string) => {
    setCurrentTutorialVideo(videoId);
    setShowVideoModal(true);
  };

  // YouTube video URL using current tutorial video
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${currentTutorialVideo}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  console.log('🏠 HomeView: Rendering with user:', { user: !!user, userRole, loading, shouldUseContainer });
  
  // Add immediate advertiser check in render
  if (!loading && user && userRole === 'advertiser') {
    console.log('🏪 IMMEDIATE CHECK: Advertiser detected in render, should redirect!');
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: shouldUseContainer ? '#f0f0f0' : 'white',
      display: shouldUseContainer ? 'flex' : 'block',
      justifyContent: shouldUseContainer ? 'center' : 'initial',
      alignItems: shouldUseContainer ? 'flex-start' : 'initial',
      padding: shouldUseContainer ? '20px' : '0'
    }}>
      <div style={{
        width: shouldUseContainer ? '390px' : '100%',
        maxWidth: shouldUseContainer ? '390px' : '100%',
        height: shouldUseContainer ? '844px' : '100vh',
        backgroundColor: 'white',
        boxShadow: shouldUseContainer ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: shouldUseContainer ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div 
          style={{
            backgroundColor: '#002B4D',
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            position: 'relative',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            touchAction: 'manipulation',
            flexShrink: 0,
            borderRadius: shouldUseContainer ? '16px' : '0',
            // Add safe area padding for mobile
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 16px)',
            paddingRight: 'env(safe-area-inset-right, 16px)'
          }}
          data-testid="home-header"
        >
          <div 
            onClick={() => navigate('/home')}
            style={{ 
              color: 'white', 
              fontSize: 28, 
              fontWeight: 'bold',
              cursor: 'pointer',
              userSelect: 'none',
              paddingLeft: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Vōstcard
            {userRole === 'admin' && (
              <span style={{
                backgroundColor: '#ff4444',
                color: 'white',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                ADMIN
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              onClick={() => {
                if (user?.uid) {
                  navigate(`/user-profile/${user.uid}`);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="User Avatar"
                  style={{
                    width: 55,
                    height: 55,
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                  onError={() => setUserAvatar(null)}
                />
              ) : (
                <FaUserCircle size={55} color="white" />
              )}
            </div>
            <FaBars
              size={48}
              color="white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ cursor: 'pointer', paddingRight: '10px' }}
            />
          </div>
        </div>

        {/* Main Menu */}
        {isMenuOpen && (
          <div style={menuStyle}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', fontWeight: 'bold', color: '#002B4D' }}>
              Menu
            </div>
            
            {/* 1. Personal Posts */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/my-vostcards');
              }}
              style={menuItemStyle}
            >
              📱 Personal Posts
            </button>
            
            {/* 2. Public Posts */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/my-posted-vostcards');
              }}
              style={menuItemStyle}
            >
              🌍 Public Posts
            </button>
            
            {/* 3. Browse Area */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/browse-area');
              }}
              style={menuItemStyle}
            >
              🗺️ Browse Area
            </button>
            
            {/* 4. Drive Mode */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/drive-mode-settings');
              }}
              style={menuItemStyle}
            >
              🚗 Drive Mode
            </button>
            
            {/* 5. Vōstbox */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/vostbox');
              }}
              style={menuItemStyle}
            >
              📬 Vōstbox
            </button>
            
            {/* 6. Friend List */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/friends');
              }}
              style={menuItemStyle}
            >
              👥 Friend List
            </button>
            
            {/* 7. Liked */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/liked-vostcards');
              }}
              style={menuItemStyle}
            >
              ❤️ Liked
            </button>
            
            {/* 8. Following */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/following');
              }}
              style={menuItemStyle}
            >
              👥 Following
            </button>

            {/* 9. Vostcard Studio */}
            {userRole === 'guide' && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/studio');
                }}
                style={menuItemStyle}
              >
                🎬 Vostcard Studio
              </button>
            )}

            {/* 9.5. Admin Panel */}
            {userRole === 'admin' && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/admin');
                }}
                style={menuItemStyle}
              >
                🔧 Admin Panel
              </button>
            )}

            {/* Admin Dashboard (admin only, just above Settings) */}
            {userRole === 'admin' && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/dashboard');
                }}
                style={menuItemStyle}
              >
                📊 Admin Dashboard
              </button>
            )}
            
            {/* 10. Settings */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/settings');
              }}
              style={menuItemStyle}
            >
              ⚙️ Settings
            </button>
            
            {/* 11. Suggestion Box */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/suggestion-box');
              }}
              style={menuItemStyle}
            >
              💡 Suggestion Box
            </button>
            
            {/* 12. Report a bug */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/report-bug');
              }}
              style={menuItemStyle}
            >
              🐛 Report a Bug
            </button>
            
            {/* 13. Logout */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              style={menuItemStyle}
            >
               Logout
            </button>
          </div>
        )}

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Error Display */}
          {mapError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              textAlign: 'center',
              zIndex: 1001,
              maxWidth: '300px'
            }}>
              <p style={{ margin: '0 0 15px 0', color: '#666' }}>{mapError}</p>
              <button
                onClick={handleRetryLoad}
                style={{
                  backgroundColor: '#002B4D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Map */}
          <MapContainer
            center={staticMapCenter}
            zoom={16}
              style={{ 
                height: '100%', 
                width: '100%',
                // Prevent context menus and image selection on mobile
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={22}
              />

              {/* User location marker */}
              {actualUserLocation && (
                <Marker
                  position={actualUserLocation}
                  icon={userIcon}
                  eventHandlers={{
                    contextmenu: (e) => {
                      // Prevent the browser's context menu from appearing on long press
                      e.originalEvent?.preventDefault?.();
                      console.log('📍 Prevented context menu on user location marker');
                    },
                    mousedown: (e) => {
                      const timeout = setTimeout(() => {
                        const rect = e.target._map.getContainer().getBoundingClientRect();
                        setShowTooltip({
                          show: true,
                          title: 'Your Location',
                          x: e.containerPoint.x + rect.left,
                          y: e.containerPoint.y + rect.top - 50
                        });
                      }, 500);
                      
                      const cleanup = () => {
                        clearTimeout(timeout);
                        setShowTooltip({ show: false, title: '', x: 0, y: 0 });
                      };
                      
                      const handleMouseUp = () => {
                        cleanup();
                        document.removeEventListener('mouseup', handleMouseUp);
                        document.removeEventListener('touchend', handleMouseUp);
                      };
                      
                      document.addEventListener('mouseup', handleMouseUp);
                      document.addEventListener('touchend', handleMouseUp);
                    }
                  }}
                >
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <strong>Your Location</strong>
                      <br />
                      <small>Tap to recenter map</small>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Vostcard markers */}
              {filteredVostcards.map((vostcard) => {
                if (!vostcard.latitude || !vostcard.longitude) return null;
                
                const position: [number, number] = [vostcard.latitude, vostcard.longitude];
                
                // 🔍 DEBUG: Log icon selection for quickcards
                if (vostcard.isQuickcard) {
                  console.log('🔍 DEBUG: Rendering quickcard marker:', {
                    title: vostcard.title,
                    userRole: vostcard.userRole,
                    isOffer: vostcard.isOffer,
                    isQuickcard: vostcard.isQuickcard
                  });
                }
                
                const icon = getVostcardIcon(vostcard.isOffer, vostcard.userRole, vostcard.isQuickcard);
                
                // 🔍 DEBUG: Log which icon was selected
                if (vostcard.isQuickcard) {
                  const iconName = icon === guideIcon ? 'GuideIcon' : 
                                   icon === vostcardIcon ? 'VostcardIcon' : 
                                   icon === offerIcon ? 'OfferIcon' : 'Unknown';
                  console.log('🔍 DEBUG: Selected icon for quickcard:', iconName, 'for userRole:', vostcard.userRole);
                }
                
                return (
                  <Marker
                    key={vostcard.id}
                    position={position}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        console.log('📍 Vostcard pin clicked:', vostcard.title);
                        // Direct navigation - no tooltip interference
                        if (vostcard.isOffer) {
                          navigate(`/offer/${vostcard.id}`);
                        } else {
                          navigate(`/vostcard/${vostcard.id}`);
                        }
                      },
                      contextmenu: (e) => {
                        // Prevent the browser's context menu from appearing on long press
                        e.originalEvent?.preventDefault?.();
                        console.log('📍 Prevented context menu on pin:', vostcard.title);
                      },
                      mousedown: (e) => {
                        const timeout = setTimeout(() => {
                          const rect = e.target._map.getContainer().getBoundingClientRect();
                          setShowTooltip({
                            show: true,
                            title: vostcard.title || (vostcard.isOffer ? 'Untitled Offer' : vostcard.isQuickcard ? 'Untitled Quickcard' : 'Untitled Vostcard'),
                            x: e.containerPoint.x + rect.left,
                            y: e.containerPoint.y + rect.top - 50
                          });
                        }, 500);
                        
                        const cleanup = () => {
                          clearTimeout(timeout);
                          setShowTooltip({ show: false, title: '', x: 0, y: 0 });
                        };
                        
                        const handleMouseUp = () => {
                          cleanup();
                          document.removeEventListener('mouseup', handleMouseUp);
                          document.removeEventListener('touchend', handleMouseUp);
                        };
                        
                        document.addEventListener('mouseup', handleMouseUp);
                        document.addEventListener('touchend', handleMouseUp);
                      }
                    }}
                  >
                    <Popup>
                      <div style={{ textAlign: 'center', minWidth: '200px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                          {vostcard.title || (
                            vostcard.isOffer ? 'Untitled Offer' :
                            vostcard.isQuickcard ? 'Untitled Quickcard' : 
                            'Untitled Vostcard'
                          )}
                        </h3>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                          {vostcard.description || 'No description'}
                        </p>
                        
                        {/* Show quickcard indicator */}
                        {vostcard.isQuickcard && (
                          <div style={{
                            backgroundColor: '#e8f4ff',
                            border: '1px solid #b3d9ff',
                            borderRadius: '6px',
                            padding: '8px',
                            marginBottom: '12px'
                          }}>
                            <strong style={{ color: '#0066cc' }}>📱 Quickcard</strong>
                            <br />
                            <span style={{ fontSize: '12px' }}>Quick photo with location</span>
                          </div>
                        )}
                        
                        {/* Existing offer details */}
                        {vostcard.isOffer && vostcard.offerDetails?.discount && (
                          <div style={{
                            backgroundColor: '#e8f4ff',
                            border: '1px solid #b3d9ff',
                            borderRadius: '6px',
                            padding: '8px',
                            marginBottom: '12px'
                          }}>
                            <strong style={{ color: '#0066cc' }}>🎁 Special Offer:</strong>
                            <br />
                            <span style={{ fontSize: '14px' }}>{vostcard.offerDetails.discount}</span>
                            {vostcard.offerDetails.validUntil && (
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                Valid until: {vostcard.offerDetails.validUntil}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Categories */}
                        {vostcard.categories && Array.isArray(vostcard.categories) && vostcard.categories.length > 0 && (
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
                            <strong>Categories:</strong> {vostcard.categories.join(', ')}
                          </p>
                        )}
                        
                        <button
                          onClick={() => {
                            // ✅ UNIFIED EXPERIENCE: Use VostcardDetailView for both quickcards and regular vostcards
                            if (vostcard.isOffer) {
                              navigate(`/offer/${vostcard.id}`);
                            } else {
                              // Both quickcards and regular vostcards use the same detail view
                              navigate(`/vostcard/${vostcard.id}`);
                            }
                          }}
                          style={{
                            backgroundColor: '#002B4D',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Map Controls */}
              <MapUpdater 
                targetLocation={mapTargetLocation} 
                singleVostcard={singleVostcard}
                shouldUpdateMapView={shouldUpdateMapView}
                stableShouldUpdateMapView={stableShouldUpdateMapView}
              />
              <ZoomControls />
            </MapContainer>

          {/* Floating Controls Over Map */}
          
          {/* Top buttons - evenly distributed */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '10px',
              right: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-evenly',
              zIndex: 1002,
              padding: '0 5px'
            }}
          >
            <button 
              type="button"
              style={{ 
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0px 15px',
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
                gap: '8px',
                margin: '0 5px'
              }} 
              onClick={handleListViewClick}
            >
              <span style={{ fontSize: '20px', lineHeight: '1' }}>⋮</span>
              List View
            </button>
            
            <button 
              type="button"
              style={{ 
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0px 15px',
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
                gap: '8px',
                margin: '0 5px'
              }} 
              onClick={handleOffersClick}
            >
              <span style={{ fontSize: '20px', lineHeight: '1' }}>⋮</span>
              Offers
            </button>
            
            <button 
              type="button"
              style={{ 
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0px 15px',
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
                gap: '8px',
                margin: '0 5px'
              }} 
              onClick={() => setShowHelpMenu(!showHelpMenu)}
            >
              <span style={{ fontSize: '20px', lineHeight: '1' }}>❓</span>
              Help
            </button>
          </div>

          {/* Help Menu Dropdown */}
          {showHelpMenu && (
            <div style={{
              position: 'absolute',
              top: '55px',
              right: '15px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 2001,
              minWidth: '180px',
              maxWidth: '200px'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', fontWeight: 'bold', color: '#002B4D' }}>
                Help Resources
              </div>
              
              <button
                onClick={() => {
                  setShowHelpMenu(false);
                  handleTutorialVideo('VTfeDwSUy-o', 'Home Page');
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  textAlign: 'left',
                  color: '#333',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                🏠 Home Page
              </button>
              

            </div>
          )}

          {/* Recenter control */}
          <div style={{
            position: 'absolute',
            top: '33%',
            right: 20,
            transform: 'translateY(-50%)',
            zIndex: 1000
          }}>
            <button 
              onClick={handleRecenter} 
              style={{
                background: '#fff',
                color: '#002B4D',
                border: '1px solid #ddd',
                borderRadius: 8,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              <FaLocationArrow />
            </button>
          </div>

          {/* Filter button */}
          <div style={{
            position: 'absolute',
            top: '66.7%', // 2/3 down the screen
            right: 20, // Right side
            zIndex: 1002
          }}>
            <button
              onClick={() => setShowFilterModal(!showFilterModal)}
              style={{
                background: (
                  (selectedCategories.length > 0 && !selectedCategories.includes('None')) || 
                  selectedTypes.length > 0 ||
                  showFriendsOnly
                ) ? '#002B4D' : '#fff',
                color: (
                  (selectedCategories.length > 0 && !selectedCategories.includes('None')) || 
                  selectedTypes.length > 0 ||
                  showFriendsOnly
                ) ? 'white' : '#002B4D',
                border: '1px solid #ddd',
                borderRadius: 8,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              <FaFilter />
            </button>
          </div>
        </div>

        {/* Custom Tooltip Overlay */}
        {showTooltip.show && (
          <div
            style={{
              position: 'fixed',
              left: showTooltip.x,
              top: showTooltip.y,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center',
              maxWidth: '150px',
              wordWrap: 'break-word',
              zIndex: 10000,
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            {showTooltip.title}
          </div>
        )}

        {/* Drive Mode Player */}
        {userLocation && (
          <DriveModePlayer
            userLocation={{ latitude: userLocation[0], longitude: userLocation[1] }}
            userSpeed={currentSpeed}
            isEnabled={isDriveModeEnabled}
          />
        )}
      </div>

      {/* Bottom Navigation - 2 buttons */}
      <div style={{
        position: 'fixed',
        bottom: shouldUseContainer ? 40 : `calc(20px + env(safe-area-inset-bottom, 0px))`,
        left: shouldUseContainer ? '50%' : 15,
        right: shouldUseContainer ? 'auto' : 15,
        transform: shouldUseContainer ? 'translateX(-50%)' : 'none',
        width: shouldUseContainer ? '360px' : 'auto',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'space-between',
        gap: '4%',
        padding: shouldUseContainer ? '0 15px' : '0',
        // Add safe area padding for mobile
        paddingBottom: shouldUseContainer ? 0 : 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Create Vostcard Button */}
        <button
          onTouchStart={handleCreateTouchStart}
          onTouchEnd={handleCreateTouchEnd}
          onClick={handleCreateClick}
          style={{
            background: '#002B4D',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '0px 20px',
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,43,77,0.2)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            width: '48%',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isCreatePressed ? 'scale(0.95)' : 'scale(1)',
            textAlign: 'center',
            lineHeight: '1.2'
          }}
        >
          Create Vostcard
        </button>

        {/* Create Quickcard Button */}
        <button
          onTouchStart={handleQuickcardTouchStart}
          onTouchEnd={handleQuickcardTouchEnd}
          onClick={handleCreateQuickcard}
          style={{
            background: '#002B4D',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '0px 20px',
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,43,77,0.2)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            width: '48%',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isQuickcardPressed ? 'scale(0.95)' : 'scale(1)',
            textAlign: 'center',
            lineHeight: '1.2'
          }}
        >
          Create Quickcard
        </button>
      </div>

      {/* Hidden camera input for quickcard creation */}
      <input
        id="quickcard-native-camera"
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleNativeCameraPhoto}
      />

      {/* Filter Modal */}
      {showFilterModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
            onClick={() => setShowFilterModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 2001
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
              Filter Content
            </h3>
            
            {/* Categories */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                Categories
              </label>
              {AVAILABLE_CATEGORIES.map(category => (
                <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id={`category-${category}`}
                    checked={selectedCategories.includes(category)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories(prev => [...prev, category]);
                      } else {
                        setSelectedCategories(prev => prev.filter(c => c !== category));
                      }
                    }}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor={`category-${category}`} style={{ fontSize: '14px', color: '#333' }}>
                    {category}
                  </label>
                </div>
              ))}
            </div>

            {/* Types */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                Types
              </label>
              {AVAILABLE_TYPES.map(type => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id={`type-${type}`}
                    checked={selectedTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTypes(prev => [...prev, type]);
                      } else {
                        setSelectedTypes(prev => prev.filter(t => t !== type));
                      }
                    }}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor={`type-${type}`} style={{ fontSize: '14px', color: '#333' }}>
                    {type}
                  </label>
                </div>
              ))}
            </div>

            {/* Friends Only */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <input
                type="checkbox"
                id="friends-only"
                checked={showFriendsOnly}
                onChange={(e) => setShowFriendsOnly(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="friends-only" style={{ fontSize: '14px', color: '#333' }}>
                Show only friends' posts
              </label>
            </div>

            <button
              onClick={() => setShowFilterModal(false)}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center'
              }}
            >
              Apply Filters
            </button>
          </div>
        </>
      )}

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
              zIndex: 10000,
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
                src={youtubeEmbedUrl}
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

      {/* Auth Loading Overlay */}
      {showAuthLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 'bold' }}>Loading...</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>Please wait while we authenticate your session.</p>
            <div style={{ marginTop: '15px' }}>
              <img src={InfoButton} alt="Info" style={{ width: '40px', height: '40px', marginBottom: '10px' }} />
              <p style={{ fontSize: '12px', color: '#999' }}>Vōstcard</p>
            </div>
          </div>
        </div>
      )}

      {/* Location Debugger */}
      {userLocation && (
        <LocationDebugger />
      )}
    </div>
  );
};

export default HomeView; 