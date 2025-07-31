import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow, FaFilter, FaTimes, FaWalking } from 'react-icons/fa';
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
import OnboardingTour from '../components/OnboardingTour';
import { OnboardingService } from '../services/onboardingService';
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

// Standard user location icon (like Apple/Google Maps)
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtb3BhY2l0eT0iMC4zIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjYiIGZpbGw9IiM0Mjg1RjQiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjIuNSIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4=',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Create directional user icon with flashlight effect
const createDirectionalUserIcon = (heading: number) => {
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Flashlight beam cone -->
      <path d="M20 20 L35 5 L35 35 Z" fill="rgba(66, 133, 244, 0.3)" stroke="rgba(66, 133, 244, 0.5)" stroke-width="1" transform="rotate(${heading} 20 20)"/>
      <!-- User location dot -->
      <circle cx="20" cy="20" r="8" fill="#4285F4" stroke="#ffffff" stroke-width="3"/>
      <!-- Direction arrow -->
      <path d="M20 12 L20 8 L24 12 L20 16 L16 12 Z" fill="#ffffff" transform="rotate(${heading} 20 20)"/>
    </svg>
  `;
  
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// MapUpdater component - DISABLED automatic updates
const MapUpdater = ({ targetLocation, singleVostcard, shouldUpdateMapView, stableShouldUpdateMapView, hasRecenteredOnce }: {
  targetLocation: [number, number] | null;
  singleVostcard?: any;
  shouldUpdateMapView: boolean;
  stableShouldUpdateMapView: (value: boolean) => void;
  hasRecenteredOnce: React.MutableRefObject<boolean>;
}) => {
  const map = useMap();

  useEffect(() => {
    // ONLY update if explicitly requested via shouldUpdateMapView flag
    if (targetLocation && map && shouldUpdateMapView && !hasRecenteredOnce.current) {
      console.log('🗺️ MapUpdater: EXPLICIT map update requested to:', targetLocation);

      // Preserve user's current zoom level instead of forcing specific zoom
      const currentZoom = map.getZoom();
      console.log('🗺️ MapUpdater: Preserving current zoom level:', currentZoom);

      map.setView(targetLocation, currentZoom);
      hasRecenteredOnce.current = true;
      // Reset the flag after updating the map
      stableShouldUpdateMapView(false);
      console.log('🗺️ MapUpdater: Map updated, shouldUpdateMapView reset to false');
    } else if (shouldUpdateMapView) {
      console.log('🗺️ MapUpdater: Update requested but missing targetLocation or map or already recentered once');
    }
    // No logging for normal case to reduce console spam
  }, [targetLocation, map, singleVostcard, shouldUpdateMapView, stableShouldUpdateMapView, hasRecenteredOnce]);

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
  const [activePin, setActivePin] = useState<{
    type: 'vostcard' | 'guide' | 'offer';
    id: string;
    title: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [loadingVostcards, setLoadingVostcards] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [actualUserLocation, setActualUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
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
  const [tourData, setTourData] = useState<{tour: any, tourPosts: any[]} | null>(null);
  const [shouldUpdateMapView, setShouldUpdateMapView] = useState(false); // Flag to control when map should recenter
  const [showTooltip, setShowTooltip] = useState<{ show: boolean; title: string; x: number; y: number }>({ show: false, title: '', x: 0, y: 0 });
  const [hasInitialPosition, setHasInitialPosition] = useState(false); // Track if we've set initial position
  const [mapTargetLocation, setMapTargetLocation] = useState<[number, number] | null>(null); // Separate state for map positioning  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  // Debug showOnboarding state changes
  useEffect(() => {
    console.log('🎯 showOnboarding state changed to:', showOnboarding);
  }, [showOnboarding]);


  
  // Stable callback to prevent MapUpdater from re-running constantly
  const stableShouldUpdateMapView = useCallback((value: boolean) => {
    setShouldUpdateMapView(value);
  }, []);
  // Track if we've recentered map once after initial load or manual recenter
  const hasRecenteredOnce = useRef(false);
  const [staticMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Static center - never changes
  const { isDriveModeEnabled } = useDriveMode();

  // Add mapRef for direct access to the Leaflet map instance
  const mapRef = useRef<L.Map>(null);

  // Handle guide pin clicks
  const handleGuidePinClick = (vostcard: any) => {
    setActivePin({
      type: 'guide',
      id: vostcard.id,
      title: vostcard.title || vostcard.username || 'Guide Post',
      lat: vostcard.latitude,
      lng: vostcard.longitude
    });
  };

  // Handle offer pin clicks
  const handleOfferPinClick = (vostcard: any) => {
    setActivePin({
      type: 'offer',
      id: vostcard.id,
      title: vostcard.title || 'Special Offer',
      lat: vostcard.latitude,
      lng: vostcard.longitude
    });
  };
  // Use ref to track browse location for geolocation closure
  const browseLocationRef = useRef<any>(null);
  // Use ref to track singleVostcard for geolocation closure
  const singleVostcardRef = useRef<any>(null);

  // Navigation state from previous view
  const navigationState = location.state as any;
  const browseLocationState = navigationState?.browseLocation;
  const singleVostcardState = navigationState?.singleVostcard;
  const tourDataState = navigationState?.tourData;

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

  // Handle tour data from navigation
  useEffect(() => {
    if (tourDataState) {
      console.log('🎬 Tour data received:', tourDataState);
      console.log('🎬 Tour:', tourDataState.tour);
      console.log('🎬 Tour posts count:', tourDataState.tourPosts?.length);
      setTourData(tourDataState);
      
      // Convert tour posts to vostcard format for display
      if (tourDataState.tour && tourDataState.tourPosts) {
        console.log('🎬 Converting tour posts to vostcard format');
        const tourPostsAsVostcards = tourDataState.tourPosts.map((post: any) => ({
          id: post.id,
          title: post.title || 'Tour Post',
          description: post.description || '',
          latitude: post.latitude,
          longitude: post.longitude,
          isOffer: post.isOffer || false,
          isQuickcard: post.isQuickcard || false,
          userRole: post.userRole,
          username: post.username,
          state: 'posted',
          photoURLs: post.photoURLs || [],
          videoURL: post.videoURL,
          createdAt: post.createdAt
        }));
        
        console.log('🎬 Setting tour posts as vostcards:', tourPostsAsVostcards);
        console.log('🎬 Tour posts with locations:', tourPostsAsVostcards.filter((p: any) => p.latitude && p.longitude));
        setVostcards(tourPostsAsVostcards);
        
        // Clear navigation state to prevent re-loading
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [tourDataState, navigate, location.pathname]);

  // Auto-fit map bounds when tour is loaded to show both tour posts and user location
  useEffect(() => {
    if (tourData && mapRef?.current && actualUserLocation && vostcards.length > 0) {
      console.log('🎬 Auto-fitting map bounds for loaded tour');
      
      // Get all valid tour post positions
      const tourPositions = vostcards
        .filter(v => v.latitude && v.longitude)
        .map(v => [v.latitude, v.longitude] as [number, number]);
      
      if (tourPositions.length > 0) {
        // Include user location in bounds calculation
        const allPositions = [...tourPositions, actualUserLocation];
        
        try {
          const bounds = L.latLngBounds(allPositions);
          console.log('🎬 Fitting map to bounds that include tour posts and user location');
          mapRef.current.fitBounds(bounds, { 
            padding: [50, 50], // Extra padding to ensure everything is visible
            maxZoom: 15 // Don't zoom in too close
          });
        } catch (error) {
          console.warn('🎬 Error fitting map bounds:', error);
        }
      }
    }
  }, [tourData, mapRef, actualUserLocation, vostcards]);

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

  // Check if user has seen onboarding tour
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Only check if user is logged in and auth is complete
      if (!loading && user && userID && !checkingOnboarding) {
        setCheckingOnboarding(true);
        try {
          const hasSeenOnboarding = await OnboardingService.hasUserSeenOnboarding();
          
          if (!hasSeenOnboarding) {
            console.log('✨ First-time user detected - showing onboarding tour');
            // Small delay to ensure the home view is fully loaded
            setTimeout(() => {
              setShowOnboarding(true);
            }, 1000);
          }
        } catch (error) {
          console.error('❌ Error checking onboarding status:', error);
        } finally {
          setCheckingOnboarding(false);
        }
      }
    };

    checkOnboardingStatus();
  }, [loading, user, userID]); // Removed checkingOnboarding to prevent infinite loop

  // Load vostcards function
  const loadVostcards = useCallback(async (forceRefresh: boolean = false) => {
    // Skip loading regular vostcards if we have tour data (even with forceRefresh)
    if (tourData) {
      console.log('🗺️ HomeView: Skipping vostcard load - tour data is active (forceRefresh:', forceRefresh, ')');
      return;
    }
    
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
  }, [singleVostcard, loadingVostcards, tourData]);

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

  // Initial load - Skip if tour data is active
  useEffect(() => {
    if (!loading && !hasInitialLoad && !tourData) {
      console.log('🔄 Initial load - loading regular vostcards');
      loadVostcards();
    } else if (tourData) {
      console.log('🎬 Initial load - skipping regular vostcards, tour data is active');
      setHasInitialLoad(true); // Mark as loaded to prevent future loads
    }
  }, [loading, hasInitialLoad, tourData, loadVostcards]);

  // Handle fresh load after posting
  useEffect(() => {
    const navigationState = location.state as any;
    if (navigationState?.freshLoad || navigationState?.justPosted) {
      console.log('🔄 Fresh load requested after posting:', navigationState.justPosted);
      
      // Clear navigation state first to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
      
      // Add a small delay to ensure Firebase posting is complete, then refresh multiple times
      const refreshAfterPosting = async () => {
        console.log('⏳ Waiting for Firebase posting to complete...');
        
        // Initial refresh after 1 second
        setTimeout(() => {
          console.log('🔄 First refresh attempt...');
          loadVostcards(true);
        }, 1000);
        
        // Second refresh after 3 seconds (in case of network delays)
        setTimeout(() => {
          console.log('🔄 Second refresh attempt...');
          loadVostcards(true);
        }, 3000);
        
        // Third refresh after 5 seconds (final attempt)
        setTimeout(() => {
          console.log('🔄 Final refresh attempt...');
          loadVostcards(true);
        }, 5000);
      };
      
      refreshAfterPosting();
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
      const { latitude, longitude, accuracy, heading } = position.coords;
      console.log('✅ Location updated:', { 
        latitude: latitude.toFixed(6), 
        longitude: longitude.toFixed(6), 
        accuracy: `${accuracy}m`,
        heading: heading !== null ? `${heading}°` : 'unavailable',
        source: accuracy < 50 ? 'GPS' : 'Network/WiFi'
      });
      
      // Update heading if available and device is moving
      if (heading !== null && !isNaN(heading)) {
        // GPS heading is only reliable when moving, but we'll show it when available
        const speed = position.coords.speed; // Speed in m/s
        if (speed === null || speed > 0.5) { // Show heading if speed > 0.5 m/s (~1.8 km/h) or speed unavailable
          setUserHeading(heading);
          console.log('🧭 Heading updated:', `${heading}°`, speed ? `(speed: ${(speed * 3.6).toFixed(1)} km/h)` : '');
        } else {
          // Not moving fast enough for reliable heading
          console.log('🧭 Speed too low for reliable heading:', speed ? `${(speed * 3.6).toFixed(1)} km/h` : 'unknown');
        }
      }
      
      // Always update actualUserLocation for the recenter button
      setActualUserLocation([latitude, longitude]);
      
      // Only set initial position ONCE, never update map automatically again
      if (!hasInitialPosition) {
        console.log('📍 MOBILE DEBUG: Setting initial position ONCE on first load');
        setUserLocation([latitude, longitude]);
        // Center the map on the user's location ONCE at initial GPS success
        setMapTargetLocation([latitude, longitude]);
        setShouldUpdateMapView(true);
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

  const handleToursClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🎬 Navigating to Tours Near Me');
    navigate('/tours-near-me');
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
      hasRecenteredOnce.current = false;
      setMapTargetLocation(actualUserLocation);
      setShouldUpdateMapView(true); // Allow map to center on manual recenter
      console.log('🎯 Map will recenter to current GPS location');
    }
  };

  const filterVostcards = (vostcards: any[]) => {
    // When tour data is loaded, show ONLY tour posts (no regular vostcards)
    if (tourData) {
      console.log('🎬 Tour mode active - showing only tour posts');
      return vostcards; // vostcards already contains only tour posts when tourData is active
    }
    
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

  // Onboarding handlers
  const handleOnboardingComplete = async () => {
    console.log('✅ User completed onboarding tour');
    try {
      await OnboardingService.markOnboardingCompleted();
      setShowOnboarding(false);
      console.log('✅ Onboarding completion saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving onboarding completion:', error);
      // Still hide the onboarding even if save fails
      setShowOnboarding(false);
    }
  };

  const handleOnboardingSkip = async () => {
    console.log('⏭️ User skipped onboarding tour');
    try {
      await OnboardingService.markOnboardingCompleted();
      setShowOnboarding(false);
      console.log('✅ Onboarding skip saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving onboarding skip:', error);
      // Still hide the onboarding even if save fails
      setShowOnboarding(false);
    }
  };

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
            zIndex: 10001,
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
              ref={mapRef}
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
                  icon={userHeading !== null ? createDirectionalUserIcon(userHeading) : userIcon}
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
                      {userHeading !== null && (
                        <>
                          <br />
                          <small>🧭 Heading: {Math.round(userHeading)}°</small>
                        </>
                      )}
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
                const icon = getVostcardIcon(vostcard.isOffer, vostcard.userRole, vostcard.isQuickcard);
                const isVostcardPin = !vostcard.isOffer;
                const isGuidePin = !vostcard.isOffer && vostcard.userRole === 'guide';

                // Pin event handlers for Vostcard and Guide pins
                let eventHandlers: any = {};
                                 if (isGuidePin) {
                   eventHandlers = {
                     click: () => handleGuidePinClick(vostcard)
                   };
                } else if (isVostcardPin) {
                  eventHandlers = {
                    click: () => {
                      setActivePin({
                        type: 'vostcard',
                        id: vostcard.id,
                        title: vostcard.title || 'Untitled Vostcard',
                        lat: vostcard.latitude,
                        lng: vostcard.longitude
                      });
                    }
                  };
                                 } else {
                   // Offer pins: show popup like other pins
                   eventHandlers = {
                     click: () => handleOfferPinClick(vostcard)
                   };
                 }

                return (
                  <Marker
                    key={vostcard.id}
                    position={position}
                    icon={icon}
                    eventHandlers={eventHandlers}
                  />
                );
              })}
                     {/* Active Pin Popup Overlay */}
           {(() => {
             // Get the leaflet map instance from the ref safely
             const map = mapRef?.current;
             return (
               activePin && map && (
                <div
                  style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '10px',
                    width: '250px',
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '22px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <button
                    onClick={() => setActivePin(null)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '6px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    ❌
                  </button>
                  <strong>{activePin.title}</strong>
                                     <button
                     onClick={() => {
                       if (activePin?.type === 'vostcard' || activePin?.type === 'guide') {
                         navigate(`/vostcard/${activePin.id}`);
                       } else if (activePin?.type === 'offer') {
                         navigate(`/offer/${activePin.id}`);
                       }
                     }}
                     style={{
                       backgroundColor: '#002B4D',
                       color: 'white',
                       border: 'none',
                       borderRadius: '6px',
                       padding: '8px 16px',
                       fontSize: '16px',
                       cursor: 'pointer'
                     }}
                   >
                     Let&apos;s go see!
                   </button>
                </div>
              )
            );
          })()}
              
              {/* Map Controls */}
              <MapUpdater
                targetLocation={mapTargetLocation}
                singleVostcard={singleVostcard}
                shouldUpdateMapView={shouldUpdateMapView}
                stableShouldUpdateMapView={stableShouldUpdateMapView}
                hasRecenteredOnce={hasRecenteredOnce}
              />
              <ZoomControls />
            </MapContainer>

          {/* Floating Controls Over Map */}
          
          {/* Top buttons - horizontal layout with 4 buttons */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '4px',
              zIndex: 1002
            }}
          >
            {/* Help Button */}
            <button 
              type="button"
              style={{ 
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                transition: 'transform 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1',
                gap: '4px',
                flex: '1',
                minWidth: '0'
              }} 
              onClick={() => setShowHelpMenu(!showHelpMenu)}
            >
              <span style={{ fontSize: '14px', lineHeight: '1' }}>❓</span>
              <span>Help</span>
            </button>
            
            {/* List View Button */}
            <button 
              type="button"
              style={{ 
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                transition: 'transform 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1',
                gap: '4px',
                flex: '1',
                minWidth: '0'
              }} 
              onClick={handleListViewClick}
            >
              <img src={VostcardPin} alt="List" style={{ width: '14px', height: '14px' }} />
              <span>List</span>
            </button>
            
            {/* Offers Button */}
            <button 
              type="button"
              style={{ 
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                transition: 'transform 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1',
                gap: '4px',
                flex: '1',
                minWidth: '0'
              }} 
              onClick={handleOffersClick}
            >
              <img src={OfferPin} alt="Offers" style={{ width: '14px', height: '14px' }} />
              <span>Offers</span>
            </button>
            
            {/* Tours Button */}
            <button 
              type="button"
              style={{ 
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                transition: 'transform 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1',
                gap: '4px',
                flex: '1',
                minWidth: '0'
              }} 
              onClick={handleToursClick}
            >
              <FaWalking style={{ fontSize: '14px' }} />
              <span>Tours</span>
            </button>
          </div>

          {/* Help Menu Dropdown */}
          {showHelpMenu && (
            <div style={{
              position: 'absolute',
              top: '50px',
              left: '8px',
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
                onClick={(e) => {
                  console.log('🎯 BUTTON CLICKED! Event:', e);
                  console.log('🎯 Quick Start Tour clicked - before:', showOnboarding);
                  try {
                    setShowHelpMenu(false);
                    setShowOnboarding(true);
                    console.log('🎯 Quick Start Tour clicked - after setShowOnboarding(true)');
                  } catch (error) {
                    console.error('🎯 ERROR in button click:', error);
                  }
                }}
                onMouseDown={() => console.log('🎯 MOUSE DOWN on Quick Start button')}
                onTouchStart={() => console.log('🎯 TOUCH START on Quick Start button')}
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
                ✨ Quick Start Tour
              </button>
              
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

          {/* Recenter control - Hidden when viewing a tour */}
          {!tourData && (
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
          )}

          {/* Filter button - Hidden when viewing a tour */}
          {!tourData && (
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
          )}
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

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </div>
  );
};

export default HomeView; 