import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const AdvertiserPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [storeProfile, setStoreProfile] = useState<any>(null);

  useEffect(() => {
    const loadStoreProfile = async () => {
      if (user?.uid) {
        try {
          const advertiserRef = doc(db, "advertisers", user.uid);
          const advertiserSnap = await getDoc(advertiserRef);
          if (advertiserSnap.exists()) {
            setStoreProfile(advertiserSnap.data());
          }
        } catch (error) {
          console.error('Error loading store profile:', error);
        }
      }
    };

    loadStoreProfile();
  }, [user?.uid]);

  return (
    <div style={{ 
      height: '100vh',
      overflowY: 'auto'
    }}>
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
            src={storeProfile?.storePhotoURL || '/default-store.png'}
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
            {storeProfile?.storeName || 'Update your store profile details to ensure your offers appear correctly in the app.'}
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
    </div>
  );
};

export default AdvertiserPortal;
