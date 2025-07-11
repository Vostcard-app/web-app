import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdvertiserPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Prevent body scrolling
    }}>
      {/* Fixed Header */}
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
        flexShrink: 0, // Prevent header from shrinking
        zIndex: 10 // Keep header above scrolling content
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

      {/* Scrollable Content Area */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: '#f5f5f5', // Light background for better contrast
        WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
      }}>
        <div style={{ 
          maxWidth: "900px", 
          margin: "0 auto",
          paddingBottom: "40px" // Add bottom padding for last item
        }}>
          <h1 style={{ textAlign: "center", color: "#002B4D", margin: "0 0 24px 0" }}>Advertiser Portal</h1>

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
              onClick={() => navigate('/store-profile-page')}
              style={{
                marginTop: '16px',
                padding: '12px 20px',
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: '#003b6a'
                }
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
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: '#218838'
                }
              }}
            >
              Create Offer
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            gap: "16px", 
            marginBottom: "24px",
            flexWrap: "wrap" // Allow cards to wrap on smaller screens
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              flex: '1 1 calc(50% - 8px)', // Allow cards to wrap on smaller screens
              minWidth: '200px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#002B4D' }}>Total Views</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>0</p>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              flex: '1 1 calc(50% - 8px)', // Allow cards to wrap on smaller screens
              minWidth: '200px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#002B4D' }}>Total Likes</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>0</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#002B4D', margin: '0 0 16px 0' }}>Recent Activity</h2>
            <p style={{ margin: 0, color: '#666' }}>No recent activity yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertiserPortal;

  );
};

export default AdvertiserPortal;
