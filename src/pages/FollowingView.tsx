import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';

interface FollowedUser {
  id: string;
  username: string;
  avatarURL?: string;
}

const FollowingView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFollowedUsers = async () => {
      if (!user) {
        console.warn('❌ No user logged in');
        setLoading(false);
        return;
      }

      try {
        console.log('📥 Fetching followed users for:', user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const following = userDoc.data().following || [];
          console.log('✅ Followed user IDs:', following);

          const fetchedUsers: FollowedUser[] = [];
          for (const userID of following) {
            const followedDoc = await getDoc(doc(db, 'users', userID));
            if (followedDoc.exists()) {
              const data = followedDoc.data();
              fetchedUsers.push({
                id: userID,
                username: data.username || data.displayName || 'Anonymous',
                avatarURL: data.avatarURL || '',
              });
            }
          }

          setFollowedUsers(fetchedUsers);
        }
      } catch (err) {
        console.error('❌ Failed to load followed users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFollowedUsers();
  }, [user]);

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ 
          fontSize: '2.2rem',
          fontWeight: 700,
          margin: 0 
        }}>Following</h1>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 55,
            height: 55,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <FaHome size={28} color="white" />
        </button>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1,
        padding: '20px',
        overflowY: 'auto'
      }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
            <p>Loading followed users...</p>
          </div>
        )}

        {/* No users */}
        {!loading && followedUsers.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'white',
            borderRadius: 15,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            margin: '20px 0'
          }}>
            <h3 style={{ color: '#333' }}>You are not following anyone yet.</h3>
            <p style={{ color: '#666' }}>Follow other users to see their updates here.</p>
          </div>
        )}

        {/* Followed Users Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '20px',
          padding: '10px 0'
        }}>
          {followedUsers.map((user) => (
            <div
              key={user.id}
              style={{
                background: 'white',
                borderRadius: 15,
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onClick={() => handleViewProfile(user.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {user.avatarURL ? (
                  <img
                    src={user.avatarURL}
                    alt={user.username}
                    style={{ 
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#eee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '24px'
                  }}>
                    ?
                  </div>
                )}
                <div>
                  <h3 style={{ 
                    margin: 0,
                    color: '#333',
                    fontSize: '1.2rem'
                  }}>{user.username}</h3>
                  <p style={{ 
                    margin: '5px 0 0 0',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>Tap to view profile</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FollowingView; 