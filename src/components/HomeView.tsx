import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserCircle, FaPlus, FaMinus, FaLocationArrow } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext'; // ✅ Import context

// 🔥 Vostcard Pin
const vostcardIcon = new L.Icon({
  iconUrl: '/Vostcard_pin.png',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
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

const HomeView = () => {
  const navigate = useNavigate();
  const { setVideo } = useVostcard(); // ✅ Grab setVideo from context
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        if (map) {
          map.setView(loc, 16);
        }
      },
      (err) => {
        console.error('Error getting location', err);
      },
      { enableHighAccuracy: true }
    );
  }, [map]);

  const handleCreateVostcard = () => {
    setVideo(null); // ✅ Clear previous video
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

      {/* 🗺️ Map */}
      {userLocation && (
        <MapContainer
          center={userLocation}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          whenCreated={setMap}
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
          {exampleVostcards.map((v) => (
            <Marker
              key={v.id}
              position={[v.latitude, v.longitude]}
              icon={vostcardIcon}
            >
              <Popup>
                <h3>{v.title}</h3>
                <p>{v.description}</p>
              </Popup>
            </Marker>
          ))}

          {/* ➕ Zoom & Recenter Controls */}
          <ZoomControls />
          <RecenterControl userLocation={userLocation} />
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