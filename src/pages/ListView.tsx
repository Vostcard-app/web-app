import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

interface Vostcard {
  id: string;
  title: string;
  description: string;
  username?: string;
  createdAt?: any;
  isOffer?: boolean;
  [key: string]: any;
}

const ListView: React.FC = () => {
  const [vostcards, setVostcards] = useState<Vostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVostcards = async () => {
      try {
        const q = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
        const snapshot = await getDocs(q);
        const allVostcards = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vostcard[];
        
        // Filter out offers - only show regular vostcards in this view
        const regularVostcards = allVostcards.filter(v => !v.isOffer);
        
        setVostcards(regularVostcards);
      } catch (error) {
        console.error('Error fetching vostcards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVostcards();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 30
      }}>
        <h1>Vōstcards List</h1>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: '#002B4D', 
            color: 'white', 
            border: 'none',
            padding: 12, 
            borderRadius: 10, 
            cursor: 'pointer'
          }}
        >
          <FaHome /> Home
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p>Loading vostcards...</p>
      ) : vostcards.length === 0 ? (
        <p>No vostcards found.</p>
      ) : (
        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20
        }}>
          {vostcards.map((vostcard) => (
            <div 
              key={vostcard.id} 
              style={{
                background: 'white', 
                borderRadius: 15, 
                padding: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onClick={() => navigate(`/vostcard/${vostcard.id}`)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>
                {vostcard.title || 'Untitled'}
              </h3>
              <p style={{ margin: '8px 0', color: '#555' }}>
                {vostcard.description?.slice(0, 100)}...
              </p>
              <div style={{ 
                marginTop: 15, 
                fontSize: '0.9rem', 
                color: '#888' 
              }}>
                By {vostcard.username || 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListView;
