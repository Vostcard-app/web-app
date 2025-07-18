import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow, FaFilter, FaMapPin } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import GuidePin from '../assets/Guide_pin.svg';
import { signOut } from 'firebase/auth';
import './HomeView.css';
import { LocationService, type LocationResult, type LocationError } from '../utils/locationService';
import LocationDebugger from '../components/LocationDebugger';

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
  padding: '12px 20px',
  fontSize: '16px',
  fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  pointerEvents: 'auto' as const,
  transition: 'transform 0.1s ease',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const, // Ensure text is centered horizontally
};

const mapContainerStyle = {
  flex: 1,
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
  bottom: 40,
  left: 15,
  right: 15,
  zIndex: 1000,
};

const createButton = {
  background: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  padding: '18px 40px',
  fontSize: 22,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,43,77,0.2)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  width: '100%'
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
  const { clearVostcard, manualSync } = useVostcard();
  const { user, username, userID, userRole, loading } = useAuth();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [actualUserLocation, setActualUserLocation] = useState<[number, number] | null>(null);
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [singleVostcard, setSingleVostcard] = useState<any | null>(null);
  const [returnToPublicView, setReturnToPublicView] = useState(false); // Add this state
  const [publicVostcardId, setPublicVostcardId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingVostcards, setLoadingVostcards] = useState(true);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showAuthLoading, setShowAuthLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [browseLocation, setBrowseLocation] = useState<any>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const availableCategories = [
    'None',
    'Landmark',
    'Fun Fact',
    'Architecture',
    'Historical',
    'Museum',
    'Gallery',
    'Restaurant',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

  // Handle single vostcard view from navigation
  useEffect(() => {
    if (singleVostcardState) {
      setSingleVostcard(singleVostcardState);
      // Set user location to the vostcard's location
      if (singleVostcardState.latitude && singleVostcardState.longitude) {
        setUserLocation([singleVostcardState.latitude, singleVostcardState.longitude]);
      }
      // Set vostcards to only show this single vostcard
      setVostcards([singleVostcardState]);
      // Clear the state to prevent re-triggering
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
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
    }
  };

  const getVostcardIcon = (isOffer: boolean, userRole?: string) => {
    if (isOffer) {
      return offerIcon;
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
    overflow: 'hidden'
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
      
      // 🔧 FIX: Query for both public vostcards AND offers
      const q = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
      const querySnapshot = await getDocs(q);
      const postedVostcardsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('📍 Loaded vostcards:', postedVostcardsData.length);
      
      setVostcards(postedVostcardsData);
      setRetryCount(0); // Reset retry count on success
      setLastUpdateTime(Date.now());
      
    } catch (error) {
      console.error('Error loading Vostcards:', error);
      setMapError('Failed to load vostcards from the map');
    } finally {
      setLoadingVostcards(false);
    }
  };
 
  // Get user location with error handling - Always get GPS location for recentering
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        console.log('📍 Getting user location...');
        const location = await LocationService.getCurrentLocation();
        
        const locationCoords: [number, number] = [location.latitude, location.longitude];
        console.log('📍 User location acquired:', locationCoords, `(${location.source})`);
        
        setActualUserLocation(locationCoords);
        
        if (!browseLocationState && !singleVostcard && !browseLocation) {
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
        
        if (!browseLocationState && !singleVostcard && !browseLocation) {
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

  // Fetch user avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserAvatar(userData.avatarURL || null);
          }
        } catch (error) {
          console.error('Error fetching user avatar:', error);
        }
      } else {
        setUserAvatar(null);
      }
    };

    fetchUserAvatar();
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

  const handleRetryLoad = () => {
    setRetryCount(prev => prev + 1);
    loadVostcards(true);
  };





  // Filtering logic for Vostcards by category
  const filterVostcardsByCategory = (vostcards: any[]) => {
    if (selectedCategories.length === 0 || selectedCategories.includes('None')) return vostcards;
    return vostcards.filter(v => {
      if (!v.categories || !Array.isArray(v.categories)) return false;
      return v.categories.some((cat: string) => selectedCategories.includes(cat));
    });
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('[data-menu]')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const menuItems = [
    { label: 'Browse Area', route: '/browse-area' },
    { label: 'My Private Vōstcards', route: '/edit-my-vostcards' },  // Fix the route to match App.tsx
    { label: 'My Posted Vōstcards', route: '/my-posted-vostcards' },
    { label: 'Liked Vōstcards', route: '/liked-vostcards' },
    { label: 'Following', route: '/following' },
    { label: 'Vōstbox', route: '/vostbox' },
    { label: 'Friend List', route: '/friends' },
    { label: 'Script tool', route: '/script-library' },
    ...(userRole === 'admin' ? [{ label: 'Admin Panel', route: '/admin' }] : []), // Add admin panel for admins
    { label: 'Suggestion Box', route: '/suggestion-box' },
    { label: 'Report a Bug', route: '/report-bug' },
    { label: 'Account Settings', route: '/account-settings' },
    { label: 'Logout', route: null },
  ];

  const handleMenuItemClick = async (label: string, route: string | null) => {
    setIsMenuOpen(false);
    
    if (label === 'Logout') {
      handleLogout();
    } else if (route) {
      console.log(`🔄 Navigating to: ${route}`);
      
      // ❌ REMOVED: The slow sync that was causing the delay
      // This was the problematic code:
      // if (label === 'My Private Vōstcards') {
      //   console.log('🔄 Syncing private vostcards before navigation...');
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

  // Update the filteredVostcards definition
  const filteredVostcards = singleVostcard ? [singleVostcard] : filterVostcardsByCategory(vostcards);

  return (
    <div style={{ 
      height: '100vh', 
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 🔵 Header - Always show the banner */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        touchAction: 'manipulation',
        zIndex: 1000
      }}>
        <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>
          {singleVostcard ? 'Vōstcard Location' : 'Vōstcard'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Removed the "Show All" button - users need to register to see all vostcards */}
          
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

      {/* Main content area */}
      <div style={{ 
        flex: 1, 
        paddingTop: 80, 
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
            {/* Hide the list view/offers/area buttons when in single vostcard mode */}
            {!singleVostcard && (
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
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
              {/* Existing map content */}
              {mapError ? (
                <div style={errorOverlayStyle}>
                  <div style={errorContentStyle}>
                    <h3>Map Error</h3>
                    <p>{mapError}</p>
                    <button onClick={handleRetryLoad} style={retryButtonStyle}>
                      Retry {retryCount > 0 && `(${retryCount})`}
                    </button>
                  </div>
                </div>
              ) : !userLocation ? (
                <div style={loadingOverlayStyle}>
                  <div style={loadingContentStyle}>
                    Getting your location...
                  </div>
                </div>
              ) : (
                <MapContainer 
                  center={userLocation} 
                  zoom={16} 
                  maxZoom={22} 
                  style={{ height: '100%', width: '100%' }} 
                  zoomControl={false}
                >
                  <TileLayer 
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                    maxZoom={22}
                  />

                  {/* Use actualUserLocation for the user location marker */}
                  {actualUserLocation && (
                    <Marker position={actualUserLocation} icon={userIcon}>
                      <Popup>Your Location</Popup>
                    </Marker>
                  )}

                  {filteredVostcards.map((v: any) => {
                    const lat = v.latitude || v.geo?.latitude;
                    const lng = v.longitude || v.geo?.longitude;
                    if (!lat || !lng) return null;
                    return (
                      <Marker
                        key={v.id}
                        position={[lat, lng]}
                        icon={getVostcardIcon(v.isOffer, v.userRole)}
                        eventHandlers={{
                          click: () => {
                            if (v.isOffer) {
                              console.log("📍 Navigating to Offer view for ID:", v.id);
                              navigate(`/offer/${v.id}`);
                            } else {
                              console.log("📍 Navigating to Vostcard detail view for ID:", v.id);
                              navigate(`/vostcard/${v.id}`);
                            }
                          }
                        }}
                      >
                        <Popup>
                          <h3>{v.title || 'Untitled'}</h3>
                          <p>{v.description || 'No description'}</p>
                          {v.isOffer && v.offerDetails?.discount && (
                            <div style={offerPopupStyle}>
                              <strong>🎁 Special Offer:</strong> {v.offerDetails.discount}
                              {v.offerDetails.validUntil && <div><small>Valid until: {v.offerDetails.validUntil}</small></div>}
                            </div>
                          )}
                          {v.categories && Array.isArray(v.categories) && v.categories.length > 0 && (
                            <p><strong>Categories:</strong> {v.categories.join(', ')}</p>
                          )}
                          <p><small>Posted at: {v.createdAt?.toDate?.() || 'Unknown'}</small></p>
                        </Popup>
                      </Marker>
                    );
                  })}

                  <ZoomControls />
                  <MapCenter userLocation={userLocation} />
                </MapContainer>
              )}
            </div>

            {/* Create Vostcard Button */}
            <div style={createButtonContainer}>
              <button 
                type="button" 
                style={createButton} 
                onClick={handleCreateVostcard}
              >
                Create Vōstcard
              </button>
            </div>

            {/* Hamburger Menu */}
            {isMenuOpen && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    zIndex: 1999
                  }}
                  onClick={() => setIsMenuOpen(false)}
                />
                
                <div 
                  style={menuStyle} 
                  data-menu 
                  role="menu" 
                  aria-label="Main menu"
                >
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
              </>
            )}
          </>
        )}
      </div>

      {/* Loading Overlay for Vostcards */}
      {loadingVostcards && (
        <div style={vostcardsLoadingOverlayStyle}>
          <div style={loadingContentStyle}>
            Loading Vōstcards...
          </div>
        </div>
      )}

      {/* Auth Loading Overlay - Only show for first 3 seconds */}
      {loading && showAuthLoading && (
        <div style={authLoadingOverlayStyle}>
          <div style={loadingContentStyle}>
            Authenticating...
          </div>
        </div>
      )}

      {/* Filter Button - Lower Left */}
      <div style={{
        position: 'absolute',
        bottom: '120px',
        left: '16px',
        zIndex: 1002
      }}>
        <button
          onClick={() => setShowFilterModal(!showFilterModal)}
          style={{
            ...zoomButton,
            backgroundColor: selectedCategories.length > 0 && !selectedCategories.includes('None') ? '#002B4D' : '#fff',
            color: selectedCategories.length > 0 && !selectedCategories.includes('None') ? 'white' : '#002B4D'
          }}
        >
          <FaFilter />
        </button>
      </div>

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
              zIndex: 2000
            }}
            onClick={() => setShowFilterModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '300px',
            width: '90%',
            maxHeight: '60vh',
            overflowY: 'auto',
            zIndex: 2001,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Filter by Category</h3>
            
            {availableCategories.map((category) => (
              <label key={category} style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontSize: '14px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: selectedCategories.includes(category) ? '#f0f8ff' : 'transparent'
              }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (category === 'None') {
                        setSelectedCategories(['None']);
                      } else {
                        setSelectedCategories(prev => prev.filter(c => c !== 'None').concat(category));
                      }
                    } else {
                      setSelectedCategories(prev => prev.filter(c => c !== category));
                    }
                  }}
                  style={{ marginRight: '8px' }}
                />
                {category}
              </label>
            ))}
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedCategories([])}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#002B4D',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HomeView;