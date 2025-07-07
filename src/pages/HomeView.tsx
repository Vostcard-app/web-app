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
  iconSize: [100, 100],
  iconAnchor: [50, 100],
  popupAnchor: [0, -100],
});

const offerIcon = new L.Icon({
  iconUrl: OfferPin,
  iconSize: [100, 100],
  iconAnchor: [50, 100],
  popupAnchor: [0, -100],
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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

  // No complex refresh state management needed

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
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 
        }
      );
    };

    getUserLocation();
  }, []);

  // Load vostcards on mount
  useEffect(() => {
    loadVostcards();
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

  const handleCreateVostcard = () => {
    clearVostcard();
    navigate('/create-step1');
  };

  const handleRetryLoad = () => {
    setRetryCount(prev => prev + 1);
    loadVostcards(true);
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
    { label: 'My Private Vōstcards', route: '/edit-my-vostcards' },
    { label: 'My Posted Vōstcards', route: '/my-posted-vostcards' },
    { label: 'Liked Vōstcards', route: '/liked-vostcards' },
    { label: 'Following', route: '/following' },
    { label: 'Suggestion Box', route: '/suggestion-box' },
    { label: 'Report a Bug', route: '/report-bug' },
    { label: 'Account Settings', route: '/account-settings' },
    { label: 'Logout', route: null },
  ];

  // Format last update time for display
  const formatLastUpdate = () => {
    const secondsAgo = Math.floor((Date.now() - lastUpdateTime) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={logoContainerStyle}>
          <h1 style={logoStyle}>Vōstcard</h1>
          {/* Small update indicator */}
          <div style={updateIndicatorStyle}>
            {vostcards.length} • {formatLastUpdate()}
          </div>
        </div>
        <div style={headerRight}>
          {/* User Avatar */}
          <div
            style={avatarContainerStyle}
            onClick={() => {
              if (user?.uid) {
                navigate(`/profile/${user.uid}`);
              }
            }}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="User Avatar"
                style={avatarImageStyle}
                onError={() => setUserAvatar(null)} // Fallback if image fails to load
              />
            ) : (
              <FaUserCircle size={60} color="white" />
            )}
          </div>
          <FaBars
            size={30}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Hamburger Menu */}
      {isMenuOpen && (
        <div style={menuStyle} data-menu role="menu" aria-label="Main menu">
          {menuItems.map(({ label, route }) => (
            <div
              key={label}
              style={menuItemStyle}
              onClick={() => {
                setIsMenuOpen(false);
                if (label === 'Logout') {
                  handleLogout();
                } else if (route) {
                  navigate(route);
                }
              }}
              role="menuitem"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsMenuOpen(false);
                  if (label === 'Logout') {
                    handleLogout();
                  } else if (route) {
                    navigate(route);
                  }
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* List View Button */}
      <div style={listViewButtonContainer}>
        <button style={listViewButton} onClick={() => navigate('/all-posted-vostcards')}>
          List View
        </button>
      </div>

      {/* Map Container */}
      <div style={mapContainerStyle}>
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
            style={{ height: '100%', width: '100%' }} 
            zoomControl={false}
          >
            <TileLayer 
              attribution="&copy; OpenStreetMap contributors" 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
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
                      console.log("📍 Navigating to Vostcard detail view for ID:", v.id);
                      navigate(`/vostcard/${v.id}`);
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

      {/* Debug Section - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={debugStyle}>
          <div><strong>Auth Debug:</strong></div>
          <div>User: {user ? '✅' : '❌'}</div>
          <div>Username: {username || 'N/A'}</div>
          <div>UserID: {userID || 'N/A'}</div>
          <div>Role: {userRole || 'N/A'}</div>
          <div>Loading: {loading ? '🔄' : '✅'}</div>
          <div>Auth Current: {auth.currentUser ? '✅' : '❌'}</div>
          <div>Vostcards: {vostcards.length}</div>
          <div>Last Update: {formatLastUpdate()}</div>
          <button onClick={clearAuthState} style={debugButtonStyle}>
            Clear Auth State
          </button>
        </div>
      )}

      {/* Create Vostcard Button */}
      <div style={createButtonContainer}>
        <button style={createButton} onClick={handleCreateVostcard}>
          Create a Vōstcard
        </button>
      </div>
    </div>
  );
};

// Enhanced Styles with proper z-index hierarchy and better organization

const containerStyle = {
  height: '100vh',
  width: '100vw',
  position: 'relative' as const,
  overflow: 'hidden'
};

const headerStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  height: '70px',
  backgroundColor: '#002B4D',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  zIndex: 100, // High priority UI element
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
  position: 'absolute' as const,
  top: 70,
  right: 0,
  background: 'white',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  borderRadius: '0 0 10px 10px',
  zIndex: 101, // Just above header
  minWidth: 220,
  padding: '10px 0',
};

const menuItemStyle = {
  padding: '12px 24px',
  cursor: 'pointer',
  fontSize: 16,
  color: '#002B4D',
  borderBottom: '1px solid #f0f0f0',
  background: 'transparent',
  transition: 'background-color 0.2s ease'
};

const listViewButtonContainer = {
  position: 'absolute' as const,
  top: 80,
  left: 20,
  zIndex: 20, // UI controls layer
};

const listViewButton = {
  background: '#007aff',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'opacity 0.2s ease'
};

const mapContainerStyle = {
  position: 'absolute' as const,
  top: 70,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1, // Base layer
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
  top: 70,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255,255,255,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50, // Above map but below critical UI
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
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20, // UI controls layer
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
  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
};

const zoomControlStyle = {
  position: 'absolute' as const,
  top: 100,
  right: 20,
  zIndex: 10, // Map controls layer
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
};

const zoomButton = {
  background: '#fff',
  color: '#002B4D',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 10,
  fontSize: 18,
  cursor: 'pointer',
  marginBottom: 4,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'opacity 0.2s ease'
};

const recenterControlStyle = {
  position: 'absolute' as const,
  top: 180,
  right: 20,
  zIndex: 10, // Map controls layer
};

const offerPopupStyle = {
  background: '#f8f9fa',
  borderRadius: 8,
  padding: '8px 12px',
  margin: '8px 0',
  color: '#333',
  fontSize: 15,
};

export default HomeView;