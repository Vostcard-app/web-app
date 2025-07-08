import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdvertiserPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <>
      <div style={{
        width: '100%',
        backgroundColor: '#002B4D',
        color: 'white',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
      }}>
        <span>Vōstcard Advertiser Portal</span>
        <button
          onClick={() => {
            // sign out the user and navigate to login
            import('../firebase/firebaseConfig').then(({ auth }) => {
              auth.signOut().then(() => {
                navigate('/login');
              });
            });
          }}
          style={{
            backgroundColor: '#ff4d4f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Log Out
        </button>
      </div>
      <div style={{ maxWidth: "900px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ textAlign: "center", color: "#002B4D" }}>Advertiser Portal</h1>

        {/* Store Profile Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#002B4D' }}>
            Store Profile
          </h2>
          <img
            src={user?.photoURL || '/default-store.png'}
            alt="Store Profile"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '12px',
              marginBottom: '12px',
              border: '2px solid #002B4D'
            }}
          />
          <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
            Update your store profile details to ensure your offers appear correctly in the app.
          </p>
          <button
            onClick={async () => {
              if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser.');
                return;
              }
              navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`);
                  const data = await response.json();
                  if (data.results && data.results[0]) {
                    const formattedAddress = data.results[0].formatted_address;
                    alert(`Detected location: ${formattedAddress}\n\nYou can now update your profile with this address.`);
                    // Optionally navigate to store profile page and pre-fill the address
                    navigate('/store-profile-page', { state: { detectedAddress: formattedAddress, lat: latitude, lng: longitude } });
                  } else {
                    alert('Unable to find address for current location.');
                  }
                } catch (error) {
                  console.error('Geocoding error:', error);
                  alert('Failed to fetch address from location.');
                }
              }, (error) => {
                console.error('Geolocation error:', error);
                alert('Failed to get current location.');
              });
            }}
            style={{
              marginTop: '12px',
              marginBottom: '12px',
              padding: '10px 18px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            📍 Use My Location
          </button>
          <button
            onClick={() => navigate('/store-profile-page')}
            style={{
              marginTop: '16px',
              padding: '12px 20px',
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Update Store Profile
          </button>
        </div>

        {/* Create Offer Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#28a745' }}>
            Create an Offer
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
            You must update your profile before creating an offer.
          </p>
          <button
            onClick={() => navigate('/create-offer')}
            style={{
              marginTop: '16px',
              padding: '12px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Create Offer
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px" }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            flex: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Total Views</h3>
            <p>0</p>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            flex: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Total Likes</h3>
            <p>0</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#002B4D' }}>Recent Activity</h2>
          <p>No recent activity yet.</p>
        </div>
      </div>
    </>
  );
};

export default AdvertiserPortal;
