// ✅ src/pages/LikedVostcardsView.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import { FaHeart, FaHome } from 'react-icons/fa';

interface LikedVostcard {
  id: string;
  title: string;
  description: string;
  photoURLs?: string[];
  username?: string;
  likeCount?: number;
  createdAt?: any;
  [key: string]: any;
}

const LikedVostcardsView: React.FC = () => {
  const [likedVostcards, setLikedVostcards] = useState<LikedVostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadLikedVostcards, likedVostcards: contextLikedVostcards } = useVostcard();

  useEffect(() => {
    const fetchLikedVostcards = async () => {
      if (!user) {
        setError('You must be logged in to view liked Vōstcards.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Load liked vostcard IDs from the new like system
        await loadLikedVostcards();
        
      } catch (err: any) {
        console.error('Failed to fetch liked Vōstcards:', err);
        setError('Failed to load liked Vōstcards. Please try again.');
        setLoading(false);
      }
    };

    fetchLikedVostcards();
  }, [user, loadLikedVostcards]);

  // Separate effect to handle the liked vostcards data
  useEffect(() => {
    const fetchVostcardDetails = async () => {
      if (contextLikedVostcards.length === 0) {
        setLikedVostcards([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch the actual vostcard data
        const vostcardIDs = contextLikedVostcards.map(like => like.vostcardID);
        
        if (vostcardIDs.length === 0) {
          setLikedVostcards([]);
          setLoading(false);
          return;
        }

        // Use documentId() syntax for __name__ queries
        const vostcardsQuery = query(
          collection(db, 'vostcards'),
          where('__name__', 'in', vostcardIDs)
        );

        const vostcardSnapshot = await getDocs(vostcardsQuery);
        const vostcards: LikedVostcard[] = vostcardSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as LikedVostcard[];

        // Filter out offers - only show regular vostcards in liked view
        const regularVostcards = vostcards.filter(v => !v.isOffer);

        setLikedVostcards(regularVostcards);
      } catch (err: any) {
        console.error('Failed to fetch Vōstcard details:', err);
        setError('Failed to load Vōstcard details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVostcardDetails();
  }, [contextLikedVostcards]);

  const handleGoHome = () => navigate('/home');

  const handleVostcardClick = (vostcardId: string) => {
    navigate(`/vostcard/${vostcardId}`);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30
      }}>
        <button
          onClick={handleGoHome}
          style={{
            background: '#667eea', color: 'white', border: 'none',
            padding: 12, borderRadius: 10, cursor: 'pointer'
          }}
        >
          <FaHome /> Home
        </button>
        <h1>Liked Vōstcards</h1>
      </div>

      {/* Content */}
      {loading ? (
        <p>Loading liked Vōstcards...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : likedVostcards.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'white', borderRadius: 15,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h3>You haven't liked any Vōstcards yet.</h3>
          <p>Tap the ❤️ icon on a Vōstcard to add it here.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16
        }}>
          {likedVostcards.map((vostcard) => (
            <div 
              key={vostcard.id} 
              style={{
                background: 'white', borderRadius: 15, padding: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onClick={() => handleVostcardClick(vostcard.id)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img
                src={vostcard.photoURLs?.[0] || '/placeholder.jpg'}
                alt={vostcard.title || 'Untitled'}
                style={{
                  width: '100%', height: 150, objectFit: 'cover',
                  borderRadius: 10, marginBottom: 10
                }}
              />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                {vostcard.title || 'Untitled'}
              </h3>
              <p style={{ margin: '8px 0', color: '#555' }}>
                {vostcard.description?.slice(0, 60)}...
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <FaHeart color="red" />
                <span>{vostcard.likeCount || 0} likes</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedVostcardsView;