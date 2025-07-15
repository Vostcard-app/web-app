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
import { signOut } from 'firebase/auth';
import './HomeView.css';

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

const RecenterControl = ({ userLocation }: { userLocation: [number, number] | null }) => {
  const map = useMap();
  const recenter = () => {
    if (userLocation) map.setView(userLocation, 16);
  };
  return (
    <div style={recenterControlStyle}>
      <button style={zoomButton} onClick={recenter}><FaLocationArrow /></button>
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

function getVostcardIcon(isOffer: boolean = false) {
  return isOffer ? offerIcon : vostcardIcon;
}

// Define style objects at the top
const listViewButtonContainerLeft = {
  position: 'fixed',
  top: '96px', // 80px header + 16px margin
  left: '16px',
  zIndex: 1002
};

const listViewButtonContainerRight = {
  position: 'fixed',
  top: '96px', // 80px header + 16px margin
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
  position: 'fixed' as const,
  top: 80,
  left: 0,
  right: 0,
  bottom: 0,
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
  position: 'fixed' as const,
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
  position: 'fixed' as const,
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

const recenterControlStyle = {
  position: 'fixed' as const,
  bottom: '120px', // Moved back from 25% to 120px
  right: '16px', // Moved back from 20 to 16px
  zIndex: 1002,
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
  const [mapAreaPreference, setMapAreaPreference] = useState<'nearby' | '1-mile' | '5-miles' | 'custom' | 'search'>('nearby');
  const [customDistance, setCustomDistance] = useState(2); // Default 2 miles
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [showDistanceSlider, setShowDistanceSlider] = useState(false);
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

  const clearAuthState = async () => {
    try {
      console.log('🧹 Clearing Firebase auth state...');
      await signOut(auth);
      
      // Clear any stored auth data
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might be related to Firebase auth
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('firebase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          console.log('🗑️ Removing localStorage key:', key);
          localStorage.removeItem(key);
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        console.log('✅ Auth state cleared');
        alert('Authentication state cleared. Please refresh the page and log in again.');
      }
    } catch (error) {
      console.error('❌ Error clearing auth state:', error);
    }
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
      
      // Apply area preference filter
      const filteredVostcards = filterVostcardsByArea(postedVostcardsData);
      console.log(`📍 Filtered to ${filteredVostcards.length} vostcards for area: ${mapAreaPreference}`);
      
      setVostcards(filteredVostcards);
      setRetryCount(0); // Reset retry count on success
      setLastUpdateTime(Date.now());
      
    } catch (error) {
      console.error('Error loading Vostcards:', error);
      setMapError('Failed to load vostcards from the map');
    } finally {
      setLoadingVostcards(false);
    }
  };
 
  // Get user location with error handling
  useEffect(() => {
    // Don't get user location if we have a browse location from navigation or single vostcard
    if (browseLocationState || singleVostcard || browseLocation) {
      console.log('🗺️ Skipping user location acquisition - browse location or single vostcard detected');
      return;
    }

    const getUserLocation = () => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported by this browser');
        setMapError('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          console.log('📍 User location acquired:', location);
          setUserLocation(location);
        },
        (err) => {
          console.error('Error getting location', err);
          setMapError('Could not get your location. Please enable location services.');
        },
        { 
          enableHighAccuracy: false, // Faster, still accurate enough for our needs
          timeout: 5000,  // Shorter timeout
          maximumAge: 600000  // Cache location for 10 minutes
        }
      );
    };

    getUserLocation();
  }, [browseLocationState, singleVostcard, browseLocation]); // Add browseLocationState and singleVostcard as dependency

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

  // Handle area preference change
  const handleAreaPreferenceChange = (area: 'nearby' | '1-mile' | '5-miles' | 'custom' | 'search') => {
    setMapAreaPreference(area);
    setShowAreaSelector(false);
    if (area === 'custom') {
      setShowDistanceSlider(true);
    } else {
      setShowDistanceSlider(false);
      loadVostcards(true); // Reload vostcards with new preference
    }
  };

  // Handle custom distance change
  const handleCustomDistanceChange = (distance: number) => {
    setCustomDistance(distance);
    loadVostcards(true); // Reload vostcards with new distance
  };

  // Filter vostcards based on area preference
  const filterVostcardsByArea = (vostcards: any[]) => {
    if (!userLocation) return vostcards;

    switch (mapAreaPreference) {
      case 'nearby':
        // Show vostcards within 5km of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(
            userLocation[0], userLocation[1],
            lat, lng
          );
          return distance <= 5; // 5km radius
        });
      
      case '1-mile':
        // Show vostcards within 1 mile of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(
            userLocation[0], userLocation[1],
            lat, lng
          );
          return distance <= 1; // 1 mile radius
        });
      
      case '5-miles':
        // Show vostcards within 5 miles of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(
            userLocation[0], userLocation[1],
            lat, lng
          );
          return distance <= 5; // 5 miles radius
        });
      
      case 'custom':
        // Show vostcards within the custom distance of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(
            userLocation[0], userLocation[1],
            lat, lng
          );
          return distance <= customDistance;
        });
      
      default:
        return vostcards;
    }
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
      // Close area selector when clicking outside
      if (showAreaSelector && !target.closest('[data-area-selector]')) {
        setShowAreaSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, showAreaSelector]);

  const menuItems = [
    { label: 'Browse Area', route: '/browse-area' },
    { label: 'My Private Vōstcards', route: '/edit-my-vostcards' },  // Fix the route to match App.tsx
    { label: 'My Posted Vōstcards', route: '/my-posted-vostcards' },
    { label: 'Liked Vōstcards', route: '/liked-vostcards' },
    { label: 'Following', route: '/following' },
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
  const filteredVostcards = singleVostcard ? [singleVostcard] : filterVostcardsByCategory(filterVostcardsByArea(vostcards));

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
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
        position: 'relative',
        marginTop: '80px'
      }}>
        {/* Show loading state if not authenticated */}
        {(!user && loading) ? (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            zIndex: 999
          }}>
            <div style={{
              background: 'rgba(0,43,77,0.9)',
              color: 'white',
              padding: '20px 30px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              Loading...
            </div>
          </div>
        ) :
          <>
            {/* Hide the list view/offers/area buttons when in single vostcard mode */}
            {!singleVostcard && (
              <div
                style={{
                  position: 'fixed',
                  top: '96px',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  zIndex: 1002,
                  padding: '0 16px'
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
                <button
                  type="button"
                  onClick={() => setShowAreaSelector(!showAreaSelector)}
                  style={{
                    ...listViewButton,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '48px',
                    fontSize: '16px',
                    textAlign: 'center',
                  }}
                >
                  {mapAreaPreference === 'nearby' && '🚶 Nearby'}
                  {mapAreaPreference === '1-mile' && '🏃 1 Mile'}
                  {mapAreaPreference === '5-miles' && '🏃 5 Miles'}
                  {mapAreaPreference === 'custom' && `🔍 ${customDistance} Mile${customDistance !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}

            {/* Area Selector Dropdown and Custom Distance Slider - Only show when not in single vostcard mode */}
            {!singleVostcard && (showAreaSelector || showDistanceSlider) && (
              <div
                style={{
                  position: 'fixed',
                  top: '150px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1003
                }}
                data-area-selector
              >
                {/* Custom Distance Slider */}
                {showDistanceSlider && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    padding: '16px',
                    minWidth: '200px',
                  }}>
                    <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                        Custom Distance
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {customDistance} mile{customDistance !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={customDistance}
                      onChange={(e) => handleCustomDistanceChange(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: '#e0e0e0',
                        outline: 'none',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                    />
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '10px', 
                      color: '#666',
                      marginTop: '4px'
                    }}>
                      <span>0.5 mi</span>
                      <span>10 mi</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowDistanceSlider(false);
                        setMapAreaPreference('custom');
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#002B4D',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px',
                        marginTop: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}
                {/* Area Options Dropdown */}
                {showAreaSelector && !showDistanceSlider && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    padding: '8px 0',
                    minWidth: '140px',
                  }}>
                    {[
                      { key: 'nearby', label: '🚶 Nearby', description: 'Within 5km' },
                      { key: '1-mile', label: '🏃 1 Mile', description: 'Within 1 mile' },
                      { key: '5-miles', label: '🏃 5 Miles', description: 'Within 5 miles' },
                      { key: 'custom', label: '🔍 Custom', description: 'Custom distance' }
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => handleAreaPreferenceChange(option.key as any)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: mapAreaPreference === option.key ? '#002B4D' : '#333',
                          fontWeight: mapAreaPreference === option.key ? '600' : '400',
                          borderBottom: '1px solid #f0f0f0'
                        }}
                      >
                        <div style={{ fontWeight: '600' }}>{option.label}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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

                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>Your Location</Popup>
                  </Marker>

                  {filteredVostcards.map((v: any) => {
                    const lat = v.latitude || v.geo?.latitude;
                    const lng = v.longitude || v.geo?.longitude;
                    if (!lat || !lng) return null;
                    return (
                      <Marker
                        key={v.id}
                        position={[lat, lng]}
                        icon={getVostcardIcon(v.isOffer)}
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
                  <RecenterControl userLocation={userLocation} />
                  <MapCenter userLocation={userLocation} />
                </MapContainer>
              )}
            </div>

            {/* Create Vostcard Button - Always visible */}
            <div style={{
              position: 'fixed',
              bottom: '40px',
              right: '16px', // Right justify
              zIndex: 1002
            }}>
              <button
                type="button"
                onClick={handleCreateVostcard}
                style={{
                  backgroundColor: '#002B4D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '15px 25px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'auto'
                }}
              >
                Create a Vōstcard
              </button>
            </div>

            {/* Menu overlay */}
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
        }
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
      <button
        className="filter-fab"
        style={{
          position: 'fixed',
          bottom: '40px', // Match the Create button level
          left: '16px',   // Left justify
          zIndex: 1002,
          background: '#002B4D',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          pointerEvents: 'auto' as const,
          transition: 'transform 0.1s ease'
        }}
        onClick={() => setShowFilterModal(true)}
      >
        <FaFilter style={{ fontSize: '22px', marginRight: '8px' }} /> Filter
      </button>

      {/* Filter Modal (to be implemented next) */}
      {showFilterModal && (
        <div className="filter-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="filter-modal" style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px 24px',
            minWidth: '280px',
            maxWidth: '90vw',
            boxShadow: '0 4px 32px rgba(0,0,0,0.2)',
            color: '#002B4D',
            position: 'relative',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '18px', fontSize: '22px', fontWeight: 700 }}>Filter by Category</h2>
            {/* Category checkboxes will go here */}
            <div style={{ marginBottom: '24px' }}>
              {availableCategories.map((cat) => (
                <label key={cat} style={{ display: 'block', marginBottom: '10px', fontSize: '18px', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => {
                      if (selectedCategories.includes(cat)) {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat));
                      } else {
                        setSelectedCategories([...selectedCategories, cat]);
                      }
                    }}
                    style={{ marginRight: '10px', transform: 'scale(1.3)' }}
                  />
                  {cat}
                </label>
              ))}
            </div>
            <button
              style={{
                width: '100%',
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '8px',
              }}
              onClick={() => setShowFilterModal(false)}
            >
              Apply Filter
            </button>
            <button
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: '28px',
                color: '#888',
                cursor: 'pointer',
              }}
              onClick={() => setShowFilterModal(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Styles with proper z-index hierarchy and better organization

const containerStyle = {
  height: '100vh',
  width: '100vw',
  position: 'relative' as const,
  overflow: 'hidden',
  backgroundColor: '#f5f5f5' // Add a light background to fill the space
};

const headerStyle = {
  position: 'absolute' as const,
  top: 0, // Moved back to top from 95
  left: 0,
  right: 0,
  height: '70px',
  backgroundColor: '#002B4D',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  zIndex: 100,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const logoContainerStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
};

const logoStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: 0,
  lineHeight: 1,
};

const updateIndicatorStyle = {
  fontSize: '12px',
  opacity: 0.8,
  marginTop: '2px',
  color: 'rgba(255,255,255,0.9)'
};

const headerRight = {
  display: 'flex',
  alignItems: 'center',
};

const avatarContainerStyle = {
  marginRight: 20,
  cursor: 'pointer',
  width: 60,
  height: 60,
  borderRadius: '50%',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255,255,255,0.2)'
};

const avatarImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  borderRadius: '50%',
};

const menuStyle = {
  position: 'fixed' as const,
  top: 80, // Align with bottom of header
  right: 16, // Match header padding
  background: 'white',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  borderRadius: 12,
  zIndex: 2000, // Higher than other UI elements
  minWidth: 220,
  maxHeight: 'calc(100vh - 100px)', // Prevent extending beyond screen
  overflowY: 'auto' as const,
  padding: '10px 0',
};

const menuItemStyle = {
  padding: '16px 24px', // Increased padding to accommodate larger font
  cursor: 'pointer',
  fontSize: 22, // Increased from 16 to 22
  color: '#002B4D',
  borderBottom: '1px solid #f0f0f0',
  transition: 'background-color 0.2s ease',
  userSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
  background: 'none',
  border: 'none',
  outline: 'none',
  fontWeight: 500, // Added to make text more visible
  width: '100%',
  textAlign: 'left',
  ':hover': {
    backgroundColor: '#f5f5f5'
  }
};

export default HomeView;