import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow, FaFilter, FaMapPin, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { useDriveMode } from '../context/DriveModeContext';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import GuidePin from '../assets/Guide_pin.svg';
import QuickcardPin from '../assets/quickcard_pin.png';
import InfoPin from '../assets/Info_pin.png';
import InfoButton from '../assets/Info_button.png'; // Add this import
import { signOut } from 'firebase/auth';
import './HomeView.css';
import { LocationService, type LocationResult, type LocationError } from '../utils/locationService';
import LocationDebugger from '../components/LocationDebugger';
import DriveModePlayer from '../components/DriveModePlayer';
import { useResponsive } from '../hooks/useResponsive';

const vostcardIcon = new L.Icon({
  iconUrl: VostcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],  // Center-bottom of the 75px icon
  popupAnchor: [0, -75],   // Popup 75px above the anchor
});

const offerIcon = new L.Icon({
  iconUrl: OfferPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],  // Center-bottom of the 75px icon
  popupAnchor: [0, -75],   // Popup 75px above the anchor
});

const guideIcon = new L.Icon({
  iconUrl: GuidePin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],  // Center-bottom of the 75px icon
  popupAnchor: [0, -75],   // Popup 75px above the anchor
});

const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],  // Center-bottom of the 75px icon
  popupAnchor: [0, -75],   // Popup 75px above the anchor
});

const userIcon = new L.DivIcon({
  className: 'user-location-dot',
  html: '<div style="width: 16px; height: 16px; background-color: #007aff; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11]
});

const ZoomControls = () => {
  const map = useMap();
  return (
    <div style={zoomControlStyle}>
      <button style={zoomButton} onClick={() => map.zoomIn()}><FaPlus /></button>
      <button style={zoomButton} onClick={() => map.zoomOut()}><FaMinus /></button>
    </div>
  );
};

const RecenterControl = ({ onRecenter }: { onRecenter: () => void }) => {
  return (
    <div style={recenterControlStyle}>
      <button style={zoomButton} onClick={onRecenter}><FaLocationArrow /></button>
    </div>
  );
};



const MapCenter = ({ userLocation }: { userLocation: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (userLocation) map.setView(userLocation, 16);
  }, [userLocation, map]);
  return null;
};

// Define style objects at the top
const listViewButtonContainerLeft = {
  position: 'absolute',
  top: '16px', // 16px margin from top of map
  left: '16px',
  zIndex: 1002
};

const listViewButtonContainerRight = {
  position: 'absolute',
  top: '16px', // 16px margin from top of map
  right: '16px',
  zIndex: 1002
};

const listViewButton = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '0px 20px',
  fontSize: '16px',
  fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  pointerEvents: 'auto' as const,
  transition: 'transform 0.1s ease',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const, // Ensure text is centered horizontally
  lineHeight: '1', // Ensure clean line height for better centering
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  zIndex: 1,
};

const errorOverlayStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#f8f9fa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
};

const errorContentStyle = {
  background: 'white',
  padding: '30px',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  textAlign: 'center' as const,
  maxWidth: '300px'
};

const retryButtonStyle = {
  background: '#007aff',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 20px',
  cursor: 'pointer',
  marginTop: '10px'
};

const loadingOverlayStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255,255,255,0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
};

const vostcardsLoadingOverlayStyle = {
  position: 'absolute' as const,
  top: 70, // Moved back from 165 to 70
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255,255,255,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  pointerEvents: 'none' as const
};

const authLoadingOverlayStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255,255,255,0.95)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200, // Highest priority for auth
};

const loadingContentStyle = {
  background: 'rgba(0,43,77,0.9)',
  color: 'white',
  padding: '20px 30px',
  borderRadius: '12px',
  fontSize: '18px',
  fontWeight: 600,
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
};

const debugStyle = {
  position: 'absolute' as const,
  top: '80px',
  right: '10px',
  background: 'rgba(0,0,0,0.8)',
  color: 'white',
  padding: '10px',
  borderRadius: '5px',
  fontSize: '12px',
  zIndex: 150, // High but not blocking
  maxWidth: '300px'
};

const debugButtonStyle = {
  background: '#ff4444',
  color: 'white',
  border: 'none',
  padding: '5px 10px',
  borderRadius: '3px',
  cursor: 'pointer',
  marginTop: '5px',
  fontSize: '10px'
};

const createButtonContainer = {
  position: 'absolute' as const,
  bottom: 95,
  left: 15,
  right: 15,
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'space-between',
  gap: '4%'
};

const createButton = {
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
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const quickcardButton = {
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
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const zoomControlStyle = {
  position: 'absolute' as const,
  top: '50%',
  right: 20,
  transform: 'translateY(-50%)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
};

const recenterControlStyle = {
  position: 'absolute' as const,
  top: '33%',
  right: 20,
  transform: 'translateY(-50%)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
};

const zoomButton = {
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
  transition: 'all 0.2s ease',
  ':hover': {
    opacity: 0.9,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  }
};



const offerPopupStyle = {
  background: '#f8f9fa',
  borderRadius: 8,
  padding: '8px 12px',
  margin: '8px 0',
  color: '#333',
  fontSize: 15,
};

const HomeView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    clearVostcard, 
    loadLocalVostcard, 
    vostcards: savedVostcards, 
    loadAllLocalVostcardsImmediate 
  } = useVostcard();
  const { user, username, userID, userRole, loading } = useAuth();
  const { isDriveModeEnabled, enableDriveMode, disableDriveMode } = useDriveMode();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [actualUserLocation, setActualUserLocation] = useState<[number, number] | null>(null);
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [singleVostcard, setSingleVostcard] = useState<any | null>(null);
  const [returnToPublicView, setReturnToPublicView] = useState(false); // Add this state
  const [publicVostcardId, setPublicVostcardId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoMenuOpen, setIsInfoMenuOpen] = useState(false);
  const [loadingVostcards, setLoadingVostcards] = useState(true);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showAuthLoading, setShowAuthLoading] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  // Enhanced location tracking with speed calculation
  const [previousLocation, setPreviousLocation] = useState<{
    coords: [number, number];
    timestamp: number;
  } | null>(null);

  // Calculate speed from location changes
  const calculateSpeed = useCallback((
    newLocation: [number, number],
    previousLoc: { coords: [number, number]; timestamp: number }
  ): number => {
    const distance = calculateDistance(
      previousLoc.coords[0],
      previousLoc.coords[1],
      newLocation[0],
      newLocation[1]
    );
    
    const timeDiff = (Date.now() - previousLoc.timestamp) / 1000;
    
    if (timeDiff <= 0) return 0; // Avoid division by zero
    return (distance / timeDiff) * 3600; // Convert to mph
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [browseLocation, setBrowseLocation] = useState<any>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const availableCategories = [
    'None',
    'Landmark',
    'Fun Fact',
    'Macabre',
    'Architecture',
    'Historical',
    'Museum',
    'Gallery',
    'Restaurant',
    'Nature',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Type filtering state (Offers are never filtered out)
  const availableTypes = ['Vostcard', 'Quickcard', 'Guide'];
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // Friends filtering state
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [userFriends, setUserFriends] = useState<string[]>([]);
  
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // YouTube video ID extracted from the provided URL
  const youtubeVideoId = 'CCOErz2RxwI';
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  // Check for fresh load state from navigation
  const browseLocationState = location.state?.browseLocation;

  // Handle browse location from navigation
  useEffect(() => {
    if (browseLocationState) {
      setBrowseLocation(browseLocationState);
      setUserLocation(browseLocationState.coordinates);
      // Don't overwrite actualUserLocation - keep it for recentering
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [browseLocationState, navigate, location.pathname]);

  // Handle fresh load state from navigation
  useEffect(() => {
    const navigationState = location.state as any;
    if (navigationState?.freshLoad) {
      console.log('🔄 Fresh load requested after posting vostcard');
      // Force a refresh of vostcards but keep location
      setVostcards([]);
      setLoadingVostcards(true);
      setMapError(null);
      setRetryCount(0);
      setLastUpdateTime(Date.now());
      
      // Clear the navigation state to prevent repeated fresh loads
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, location.pathname]);

  // Check for single vostcard state from navigation
  const singleVostcardState = location.state?.singleVostcard;

  // Handle target quickcard from navigation - center map but show all content
  useEffect(() => {
    if (singleVostcardState) {
      console.log('📍 Centering map on target quickcard:', singleVostcardState.title);
      setSingleVostcard(singleVostcardState); // Keep reference for highlighting
      // Set user location to the quickcard's location IMMEDIATELY
      if (singleVostcardState.latitude && singleVostcardState.longitude) {
        const vostcardLocation: [number, number] = [singleVostcardState.latitude, singleVostcardState.longitude];
        setUserLocation(vostcardLocation);
        // Also set actualUserLocation to prevent location fetching from overriding
        setActualUserLocation(vostcardLocation);
        console.log('📍 Set map center to quickcard location:', vostcardLocation);
      }
      // DON'T restrict vostcards - let loadVostcards() load all public content
      // This allows filtering and viewing all pins while centered on target quickcard
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [singleVostcardState, navigate, location.pathname]);

  // Handle shared content navigation state
  useEffect(() => {
    const sharedContent = location.state?.sharedContent;
    const centerLocation = location.state?.centerLocation;
    const highlightVostcard = location.state?.highlightVostcard;
    const showSharedContext = location.state?.showSharedContext;

    if (centerLocation && highlightVostcard) {
      console.log('📍 Handling shared content navigation:', {
        centerLocation,
        highlightVostcard,
        sharedContent
      });

      // Center map on shared content location
      setUserLocation(centerLocation);
      setActualUserLocation(centerLocation);

      // Keep reference to highlight the shared vostcard
      setSingleVostcard({
        id: highlightVostcard,
        latitude: centerLocation[0],
        longitude: centerLocation[1],
        isSharedContent: true,
        sharedContext: sharedContent
      });

      // Show a temporary notification about shared content
      if (showSharedContext && sharedContent) {
        setTimeout(() => {
          // You can add a toast notification here if you have one
          console.log(`📍 Viewing shared ${sharedContent.type}: ${sharedContent.title}`);
        }, 1000);
      }

      // Clear the navigation state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.centerLocation, location.state?.highlightVostcard, navigate, location.pathname]);

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
    
    // Hide auth loading overlay after 3 seconds to prevent blocking UI
    if (loading && showAuthLoading) {
      console.log('🏠 HomeView: Auth loading detected, will hide overlay after 3 seconds');
      const loadingTimeout = setTimeout(() => {
        console.log('⏰ HomeView: Hiding auth loading overlay to prevent UI blocking');
        setShowAuthLoading(false);
      }, 3000);
      
      return () => clearTimeout(loadingTimeout);
    }
    
    // Reset auth loading overlay when not loading
    if (!loading) {
      setShowAuthLoading(true);
    }
  }, [user, username, userID, userRole, loading, showAuthLoading]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
    }
  };

  const getVostcardIcon = (isOffer: boolean, userRole?: string, isQuickcard?: boolean) => {
    if (isOffer) {
      return offerIcon;
    }
    if (isQuickcard) {
      return quickcardIcon;
    }
    if (userRole === 'guide') {
      return guideIcon;
    }
    return vostcardIcon;
  };

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

  const loadVostcards = async (forceRefresh: boolean = false) => {
    // Skip loading if we're in single vostcard mode
    if (singleVostcard) {
      return;
    }
    
    try {
      setLoadingVostcards(true);
      setMapError(null);
      
      if (forceRefresh) {
        console.log('🔄 Force refreshing vostcards after posting');
      }
      
      // Enhanced query: Get both regular posted vostcards AND posted quickcards
      console.log('🔄 Loading posted vostcards and quickcards');
      
      // Query 1: Regular posted vostcards
      const q1 = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
      const snapshot1 = await getDocs(q1);
      const postedVostcards = snapshot1.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]; // Assuming Vostcard type is any[] or needs a type definition
      
      // Query 2: Posted quickcards (they have state: 'posted' AND isQuickcard: true)  
      // Since we already got all posted items in query 1, we just need to include quickcards from that result
      
      // Combine and filter: Include regular vostcards + posted quickcards + offers
      const allContent = postedVostcards.filter(v => 
        // Include regular vostcards, posted quickcards, and offers
        !v.isQuickcard || // Include regular vostcards and offers
        (v.isQuickcard && v.state === 'posted') // Include posted quickcards
      );
      
      console.log('📋 Loaded vostcards and quickcards:', allContent.length, {
        regular: allContent.filter(v => !v.isQuickcard).length,
        quickcards: allContent.filter(v => v.isQuickcard).length
      });
      
      setVostcards(allContent);
      setRetryCount(0); // Reset retry count on success
      setLastUpdateTime(Date.now());
      
    } catch (error) {
      console.error('Error loading Vostcards:', error);
      setMapError('Failed to load vostcards from the map');
    } finally {
      setLoadingVostcards(false);
    }
  };
 
  // Get user location with error handling - Skip if viewing single vostcard
  useEffect(() => {
    // Skip location fetching entirely when viewing a single vostcard
    if (singleVostcard) {
      console.log('📍 Skipping GPS location fetch - viewing single vostcard');
      return;
    }

    const getUserLocation = async () => {
      try {
        console.log('📍 Getting user location...');
        const location = await LocationService.getCurrentLocation();
        
        const locationCoords: [number, number] = [location.latitude, location.longitude];
        console.log('📍 User location acquired:', locationCoords, `(${location.source})`);
        
        setActualUserLocation(locationCoords);
        
        if (!browseLocationState && !browseLocation) {
          setUserLocation(locationCoords);
        }
        
        setMapError(null);
        
      } catch (error) {
        console.error('❌ Location error:', error);
        const locationError = error as LocationError;
        
        // Show user-friendly error with suggestions
        const errorMessage = `${locationError.userFriendlyMessage}\n\nSuggestions:\n${locationError.suggestions.join('\n')}`;
        
        setMapError(errorMessage);
        
        // Use fallback location for New York
        const fallback = LocationService.getFallbackLocation();
        const fallbackCoords: [number, number] = [fallback.latitude, fallback.longitude];
        
        if (!browseLocationState && !browseLocation) {
          setUserLocation(fallbackCoords);
        }
      }
    };

    getUserLocation();
  }, [browseLocationState, singleVostcard, browseLocation]);

  // Load vostcards on mount and when fresh load is requested
  useEffect(() => {
    // Don't load vostcards if we're in single vostcard mode
    if (!singleVostcard) {
      loadVostcards(true); // Always force refresh on mount
    }
  }, [singleVostcard]);

  // Auto-refresh vostcards periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing vostcards');
      loadVostcards();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch user avatar and friends list
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserAvatar(userData.avatarURL || null);
            setUserFriends(userData.friends || []);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserAvatar(null);
        setUserFriends([]);
      }
    };

    fetchUserData();
  }, [user]);

  const addCoordinatesToVostcard = async (vostcardId: string, lat: number, lng: number) => {
    try {
      const currentUser = auth.currentUser;
      const vostcard = vostcards.find(v => v.id === vostcardId);
      if (!vostcard) return;
      const isOwner = (vostcard.userID || vostcard.userId) === currentUser?.uid;
      if (!isOwner) {
        alert('You can only update your own Vostcards. This Vostcard belongs to another user.');
        return;
      }
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await updateDoc(vostcardRef, {
        latitude: lat,
        longitude: lng,
        geo: { latitude: lat, longitude: lng }
      });
      loadVostcards(true);
    } catch (error) {
      console.error('Error adding coordinates:', error);
      alert('Error adding coordinates. Check console for details.');
    }
  };

  // Reload vostcards when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window gained focus, reloading vostcards');
      loadVostcards(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleCreateVostcard = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('📝 Navigating to Create Vostcard');
    clearVostcard();
    navigate('/create-step1');
  };

  const handleCreateQuickcard = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('📱 Opening native camera for Quickcard');
    clearVostcard();
    
    // Create a temporary file input and trigger native camera directly
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment'; // Use back camera
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      
      // Handle file selection cancellation
      if (!file) {
        console.log('📱 User cancelled photo selection');
        return;
      }
      
      if (file.type.startsWith('image/')) {
        console.log('📸 Valid image file selected:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
        
        // Get location for quickcard
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            console.log('📍 Location obtained:', userLocation);
            
            // Convert file to blob and create quickcard
            try {
              const reader = new FileReader();
              
              reader.onload = (e) => {
                const imageData = e.target?.result;
                if (imageData) {
                  // Convert to blob and create quickcard with proper error handling
                  fetch(imageData as string)
                    .then(res => {
                      if (!res.ok) {
                        throw new Error(`Failed to convert image: ${res.status}`);
                      }
                      return res.blob();
                    })
                    .then(blob => {
                      console.log('📸 Successfully converted photo to blob:', blob.size, 'bytes');
                      try {
                        createQuickcard(blob, userLocation);
                        console.log('✅ Quickcard created successfully, navigating to step 3');
                        navigate('/quickcard-step3');
                      } catch (createError) {
                        console.error('❌ Error creating quickcard:', createError);
                        alert('Failed to create quickcard. Please try again.');
                      }
                    })
                    .catch(blobError => {
                      console.error('❌ Error converting photo to blob:', blobError);
                      alert('Failed to process photo. Please try again.');
                    });
                } else {
                  console.error('❌ No image data from FileReader');
                  alert('Failed to read photo. Please try again.');
                }
              };
              
              reader.onerror = (readerError) => {
                console.error('❌ FileReader error:', readerError);
                alert('Failed to read photo. Please try again.');
              };
              
              // Start reading the file
              reader.readAsDataURL(file);
              
            } catch (readerSetupError) {
              console.error('❌ Error setting up FileReader:', readerSetupError);
              alert('Failed to process photo. Please try again.');
            }
          },
          (error) => {
            console.error('❌ Error getting location:', error);
            alert('📍 Location is required for quickcards. Please enable location services and try again.');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else if (file.type.startsWith('video/')) {
        console.log('❌ User selected video file');
        alert('📸 Quickcards only accept photos!\n\nYou selected a video file. Please take a photo instead.');
      } else {
        console.log('❌ User selected invalid file type:', file.type);
        alert('📸 Invalid file type!\n\nPlease select a photo file.');
      }
    };
    
    // Add error handler for file input
    fileInput.onerror = () => {
      console.error('❌ File input error');
      alert('Failed to open camera. Please try again.');
    };
    
    // Trigger the native camera
    try {
      fileInput.click();
    } catch (clickError) {
      console.error('❌ Error triggering camera:', clickError);
      alert('Failed to open camera. Please try again.');
    }
  };

  const handleRetryLoad = () => {
    setRetryCount(prev => prev + 1);
    loadVostcards(true);
  };





  // Enhanced filtering logic for Vostcards by category and type
  const filterVostcards = (vostcards: any[]) => {
    let filtered = vostcards;
    
    // Category filtering (if categories are selected and not 'None')
    if (selectedCategories.length > 0 && !selectedCategories.includes('None')) {
      filtered = filtered.filter(v => {
        // Always include offers regardless of category filter
        if (v.isOffer) return true;
        
        if (!v.categories || !Array.isArray(v.categories)) return false;
        return v.categories.some((cat: string) => selectedCategories.includes(cat));
      });
    }
    
    // Type filtering (if types are selected)
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(v => {
        // Always include offers regardless of type filter
        if (v.isOffer) return true;
        
        // Check if it matches selected types
        if (selectedTypes.includes('Vostcard') && !v.isQuickcard && !v.isOffer && v.userRole !== 'guide') return true;
        if (selectedTypes.includes('Quickcard') && v.isQuickcard) return true;
        if (selectedTypes.includes('Guide') && v.userRole === 'guide' && !v.isOffer) return true;
        
        return false;
      });
    }
    
    // Friends filtering (if friends only is enabled)
    if (showFriendsOnly) {
      filtered = filtered.filter(v => {
        // Always include offers regardless of friends filter
        if (v.isOffer) return true;
        
        // Include posts by friends (check if author is in user's friends list)
        return userFriends.includes(v.userID || v.userId);
      });
    }
    
    return filtered;
  };

  // Calculate distance between two points in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('[data-menu]')) {
        setIsMenuOpen(false);
      }
      if (isInfoMenuOpen && !target.closest('[data-info-menu]')) {
        setIsInfoMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isInfoMenuOpen]);

  const menuItems = [
    { label: 'Private Posts', route: '/edit-my-vostcards' },
    { label: 'Public Posts', route: '/my-posted-vostcards' },
    { label: 'Browse Area', route: '/browse-area' },
    { label: 'Vōstbox', route: '/vostbox' },
    { label: 'Friend List', route: '/friends' },
    { label: 'Liked Vōstcards', route: '/liked-vostcards' },
    { label: 'Following', route: '/following' },
    { label: 'Drivecards', route: '/drivecards' },
    { label: 'Script tool', route: '/script-library' },
    { label: `Drive Mode ${isDriveModeEnabled ? 'ON' : 'OFF'}`, route: null },
    { label: 'Vostcard Studio', route: '/studio' },
    ...(userRole === 'admin' ? [{ label: 'Admin Panel', route: '/admin' }] : []),
    { label: 'Account Settings', route: '/account-settings' },
    { label: 'Suggestion Box', route: '/suggestion-box' },
    { label: 'Report a Bug', route: '/report-bug' },
    { label: 'Logout', route: null },
  ];

  const infoMenuItems = [
    { label: 'What is Vōstcard?', route: '/video/what-is-vostcard' },
    { label: 'What is a Quickcard?', route: '/video/what-is-quickcard' },
    { label: 'How to make a Vostcard', route: '/video/how-to-make-vostcard' },
    { label: 'How to make a Quickcard', route: '/video/how-to-make-quickcard' },
    { label: 'Pulldown menu. Sending Vostcards and Quickcards', route: '/video/pulldown-menu-sending' },
    { label: 'Adding Friends', route: '/video/adding-friends' },
    { label: 'Your Vostbaox', route: '/video/your-vostbaox' },
  ];

  const handleMenuItemClick = async (label: string, route: string | null) => {
    setIsMenuOpen(false);
    
    if (label === 'Logout') {
      handleLogout();
    } else if (label.startsWith('Drive Mode')) {
      // Toggle Drive Mode
      if (isDriveModeEnabled) {
        disableDriveMode();
        console.log('🛑 Drive Mode disabled from menu');
      } else {
        enableDriveMode(true); // Manual enable
        console.log('🚗 Drive Mode enabled from menu');
      }
    } else if (route) {
      console.log(`🔄 Navigating to: ${route}`);
      
      // ❌ REMOVED: The slow sync that was causing the delay
      // This was the problematic code:
      // if (label === 'Private Posts') {
      //   console.log('🔄 Syncing private posts before navigation...');
      //   try {
      //     await manualSync();
      //     console.log('✅ Sync completed successfully');
      //   } catch (error) {
      //     console.error('❌ Sync failed:', error);
      //   }
      // }
      
      navigate(route);
    }
  };

  const handleInfoMenuItemClick = (label: string, route: string | null) => {
    setIsInfoMenuOpen(false);
    
    if (label === 'What is Vōstcard?') {
      console.log(`🎥 Opening video modal for: ${label}`);
      setShowVideoModal(true);
    } else if (route) {
      console.log(`ℹ️ Navigating to: ${route}`);
      navigate(route);
    }
  };

  // Format last update time for display
  const formatLastUpdate = () => {
    const secondsAgo = Math.floor((Date.now() - lastUpdateTime) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  };

  const handleListViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('📋 Navigating to List View');
    navigate('/all-posted-vostcards');
  };

  const handleOffersClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🎁 Navigating to Offers List');
    navigate('/offers-list');
  };

  // Recenter map to user's actual GPS location
  const handleRecenter = () => {
    if (actualUserLocation) {
      console.log('🎯 Recentering map to user location:', actualUserLocation);
      setUserLocation(actualUserLocation);
      setBrowseLocation(null); // Clear browse location when recentering
    }
  };

  // Update the filteredVostcards definition
  const filteredVostcards = singleVostcard ? [singleVostcard] : filterVostcards(vostcards);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: useContainer ? '#f0f0f0' : 'white',
      display: useContainer ? 'flex' : 'block',
      justifyContent: useContainer ? 'center' : 'initial',
      alignItems: useContainer ? 'flex-start' : 'initial',
      padding: useContainer ? '20px' : '0'
    }}>
      {/* Mobile-style container with responsive design */}
      <div style={{
        width: useContainer ? '390px' : '100%',
        maxWidth: useContainer ? '390px' : '100%',
        height: useContainer ? '844px' : '100vh',
        backgroundColor: 'white',
        boxShadow: useContainer ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: useContainer ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Fixed Header - now relative to container */}
        <div style={{
          backgroundColor: '#002B4D',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'relative', // Changed from fixed
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          touchAction: 'manipulation',
          flexShrink: 0,
          borderRadius: useContainer ? '16px 16px 0 0' : '0'
        }}>
          <div 
            onClick={() => navigate('/home')}
            style={{ 
              color: 'white', 
              fontSize: 28, 
              fontWeight: 'bold',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {singleVostcard ? 'Vōstcard Location' : 'Vōstcard'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              onClick={() => {
                if (user?.uid) {
                  navigate(`/profile/${user.uid}`);
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
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Main content area - no padding top needed since header is not fixed */}
        <div style={{ 
          flex: 1, 
          position: 'relative',
          overflow: 'hidden'
        }}>
          {loading && showAuthLoading ? (
            <div style={authLoadingOverlayStyle}>
              <div style={loadingContentStyle}>
                Authenticating...
              </div>
            </div>
          ) : (
            <>
              {/* Navigation buttons - adjust positioning */}
              {!singleVostcard && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px', // Changed from 96px since header is no longer fixed
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 1002,
                    padding: '0 20px'
                  }}
                >
                  <button 
                    type="button"
                    style={{ ...listViewButton, textAlign: 'center', display: 'flex', alignItems: 'center', gap: '8px' }} 
                    onClick={handleListViewClick}
                  >
                    <span style={{ fontSize: '20px', lineHeight: '1' }}>⋮</span>
                    List View
                  </button>
                  
                  <button 
                    type="button"
                    style={{ ...listViewButton, textAlign: 'center', display: 'flex', alignItems: 'center', gap: '8px' }} 
                    onClick={handleOffersClick}
                  >
                    <span style={{ fontSize: '20px', lineHeight: '1' }}>⋮</span>
                    Offers
                  </button>
                  
                  {/* Info button */}
                  <button
                    onClick={() => setShowVideoModal(true)}
                    style={{
                      ...listViewButton,
                      padding: '8px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={InfoButton}
                      alt="Info"
                      style={{
                        width: '24px',
                        height: '24px',
                        filter: 'brightness(0) saturate(100%) invert(100%)'
                      }}
                    />
                  </button>
                </div>
              )}

              {/* Map Container */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1
              }}>
                {mapError ? (
                  <div style={errorOverlayStyle}>
                    <div style={errorContentStyle}>
                      <h3 style={{ color: '#d32f2f', margin: '0 0 16px 0' }}>Map Error</h3>
                      <p style={{ color: '#666', margin: '0 0 16px 0', fontSize: '14px' }}>
                        {mapError}
                      </p>
                      <button onClick={handleRetryLoad} style={retryButtonStyle}>
                        Retry ({retryCount})
                      </button>
                    </div>
                  </div>
                ) : (
                  <MapContainer
                    center={userLocation}
                    zoom={16}
                    style={mapContainerStyle}
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {/* User location marker */}
                    {actualUserLocation && (
                      <Marker position={actualUserLocation} icon={userIcon}>
                        <Popup>Your Location</Popup>
                      </Marker>
                    )}
                    
                    {/* Vostcard markers */}
                    {filteredVostcards.map((vostcard) => {
                      if (!vostcard.latitude || !vostcard.longitude) return null;
                      
                      const position: [number, number] = [vostcard.latitude, vostcard.longitude];
                      const icon = getVostcardIcon(vostcard.isOffer, vostcard.userRole, vostcard.isQuickcard);
                      
                      const isHighlighted = singleVostcard?.id === vostcard.id && singleVostcard?.isSharedContent;
                      
                      return (
                        <Marker
                          key={vostcard.id}
                          position={position}
                          icon={icon}
                          eventHandlers={{
                            click: () => {
                              console.log('📍 Vostcard pin clicked:', vostcard.title);
                              if (vostcard.isQuickcard) {
                                navigate(`/quickcard/${vostcard.id}`);
                              } else if (vostcard.isOffer) {
                                navigate(`/offer/${vostcard.id}`);
                              } else {
                                navigate(`/vostcard/${vostcard.id}`);
                              }
                            }
                          }}
                        >
                          <Popup>
                            <div style={{ 
                              textAlign: 'center', 
                              minWidth: 150,
                              background: isHighlighted ? '#fff3cd' : 'white',
                              border: isHighlighted ? '2px solid #856404' : 'none',
                              borderRadius: isHighlighted ? '8px' : '0',
                              padding: isHighlighted ? '8px' : '4px'
                            }}>
                              {isHighlighted && (
                                <div style={{
                                  fontSize: '12px',
                                  color: '#856404',
                                  fontWeight: 'bold',
                                  marginBottom: '4px'
                                }}>
                                  📤 Shared with you
                                </div>
                              )}
                              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                {vostcard.title || 'Untitled'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                by {vostcard.username || 'Unknown'}
                              </div>
                              {isHighlighted && (
                                <div style={{
                                  fontSize: '11px',
                                  color: '#856404',
                                  fontStyle: 'italic'
                                }}>
                                  Click to view details
                                </div>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                    
                    <ZoomControls />
                    <RecenterControl onRecenter={handleRecenter} />
                    <MapCenter userLocation={userLocation} />
                  </MapContainer>
                )}
              </div>
            </>
          )}
        </div>

        {/* All overlay elements positioned relative to container */}
        
        {/* Menu - adjust positioning */}
        {isMenuOpen && (
          <div style={{
            ...menuStyle,
            position: 'absolute', // Changed from absolute to work within container
            top: '65px',
            right: '16px'
          }}>
            {menuItems.map(({ label, route }) => (
              <button
                key={label}
                type="button"
                style={{
                  ...menuItemStyle,
                  backgroundColor: route && location.pathname === route ? '#f0f0f0' : 'transparent',
                  width: '100%',
                  textAlign: 'left'
                }}
                onClick={() => handleMenuItemClick(label, route)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Create buttons - adjust positioning */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 15,
          right: 15,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '4%'
        }}>
          <button
            onTouchStart={handleCreateTouchStart}
            onTouchEnd={handleCreateTouchEnd}
            onClick={handleCreateClick}
            style={{
              ...createButton,
              transform: isCreatePressed ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            Create Vostcard
          </button>
          <button
            onTouchStart={handleQuickcardTouchStart}
            onTouchEnd={handleQuickcardTouchEnd}
            onClick={handleCreateQuickcard}
            style={{
              ...quickcardButton,
              transform: isQuickcardPressed ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            Create Quickcard
          </button>
        </div>

        {/* Zoom controls - adjust positioning */}
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
          <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 16) + 1)} style={zoomButton}>
            <FaPlus />
          </button>
          <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 16) - 1)} style={zoomButton}>
            <FaMinus />
          </button>
        </div>

        {/* Recenter control - adjust positioning */}
        <div style={{
          position: 'absolute',
          top: '33%',
          right: 20,
          transform: 'translateY(-50%)',
          zIndex: 1000
        }}>
          <button onClick={handleRecenter} style={zoomButton}>
            <FaLocationArrow />
          </button>
        </div>

        {/* Filter button - adjust positioning */}
        <div style={{
          position: 'absolute',
          bottom: '95px', // Adjusted to be above create buttons
          left: '16px',
          zIndex: 1002
        }}>
          <button
            onClick={() => setShowFilterModal(!showFilterModal)}
            style={{
              ...zoomButton,
              backgroundColor: (
                (selectedCategories.length > 0 && !selectedCategories.includes('None')) || 
                selectedTypes.length > 0 ||
                showFriendsOnly
              ) ? '#002B4D' : '#fff',
              color: (
                (selectedCategories.length > 0 && !selectedCategories.includes('None')) || 
                selectedTypes.length > 0 ||
                showFriendsOnly
              ) ? 'white' : '#002B4D'
            }}
          >
            <FaFilter />
          </button>
        </div>

        {/* All other overlays and modals remain positioned absolutely within the container */}
        {/* ... rest of existing JSX for modals, overlays, etc. ... */}
      </div>
    </div>
  );
};

export default HomeView;