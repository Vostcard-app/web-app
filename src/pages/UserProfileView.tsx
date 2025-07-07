// ✅ Blueprint: PWA UserProfileView (React + Firebase Firestore)
// 📁 src/pages/UserProfileView.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft, FaUserEdit } from 'react-icons/fa';

interface UserProfile {
  id: string;
  username: string;
  avatarURL?: string;
  followerCount: number;
  followingCount: number;
  message?: string;
}

const UserProfileView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isCurrentUser = user?.uid === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!userId) return;
        console.log('📥 Fetching user profile:', userId);

        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            id: userId,
            username: data.username || 'Unknown User',
            avatarURL: data.avatarURL || '',
            followerCount: data.followerCount || 0,
            followingCount: data.followingCount || 0,
            message: data.message || '',
          });

          if (user && user.uid !== userId) {
            const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
            const following = currentUserDoc.data()?.following || [];
            setIsFollowing(following.includes(userId));
          }
        } else {
          console.warn('❌ User not found');
        }
      } catch (error) {
        console.error('❌ Failed to load user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user]);

  const handleFollowToggle = async () => {
    if (!user || !userId || isCurrentUser) return;

    const currentUserRef = doc(db, 'users', user.uid);
    const targetUserRef = doc(db, 'users', userId);

    try {
      if (isFollowing) {
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
        });
        await updateDoc(targetUserRef, {
          followerCount: (profile?.followerCount || 1) - 1,
        });
        setIsFollowing(false);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: prev.followerCount - 1 } : prev
        );
      } else {
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        });
        await updateDoc(targetUserRef, {
          followerCount: (profile?.followerCount || 0) + 1,
        });
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev
        );
      }
    } catch (error) {
      console.error('❌ Error toggling follow status:', error);
    }
  };

  if (loading) return <p>Loading profile...</p>;

  if (!profile) return <p>User not found.</p>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      {/* 🔙 Back */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: '#007aff',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 20,
          cursor: 'pointer',
        }}
      >
        <FaArrowLeft /> Back
      </button>

      {/* 🖼️ Avatar */}
      <div style={{ textAlign: 'center' }}>
        {profile.avatarURL ? (
          <img
            src={profile.avatarURL}
            alt="Avatar"
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: 10,
            }}
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: '#ddd',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              color: '#555',
              marginBottom: 10,
            }}
          >
            ?
          </div>
        )}
        <h2>{profile.username}</h2>
        {profile.message && (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            "{profile.message}"
          </p>
        )}
      </div>

      {/* 👥 Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        <div>
          <strong>{profile.followerCount}</strong>
          <p style={{ color: '#999', margin: 0 }}>Followers</p>
        </div>
        <div>
          <strong>{profile.followingCount}</strong>
          <p style={{ color: '#999', margin: 0 }}>Following</p>
        </div>
      </div>

      {/* ✏️ Edit or Follow */}
      {isCurrentUser ? (
        <button
          onClick={() => navigate('/settings')}
          style={{
            background: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          <FaUserEdit /> Edit Profile
        </button>
      ) : (
        <button
          onClick={handleFollowToggle}
          style={{
            background: isFollowing ? '#888' : '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
    </div>
  );
};

export default UserProfileView;

// ✅ Add route in src/App.tsx:
// <Route path="/profile/:userId" element={<UserProfileView />} />

// ✅ Add link to this view anywhere user profiles are shown:
// <Link to={`/profile/${userId}`}>View Profile</Link>
