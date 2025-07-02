import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext'; // ✅ Import context
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import VostcardPin from '../assets/Vostcard_pin.png'; // Import the custom pin
import OfferPin from '../assets/Offer_pin.png'; // Import the offer pin
import { signOut } from 'firebase/auth';


// 🔥 Vostcard Pin - Custom Vostcard pin
const vostcardIcon = new L.Icon({
  iconUrl: VostcardPin, // Use imported asset
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});

// 🎁 Offer Pin - Custom Offer pin
const offerIcon = new L.Icon({
  iconUrl: OfferPin, // Use imported asset
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});

// Fallback Vostcard Pin (red marker) - used if custom pin not found
const fallbackVostcardIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [0, -45],
});

// 🔵 User Location Pin
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [0, -45],
});

const ZoomControls = () => {
  const map = useMap();

  return (
    <div style={zoomControlStyle}>
      <button style={zoomButton} onClick={() => map.zoomIn()}>
        <FaPlus />
      </button>
      <button style={zoomButton} onClick={() => map.zoomOut()}>
        <FaMinus />
      </button>
    </div>
  );
};

const RecenterControl = ({ userLocation }: { userLocation: [number, number] | null }) => {
  const map = useMap();

  const recenter = () => {
    if (userLocation) {
      map.setView(userLocation, 16);
    }
  };

  return (
    <div style={recenterControlStyle}>
      <button style={zoomButton} onClick={recenter}>
        <FaLocationArrow />
      </button>
    </div>
  );
};

// Component to center map when user location changes
const MapCenter = ({ userLocation }: { userLocation: [number, number] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 16);
    }
  }, [userLocation, map]);

  return null;
};

// Helper to get the appropriate icon based on whether it's an offer
function getVostcardIcon(isOffer: boolean = false) {
  return isOffer ? offerIcon : vostcardIcon;
}

const HomeView = () => {
  const navigate = useNavigate();
  const { deleteVostcardsWithWrongUsername } = useVostcard();
  const { userRole } = useAuth();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Load Vostcards from Firebase
  const loadVostcards = async () => {
    try {
      setLoading(true);
      console.log('Loading Vostcards from Firebase...');
      
      const q = query(
        collection(db, 'vostcards'),
        where('state', '==', 'posted')
      );
      const querySnapshot = await getDocs(q);
      const postedVostcardsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Posted Vostcards in database:', postedVostcardsData);
      console.log('Total posted Vostcards in database:', postedVostcardsData.length);
      
      postedVostcardsData.forEach((v: any, index) => {
        console.log(`Vostcard ${index + 1} fields:`, {
          id: v.id,
          title: v.title,
          state: v.state,
          latitude: v.latitude,
          longitude: v.longitude,
          geo: v.geo,
          userID: v.userID,
          userId: v.userId,
          hasCoordinates: !!(v.latitude || v.geo?.latitude)
        });
      });
      
      setVostcards(postedVostcardsData);
    } catch (error) {
      console.error('Error loading Vostcards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
      },
      (err) => {
        console.error('Error getting location', err);
      },
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
    const handleFocus = () => {
      loadVostcards();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleCreateVostcard = () => {
    console.log('🎬 Starting Vostcard creation - clearing previous context data');
    navigate('/create-step1');
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* 🔵 Header */}
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
        <div style={menuStyle}>
          {[
            'My Private Vōstcards',
            'My Posted Vōstcards',
            'Edit My Vōstcards',
            'Liked Vōstcard',
            'Following',
            'Suggestion Box',
            'Report a Bug',
            'Account Settings',
            'Logout',
          ].map(item => (
            <p
              key={item}
              onClick={() => {
                console.log(`Clicked menu item: ${item}`);
                setIsMenuOpen(false);
                if (item === 'Logout') handleLogout();
                // Add navigation wiring here later
              }}
              style={menuItemStyle}
              role="menuitem"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  console.log(`Clicked menu item: ${item}`);
                  setIsMenuOpen(false);
                  if (item === 'Logout') handleLogout();
                }
              }}
            >
              {item}
            </p>
          ))}
        </div>
      )}

      {/* 🔲 List View Button */}
      <div style={listViewButtonContainer}>
        <button
          style={listViewButton}
          onClick={() => navigate('/list-view')}
        >
          List View
        </button>
      </div>

      {/* Debug Info */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 1000,
        }}>
          Loading Vostcards...
        </div>
      )}

      {/* 🗺️ Map */}
      {userLocation && (
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

          {/* 🔥 User location */}
          <Marker position={userLocation} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>

          {/* 🔥 Vostcards */}
          {vostcards.map((v) => {
            const lat = v.latitude || v.geo?.latitude;
            const lng = v.longitude || v.geo?.longitude;

            if (!lat || !lng) return null;

            return (
              <Marker
                key={v.id}
                position={[lat, lng]}
                icon={getVostcardIcon(v.isOffer)}
              >
                <Popup>
                  <h3>{v.title || 'Untitled'}</h3>
                  <p>{v.description || 'No description'}</p>
                  {v.isOffer && v.offerDetails?.discount && (
                    <div style={{
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      borderRadius: '4px',
                      padding: '8px',
                      margin: '8px 0'
                    }}>
                      <strong>🎁 Special Offer:</strong> {v.offerDetails.discount}
                      {v.offerDetails.validUntil && (
                        <div><small>Valid until: {v.offerDetails.validUntil}</small></div>
                      )}
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

      {/* ➕ Create Button */}
      <div style={createButtonContainer}>
        <button
          style={createButton}
          onClick={handleCreateVostcard}
        >
          Create a Vōstcard
        </button>
      </div>
    </div>
  );
};

export default HomeView;

/* 🎨 Styles */
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

const menuItemStyle = {
  cursor: 'pointer',
  margin: '8px 0',
  fontSize: '16px',
  padding: '8px 12px',
  borderRadius: '4px',
  transition: 'background-color 0.2s',
  // You might want to add hover styles via CSS or inline event handlers
};

const menuStyle = {
  position: 'absolute',
  top: '100%',
  right: 0,
  backgroundColor: 'white',
  border: '1px solid #ccc',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  padding: '10px 0',
  minWidth: '200px',
  zIndex: 1001,
};