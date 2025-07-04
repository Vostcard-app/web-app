import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import { signOut } from 'firebase/auth';

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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
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
  const { deleteVostcardsWithWrongUsername, clearVostcard } = useVostcard();
  const { user, username, userID, userRole, loading } = useAuth();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingVostcards, setLoadingVostcards] = useState(true);

  // Debug authentication state
  useEffect(() => {
    console.log('🏠 HomeView: Auth state:', {
      user: !!user,
      username,
      userID,
      userRole,
      loading,
      authCurrentUser: !!auth.currentUser
    });
  }, [user, username, userID, userRole, loading]);

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

  const loadVostcards = async () => {
    try {
      setLoadingVostcards(true);
      const q = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
      const querySnapshot = await getDocs(q);
      const postedVostcardsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVostcards(postedVostcardsData);
    } catch (error) {
      console.error('Error loading Vostcards:', error);
    } finally {
      setLoadingVostcards(false);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      err => console.error('Error getting location', err),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    loadVostcards();
  }, []);

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
      loadVostcards();
    } catch (error) {
      console.error('Error adding coordinates:', error);
      alert('Error adding coordinates. Check console for details.');
    }
  };

  useEffect(() => {
    const handleFocus = () => loadVostcards();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleCreateVostcard = () => {
    clearVostcard();
    navigate('/create-step1');
  };

  const menuItems = [
    { label: 'My Private Vōstcards', route: '/my-private-vostcards' },
    { label: 'My Posted Vōstcards', route: '/my-posted-vostcards' },
    { label: 'Edit My Vōstcards', route: '/edit-my-vostcards' },
    { label: 'Liked Vōstcard', route: '/liked-vostcards' },
    { label: 'Following', route: '/following' },
    { label: 'Suggestion Box', route: '/suggestion-box' },
    { label: 'Report a Bug', route: '/report-bug' },
    { label: 'Account Settings', route: '/account-settings' },
    { label: 'Logout', route: null },
  ];

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={logoStyle}>Vōstcard</h1>
        <div style={headerRight}>
          <FaUserCircle size={30} style={{ marginRight: 20 }} />
          <FaBars
            size={30}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Hamburger Menu */}
      {isMenuOpen && (
        <div style={menuStyle} role="menu" aria-label="Main menu">
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

      {/* Loading Indicator */}
      {loading && (
        <div style={loadingStyle}>
          Loading Vostcards...
        </div>
      )}

      {/* Debug Section - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          <div><strong>Auth Debug:</strong></div>
          <div>User: {user ? '✅' : '❌'}</div>
          <div>Username: {username || 'N/A'}</div>
          <div>UserID: {userID || 'N/A'}</div>
          <div>Role: {userRole || 'N/A'}</div>
          <div>Loading: {loading ? '🔄' : '✅'}</div>
          <div>Auth Current: {auth.currentUser ? '✅' : '❌'}</div>
          <div>Vostcards: {vostcards.length}</div>
          <button 
            onClick={clearAuthState}
            style={{
              background: '#ff4444',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              marginTop: '5px',
              fontSize: '10px'
            }}
          >
            Clear Auth State
          </button>
        </div>
      )}

      {/* Map */}
      {userLocation && (
        <MapContainer center={userLocation} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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

      {/* Create Vostcard Button */}
      <div style={createButtonContainer}>
        <button style={createButton} onClick={handleCreateVostcard}>
          Create a Vōstcard
        </button>
      </div>
    </div>
  );
};

// Styles

const headerStyle = {
  position: 'absolute' as 'absolute',
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
  zIndex: 1000,
};

const logoStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: 0,
};

const headerRight = {
  display: 'flex',
  alignItems: 'center',
};

const listViewButtonContainer = {
  position: 'absolute' as 'absolute',
  top: '80px',
  left: '20px',
  zIndex: 1000,
};

const listViewButton = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '14px',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
};

const zoomControlStyle = {
  position: 'absolute' as 'absolute',
  bottom: '20%',
  right: '20px',
  transform: 'translateY(-100px)',
  display: 'flex',
  flexDirection: 'column' as 'column',
  gap: '10px',
  zIndex: 1000,
};

const recenterControlStyle = {
  position: 'absolute' as 'absolute',
  bottom: '20%',
  right: '20px',
  transform: 'translateY(40px)',
  zIndex: 1000,
};

const zoomButton = {
  backgroundColor: 'white',
  border: 'none',
  borderRadius: '8px',
  width: '45px',
  height: '45px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  cursor: 'pointer',
};

const createButtonContainer = {
  position: 'absolute' as 'absolute',
  bottom: '20px',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 1000,
};

const createButton = {
  padding: '15px 25px',
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '18px',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
};

const menuStyle = {
  position: 'absolute' as 'absolute',
  top: '70px',
  right: '20px',
  backgroundColor: 'white',
  border: '1px solid #ccc',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  padding: '8px 0',
  minWidth: '220px',
  zIndex: 1001,
  color: '#333',
  fontSize: '14px',
};

const menuItemStyle = {
  cursor: 'pointer',
  margin: '0',
  fontSize: '14px',
  padding: '12px 16px',
  borderRadius: '0',
  transition: 'background-color 0.2s',
  border: 'none',
  backgroundColor: 'transparent',
  width: '100%',
  textAlign: 'left' as 'left',
  display: 'block',
  color: '#333',
};

const loadingStyle = {
  position: 'absolute' as 'absolute',
  top: '80px',
  right: '20px',
  backgroundColor: 'rgba(0,0,0,0.7)',
  color: 'white',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  zIndex: 1000,
};

const offerPopupStyle = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffeaa7',
  borderRadius: '4px',
  padding: '8px',
  margin: '8px 0'
};

export default HomeView;