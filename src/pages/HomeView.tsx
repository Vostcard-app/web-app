import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext'; // ✅ Import context
import { db, auth } from '../firebaseConfig.ts';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

// 🔥 Vostcard Pin - Custom Vostcard pin
const vostcardIcon = new L.Icon({
  iconUrl: '/Vostcard_pin.svg', // Custom Vostcard pin (SVG)
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

// 🔥 Example Vostcards (temporary)
const exampleVostcards = [
  {
    id: '1',
    title: 'Golden Gate',
    description: 'Beautiful view of the bridge.',
    latitude: 37.8199,
    longitude: -122.4783,
  },
  {
    id: '2',
    title: 'Central Park',
    description: 'Relaxing in the park.',
    latitude: 40.7851,
    longitude: -73.9683,
  },
];

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

// Function to get the appropriate Vostcard icon (with fallback)
const getVostcardIcon = () => {
  // Check if custom pin exists by trying to load it
  const img = new Image();
  img.onload = () => {
    console.log('Custom Vostcard pin loaded successfully');
  };
  img.onerror = () => {
    console.log('Custom Vostcard pin not found, using fallback');
  };
  img.src = '/Vostcard_pin.svg';
  
  // For now, always use custom pin (fallback will be handled by browser)
  return vostcardIcon;
};

const HomeView = () => {
  const navigate = useNavigate();
  const { clearVostcard } = useVostcard();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [vostcards, setVostcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Vostcards from Firebase
  const loadVostcards = async () => {
    try {
      setLoading(true);
      console.log('Loading Vostcards from Firebase...');
      
      // Query for Vostcards with state: "posted" (matching iOS app)
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
      
      // Debug each Vostcard's fields
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

  // Load Vostcards when component mounts
  useEffect(() => {
    loadVostcards();
  }, []);

  // Function to manually add coordinates to a Vostcard (for testing)
  const addCoordinatesToVostcard = async (vostcardId: string, lat: number, lng: number) => {
    try {
      const currentUser = auth.currentUser;
      console.log('Current user:', currentUser?.uid);
      
      // Find the Vostcard to check ownership
      const vostcard = vostcards.find(v => v.id === vostcardId);
      if (!vostcard) {
        console.error('Vostcard not found');
        return;
      }
      
      console.log('Vostcard owner:', vostcard.userID || vostcard.userId);
      console.log('Current user:', currentUser?.uid);
      
      // Check if current user owns this Vostcard
      const isOwner = (vostcard.userID || vostcard.userId) === currentUser?.uid;
      console.log('Is owner:', isOwner);
      
      if (!isOwner) {
        console.error('Cannot update Vostcard: not the owner');
        alert('You can only update your own Vostcards. This Vostcard belongs to another user.');
        return;
      }
      
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await updateDoc(vostcardRef, {
        latitude: lat,
        longitude: lng,
        geo: { latitude: lat, longitude: lng }
      });
      console.log(`Added coordinates to Vostcard ${vostcardId}:`, { lat, lng });
      loadVostcards(); // Reload the Vostcards
    } catch (error) {
      console.error('Error adding coordinates:', error);
      alert('Error adding coordinates. Check console for details.');
    }
  };

  // Refresh Vostcards when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      loadVostcards();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleCreateVostcard = () => {
    // Don't clear the Vostcard context here - let it persist through the creation flow
    // Only clear when starting a completely new Vostcard or when explicitly needed
    console.log('🎬 Starting Vostcard creation - preserving existing context data');
    navigate('/create-step1');
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* 🔵 Header */}
      <div style={headerStyle}>
        <h1 style={logoStyle}>Vōstcard</h1>
        <div style={headerRight}>
          <FaUserCircle size={30} style={{ marginRight: 20 }} />
          <FaBars size={30} />
        </div>
      </div>

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
      
      {!loading && (
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
          {vostcards.length} posted Vostcards
          <br />
          (state: "posted")
          <br />
          <button 
            onClick={() => {
              // Add coordinates to the first Vostcard for testing
              if (vostcards.length > 0) {
                const vostcard = vostcards[0];
                const currentUser = auth.currentUser;
                const isOwner = (vostcard.userID || vostcard.userId) === currentUser?.uid;
                
                console.log('Attempting to add coordinates to:', {
                  vostcardId: vostcard.id,
                  title: vostcard.title,
                  owner: vostcard.userID || vostcard.userId,
                  currentUser: currentUser?.uid,
                  isOwner
                });
                
                if (userLocation && isOwner) {
                  addCoordinatesToVostcard(vostcard.id, userLocation[0], userLocation[1]);
                } else if (!isOwner) {
                  alert('This Vostcard belongs to another user. You can only update your own Vostcards.');
                } else {
                  alert('Location not available. Please enable location services.');
                }
              }
            }}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '10px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            Add Coords to First
          </button>
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
            // Handle different coordinate formats
            const lat = v.latitude || v.geo?.latitude;
            const lng = v.longitude || v.geo?.longitude;
            
            console.log('Rendering Vostcard:', {
              id: v.id,
              title: v.title,
              lat,
              lng,
              hasCoordinates: !!(lat && lng)
            });
            
            if (!lat || !lng) {
              console.log('Vostcard missing coordinates:', v);
              return null;
            }
            
            return (
              <Marker
                key={v.id}
                position={[lat, lng]}
                icon={getVostcardIcon()}
              >
                <Popup>
                  <h3>{v.title}</h3>
                  <p>{v.description}</p>
                  {v.categories && v.categories.length > 0 && (
                    <p><strong>Categories:</strong> {v.categories.join(', ')}</p>
                  )}
                  <p><small>Posted at: {v.createdAt?.toDate?.() || 'Unknown'}</small></p>
                </Popup>
              </Marker>
            );
          })}

          {/* ➕ Zoom & Recenter Controls */}
          <ZoomControls />
          <RecenterControl userLocation={userLocation} />

          {/* 🗺️ Map Center */}
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

export default HomeView;