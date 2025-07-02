import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaBars, FaUserCircle, FaPlus, FaChartBar, FaAd, FaUsers, FaCog, FaGift } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

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

const menuItemStyle = {
  padding: '10px 20px',
  margin: 0,
  cursor: 'pointer',
  borderBottom: '1px solid #f0f0f0',
  fontSize: '14px',
};

const AdvertiserPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, username, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [advertiserStats, setAdvertiserStats] = useState({
    totalVostcards: 0,
    totalViews: 0,
    totalEngagement: 0
  });
  const [loading, setLoading] = useState(true);

  // Header styles
  const headerStyle = {
    backgroundColor: '#002B4D',
    color: 'white',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1000,
  };

  const logoStyle = {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold' as const,
  };

  const headerRight = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  };

  // Load advertiser statistics
  useEffect(() => {
    const loadAdvertiserStats = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Get Vostcards posted by this advertiser
        const vostcardsQuery = query(
          collection(db, 'vostcards'),
          where('userID', '==', user.uid),
          where('state', '==', 'posted')
        );
        const vostcardsSnapshot = await getDocs(vostcardsQuery);
        
        setAdvertiserStats({
          totalVostcards: vostcardsSnapshot.docs.length,
          totalViews: vostcardsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().views || 0), 0),
          totalEngagement: vostcardsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().engagement || 0), 0)
        });
      } catch (error) {
        console.error('Error loading advertiser stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdvertiserStats();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Please log in to access the Advertiser Portal</h2>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={logoStyle}>Advertiser Portal</h1>
        <div style={headerRight}>
          <span style={{ fontSize: '14px' }}>Welcome, {username || user.email}</span>
          <FaUserCircle size={30} />
          <FaBars
            size={30}
            onClick={() => setIsMenuOpen((open) => !open)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Hamburger Menu */}
      {isMenuOpen && (
        <div style={menuStyle}>
          <p onClick={() => { navigate('/advertiser-portal'); setIsMenuOpen(false); }} style={menuItemStyle}>
            Dashboard
          </p>
          <p onClick={() => { navigate('/create-advertisement'); setIsMenuOpen(false); }} style={menuItemStyle}>
            Create Advertisement
          </p>
          <p onClick={() => { navigate('/create-offer'); setIsMenuOpen(false); }} style={menuItemStyle}>
            Create Special Offer
          </p>
          <p onClick={() => { navigate('/advertiser-analytics'); setIsMenuOpen(false); }} style={menuItemStyle}>
            Analytics
          </p>
          <p onClick={() => { navigate('/advertiser-settings'); setIsMenuOpen(false); }} style={menuItemStyle}>
            Settings
          </p>
          <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ccc' }} />
          <p onClick={() => { navigate('/home'); setIsMenuOpen(false); }} style={menuItemStyle}>
            Switch to User Mode
          </p>
          <p onClick={handleLogout} style={menuItemStyle}>
            Logout
          </p>
          <p onClick={() => setIsMenuOpen(false)} style={menuItemStyle}>
            Close
          </p>
        </div>
      )}

      {/* Main Content */}
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Welcome Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#002B4D' }}>
            Welcome to Your Advertiser Dashboard
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
            Manage your advertisements, track performance, and reach your target audience.
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <FaAd size={40} style={{ color: '#002B4D', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#002B4D' }}>
              {loading ? 'Loading...' : advertiserStats.totalVostcards}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Total Advertisements</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <FaChartBar size={40} style={{ color: '#28a745', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#28a745' }}>
              {loading ? 'Loading...' : advertiserStats.totalViews}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Total Views</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <FaUsers size={40} style={{ color: '#ffc107', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#ffc107' }}>
              {loading ? 'Loading...' : advertiserStats.totalEngagement}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Total Engagement</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#002B4D' }}>Quick Actions</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <button
              onClick={() => navigate('/create-advertisement')}
              style={{
                padding: '16px',
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaPlus />
              Create Advertisement
            </button>

            <button
              onClick={() => navigate('/create-offer')}
              style={{
                padding: '16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaGift />
              Create Special Offer
            </button>

            <button
              onClick={() => navigate('/advertiser-analytics')}
              style={{
                padding: '16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaChartBar />
              View Analytics
            </button>

            <button
              onClick={() => navigate('/advertiser-settings')}
              style={{
                padding: '16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaCog />
              Settings
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#002B4D' }}>Recent Activity</h3>
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No recent activity to display. Create your first advertisement to get started!
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdvertiserPortal;
