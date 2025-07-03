import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';

interface Vostcard {
  id: string;
  title: string;
  username?: string;
  createdAt?: any;  // you can adjust type to Timestamp if you use Firestore Timestamps
  [key: string]: any;
}

const AllPostedVostcardsView: React.FC = () => {
  const [vostcards, setVostcards] = useState<Vostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllPostedVostcards = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
        const snapshot = await getDocs(q);
        const allVostcards = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vostcard[];
        setVostcards(allVostcards);
      } catch (error) {
        console.error('Error fetching posted vostcards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPostedVostcards();
  }, []);

  if (loading) return <p>Loading posted Vostcards...</p>;

  if (vostcards.length === 0) return <p>No posted Vostcards found.</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>All Posted Vostcards</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {vostcards.map(v => (
          <li 
            key={v.id} 
            onClick={() => navigate(`/vostcard/${v.id}`)} 
            style={{ 
              padding: '10px', 
              marginBottom: '10px', 
              border: '1px solid #ccc', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            <h3>{v.title || 'Untitled'}</h3>
            <p>By: {v.username || 'Unknown'}</p>
            <p>Posted: {v.createdAt?.toDate ? v.createdAt.toDate().toLocaleDateString() : 'Unknown'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AllPostedVostcardsView;