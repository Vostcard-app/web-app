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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      {/* ✅ Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/home')}
          style={{ background: '#007aff', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}
        >
          <FaHome /> Home
        </button>
        <h1>Following</h1>
      </div>

      {/* ✅ Loading */}
      {loading && <p>Loading followed users...</p>}

      {/* ✅ No users */}
      {!loading && followedUsers.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center' }}>
          You are not following anyone yet.
        </p>
      )}

      {/* ✅ Followed Users List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
        {followedUsers.map((user) => (
          <div
            key={user.id}
            style={{
              background: 'white',
              borderRadius: 10,
              padding: 15,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }}
            onClick={() => handleViewProfile(user.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              {user.avatarURL ? (
                <img
                  src={user.avatarURL}
                  alt={user.username}
                  style={{ width: 50, height: 50, borderRadius: '50%', marginRight: 10, objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: '#ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    marginRight: 10
                  }}
                >
                  ?
                </div>
              )}
              <div>
                <h3 style={{ margin: 0 }}>{user.username}</h3>
                <p style={{ margin: 0, color: '#999', fontSize: 14 }}>Tap to view profile</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowingView; 