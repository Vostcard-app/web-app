// ✅ Blueprint: PWA UserProfileView (React + Firebase Firestore)
// 📁 src/pages/UserProfileView.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft, FaUserEdit, FaHome, FaHeart, FaCoffee, FaMapPin } from 'react-icons/fa';
import { TourService } from '../services/tourService';
import type { Tour } from '../types/TourTypes';

interface UserProfile {
  id: string;
  username: string;
  avatarURL?: string;
  followerCount: number;
  followingCount: number;
  message?: string;
  postedCount?: number;
  buyMeACoffeeURL?: string;
  userRole?: string;
}

interface PostedVostcard {
  id: string;
  title: string;
  description: string;
  photoURLs?: string[];
  videoURL?: string;
  createdAt?: any;
  [key: string]: any;
}

const UserProfileView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getLikeCount } = useVostcard();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postedVostcards, setPostedVostcards] = useState<PostedVostcard[]>([]);
  const [allUserPosts, setAllUserPosts] = useState<PostedVostcard[]>([]);
  const [likeCounts, setLikeCounts] = useState<{ [vostcardId: string]: number }>({});
  
  // Tour-related state
  const [tours, setTours] = useState<Tour[]>([]);

  const isCurrentUser = user?.uid === userId;

  useEffect(() => {
    const fetchProfileAndVostcards = async () => {
      try {
        if (!userId) return;
    

        // Fetch user profile
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Fetch posted vostcards count and data
          const vostcardsQuery = query(
            collection(db, 'vostcards'),
            where('userID', '==', userId),
            where('state', '==', 'posted')
          );
          const vostcardsSnapshot = await getDocs(vostcardsQuery);
          const vostcardsData = vostcardsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PostedVostcard[];

          setPostedVostcards(vostcardsData);

          // For trip creation, also fetch all user's posts (including drafts/saved)
          let allUserPosts: PostedVostcard[] = [];
          if (isCurrentUser) {
            const allPostsQuery = query(
              collection(db, 'vostcards'),
              where('userID', '==', userId)
            );
            const allPostsSnapshot = await getDocs(allPostsQuery);
            allUserPosts = allPostsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as PostedVostcard[];
            setAllUserPosts(allUserPosts);
          }

          // Load like counts for each vostcard
          const counts: { [key: string]: number } = {};
          for (const vostcard of vostcardsData) {
            try {
              const count = await getLikeCount(vostcard.id);
              counts[vostcard.id] = count;
            } catch (error) {
              console.error(`Error loading like count for ${vostcard.id}:`, error);
              counts[vostcard.id] = 0;
            }
          }
          setLikeCounts(counts);

          setProfile({
            id: userId,
            username: data.username || 'Unknown User',
            avatarURL: data.avatarURL || '',
            followerCount: data.followerCount || 0,
            followingCount: data.followingCount || 0,
            message: data.message || '',
            postedCount: vostcardsData.length,
            buyMeACoffeeURL: data.buyMeACoffeeURL || '',
            userRole: data.userRole || 'user',
          });

          if (user && user.uid !== userId) {
            const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
            const following = currentUserDoc.data()?.following || [];
            setIsFollowing(following.includes(userId));
          }

          // Load tours
          try {
            const userTours = isCurrentUser 
              ? await TourService.getToursByCreator(userId)
              : await TourService.getPublicToursByCreator(userId);
            setTours(userTours);
          } catch (error) {
            console.error('Error loading tours:', error);
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

    fetchProfileAndVostcards();
  }, [userId, user, getLikeCount]);

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

  // Tour/Trip-related functions


  // Helper function to get the correct terminology
  const getTourTerminology = () => {
    return profile?.userRole === 'guide' ? 'Tour' : 'Trip';
  };

  if (loading) return <p>Loading profile...</p>;

  if (!profile) return <p>User not found.</p>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        padding: '32px 24px 24px 24px',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 
          onClick={() => navigate('/home')}
          style={{
            color: 'white',
            fontWeight: 700,
            fontSize: '2.5rem',
            margin: 0,
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          Vōstcard
        </h1>
        <button
          onClick={() => navigate("/home")}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            cursor: 'pointer',
          }}
        >
                      <FaHome size={40} color="white" />
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>

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
        
        {/* 🗺️ Available Tours/Trips Button - Under Username */}
        <div style={{ 
          margin: '16px 0',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          maxWidth: '300px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}
        onClick={() => navigate(`/user-profile/${userId}/tours`)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f8f9fa';
          e.currentTarget.style.borderColor = '#007aff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#e0e0e0';
        }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#333'
              }}>
                Available {getTourTerminology()}s
              </h3>
              <p style={{ 
                margin: '2px 0 0 0', 
                fontSize: '12px', 
                color: '#666' 
              }}>
                {tours.length} {getTourTerminology().toLowerCase()}{tours.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <FaMapPin style={{ color: '#007aff', fontSize: '18px' }} />
          </div>
        </div>
        
        {/* ✏️ Edit Profile Button */}
        {isCurrentUser && (
          <button
            onClick={() => navigate('/user-settings')}
            style={{
              background: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 14,
              margin: '10px 0',
            }}
          >
            Edit Profile
          </button>
        )}


        
        {profile.message && (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            "{profile.message}"
          </p>
        )}

        {/* ☕ Tip Button for Guides - Under Avatar */}
        {!isCurrentUser && profile?.userRole === 'guide' && profile?.buyMeACoffeeURL && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: '15px'
          }}>
            <button
              onClick={() => {
                window.open(profile.buyMeACoffeeURL, '_blank', 'noopener,noreferrer');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFDD00',
                color: '#333',
                border: 'none',
                borderRadius: '20px',
                padding: '10px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#FFE55C';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#FFDD00';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <FaCoffee size={18} />
              Leave a Tip
            </button>
          </div>
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
        <div style={{ textAlign: 'center' }}>
          <strong style={{ color: '#007aff', fontSize: '1.5rem' }}>{profile.postedCount || 0}</strong>
          <p style={{ color: '#999', margin: 0 }}>Posted</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: '1.5rem' }}>{profile.followerCount}</strong>
          <p style={{ color: '#999', margin: 0 }}>Followers</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: '1.5rem' }}>{profile.followingCount}</strong>
          <p style={{ color: '#999', margin: 0 }}>Following</p>
        </div>
      </div>

      {/* ✏️ Follow Button for other users */}
      {!isCurrentUser && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
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
        </div>
      )}



      {/* 📷 Posted Vostcards Grid */}
      {postedVostcards.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginTop: 10,
          }}>
            {postedVostcards.map((vostcard) => (
              <div
                key={vostcard.id}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  backgroundColor: '#ddd',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/vostcard/${vostcard.id}`)}
              >
                {vostcard.photoURLs && vostcard.photoURLs.length > 0 ? (
                  <img
                    src={vostcard.photoURLs[0]}
                    alt={vostcard.title || 'Vostcard'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: 14,
                  }}>
                    No Photo
                  </div>
                )}
                
                {/* Like count overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <FaHeart style={{ color: '#ff3040' }} />
                  {likeCounts[vostcard.id] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      

      
      </div>
    </div>
  );
};

export default UserProfileView;
