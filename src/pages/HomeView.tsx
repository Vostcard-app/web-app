import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow } from 'react-icons/fa';
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
  pointerEvents: 'auto',
  transition: 'transform 0.1s ease',
  ':active': {
    transform: 'scale(0.98)'
  }
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
  bottom: '25%', // 1/4 up from bottom
  left: 20,
  zIndex: 1000,
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
  const { deleteVostcardsWithWrongUsername, clearVostcard } = useVostcard();
  const { user, username, userID, userRole, loading } = useAuth();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingVostcards, setLoadingVostcards] = useState(true);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showAuthLoading, setShowAuthLoading] = useState(true);
  const [mapAreaPreference, setMapAreaPreference] = useState<'my-area' | 'nearby' | 'popular' | 'recent'>('my-area');
  const [showAreaSelector, setShowAreaSelector] = useState(false);

  // Check for fresh load state from navigation
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
    try {
      setLoadingVostcards(true);
      setMapError(null);
      
      if (forceRefresh) {
        console.log('🔄 Force refreshing vostcards after posting');
      }
      
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
  }, []);

  // Load vostcards on mount and when fresh load is requested
  useEffect(() => {
    loadVostcards(true); // Always force refresh on mount
  }, []);

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
  const handleAreaPreferenceChange = (area: 'my-area' | 'nearby' | 'popular' | 'recent') => {
    setMapAreaPreference(area);
    setShowAreaSelector(false);
    loadVostcards(true); // Reload vostcards with new preference
  };

  // Filter vostcards based on area preference
  const filterVostcardsByArea = (vostcards: any[]) => {
    if (!userLocation) return vostcards;

    switch (mapAreaPreference) {
      case 'my-area':
        // Show all vostcards (current behavior)
        return vostcards;
      
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
      
      case 'popular':
        // Show vostcards sorted by likes/ratings (for now, just show all)
        return vostcards.sort((a, b) => {
          const aLikes = a.likeCount || 0;
          const bLikes = b.likeCount || 0;
          return bLikes - aLikes;
        });
      
      case 'recent':
        // Show vostcards sorted by creation date (most recent first)
        return vostcards.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      
      default:
        return vostcards;
    }
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
    { label: 'My Private Vōstcards', route: '/edit-my-vostcards' },  // Fix the route to match App.tsx
    { label: 'My Posted Vōstcards', route: '/my-posted-vostcards' },
    { label: 'Liked Vōstcards', route: '/liked-vostcards' },
    { label: 'Following', route: '/following' },
    { label: 'Suggestion Box', route: '/suggestion-box' },
    { label: 'Report a Bug', route: '/report-bug' },
    { label: 'Account Settings', route: '/account-settings' },
    { label: 'Logout', route: null },
  ];

  const handleMenuItemClick = (label: string, route: string | null) => {
    setIsMenuOpen(false);
    
    if (label === 'Logout') {
      handleLogout();
    } else if (route) {
      console.log(`🔄 Navigating to: ${route}`);
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
        <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>Vōstcard</div>
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
                  width: 55,  // Changed from 40 to 55
                  height: 55, // Changed from 40 to 55
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
                onError={() => setUserAvatar(null)}
              />
            ) : (
              <FaUserCircle size={55} color="white" /> // Changed from 40 to 55
            )}
          </div>
          <FaBars
            size={55} // Changed from 30 to 55
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
        marginTop: '80px' // Add margin to account for fixed header
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
        ) : (
          // Rest of the content (map, buttons, etc.)
          <>
            {/* List View and Offers Buttons - Always visible */}
            <div style={listViewButtonContainerLeft}>
              <button 
                type="button"
                style={listViewButton} 
                onClick={handleListViewClick}
              >
                List View
              </button>
            </div>
            <div style={listViewButtonContainerRight}>
              <button 
                type="button"
                style={listViewButton} 
                onClick={handleOffersClick}
              >
                Offers
              </button>
            </div>

            {/* Area Preference Selector */}
            <div 
              style={{
                position: 'fixed',
                top: '96px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1002
              }}
              data-area-selector
            >
              <button
                type="button"
                onClick={() => setShowAreaSelector(!showAreaSelector)}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>📍 {mapAreaPreference.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span style={{ fontSize: '12px' }}>▼</span>
              </button>

              {/* Area Info Panel */}
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginTop: '4px',
                whiteSpace: 'nowrap',
                zIndex: 1003
              }}>
                {vostcards.length} Vōstcards shown
              </div>

              {/* Area Options Dropdown */}
              {showAreaSelector && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  padding: '8px 0',
                  marginTop: '4px',
                  minWidth: '140px',
                  zIndex: 1003
                }}>
                  {[
                    { key: 'my-area', label: '📍 My Area', description: 'All Vōstcards' },
                    { key: 'nearby', label: '🚶 Nearby', description: 'Within 5km' },
                    { key: 'popular', label: '⭐ Popular', description: 'Most liked' },
                    { key: 'recent', label: '🕒 Recent', description: 'Latest posts' }
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

                  {vostcards.map(v => {
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
              left: '50%',
              transform: 'translateX(-50%)',
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
  },
  ':active': {
    backgroundColor: '#e8e8e8'
  }
};

export default HomeView;