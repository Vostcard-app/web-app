import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useFollowing } from '../context/FollowingContext';
import { FaHome, FaHeart, FaGlobe, FaUser } from 'react-icons/fa';

interface FollowingVostcard {
  id: string;
  title: string;
  description: string;
  username: string;
  userID: string;
  photoURLs?: string[];
  createdAt?: any;
  likeCount?: number;
  [key: string]: any;
}

const FollowingView: React.FC = () => {
  const [vostcards, setVostcards] = useState<FollowingVostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { following, refreshFollowing } = useFollowing();

  useEffect(() => {
    const fetchFollowingVostcards = async () => {
      if (!user) {
        setError('You must be logged in to view your following feed.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Refresh following list to ensure we have the latest data
        await refreshFollowing();

        if (following.length === 0) {
          setVostcards([]);
          setLoading(false);
          return;
        }

        // Fetch vostcards from users you're following
        const vostcardsQuery = query(
          collection(db, 'vostcards'),
          where('userID', 'in', following),
          where('state', '==', 'posted'),
          orderBy('createdAt', 'desc')
        );

        const vostcardsSnapshot = await getDocs(vostcardsQuery);
        const followingVostcards: FollowingVostcard[] = vostcardsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as FollowingVostcard[];

        setVostcards(followingVostcards);
      } catch (err: any) {
        console.error('Failed to fetch following Vōstcards:', err);
        setError('Failed to load following feed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchFollowingVostcards();
    }
  }, [user, following, refreshFollowing]);

  const handleGoHome = () => navigate('/home');
  const handleVostcardClick = (vostcardId: string) => navigate(`/vostcard/${vostcardId}`);
  const handleUserClick = (userId: string) => {
    // Navigate to user profile when implemented
    console.log('Navigate to user profile:', userId);
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', position: 'relative' }}>
      {/* Header */}
      <div style={{
        background: '#002B4D',
        color: 'white',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 1 }}>Following</div>
        <button
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer' }}
          onClick={handleGoHome}
        >
          <FaHome />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>
            Loading following feed...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: '#e53935' }}>
            {error}
          </div>
        ) : following.length === 0 ? (
          <div style={{
            textAlign: 'center', 
            padding: 60,
            background: 'white', 
            borderRadius: 15,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            margin: '20px 0'
          }}>
            <FaUser size={48} color="#ccc" style={{ marginBottom: 20 }} />
            <h3>You're not following anyone yet.</h3>
            <p>Follow other users to see their Vōstcards in your feed.</p>
            <button
              onClick={() => navigate('/all-posted-vostcards')}
              style={{
                background: '#007aff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                marginTop: 16
              }}
            >
              Discover Vōstcards
            </button>
          </div>
        ) : vostcards.length === 0 ? (
          <div style={{
            textAlign: 'center', 
            padding: 60,
            background: 'white', 
            borderRadius: 15,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            margin: '20px 0'
          }}>
            <h3>No recent Vōstcards</h3>
            <p>Users you follow haven't posted any Vōstcards yet.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
            marginTop: 20
          }}>
            {vostcards.map((vostcard) => (
              <div
                key={vostcard.id}
                style={{
                  background: 'white',
                  borderRadius: 15,
                  padding: 16,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => handleVostcardClick(vostcard.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                }}
              >
                {/* User info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 12,
                  cursor: 'pointer'
                }} onClick={(e) => {
                  e.stopPropagation();
                  handleUserClick(vostcard.userID);
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#007aff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <FaUser color="white" size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {vostcard.username || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {vostcard.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </div>
                  </div>
                </div>

                {/* Vostcard image */}
                {vostcard.photoURLs?.[0] && (
                  <img
                    src={vostcard.photoURLs[0]}
                    alt={vostcard.title || 'Vostcard'}
                    style={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 10,
                      marginBottom: 12
                    }}
                  />
                )}

                {/* Vostcard content */}
                <h3 style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  marginBottom: 8
                }}>
                  {vostcard.title || 'Untitled'}
                </h3>
                
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#666',
                  lineHeight: 1.4,
                  marginBottom: 12
                }}>
                  {vostcard.description?.slice(0, 100)}
                  {vostcard.description?.length > 100 ? '...' : ''}
                </p>

                {/* Interaction bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid #eee'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaHeart color="#ff4444" size={16} />
                      <span style={{ fontSize: 14, color: '#666' }}>
                        {vostcard.likeCount || 0}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaGlobe color="#007aff" size={16} />
                      <span style={{ fontSize: 14, color: '#666' }}>Web</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowingView; 