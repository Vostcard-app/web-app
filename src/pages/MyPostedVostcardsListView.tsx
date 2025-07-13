import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const MyPostedVostcardsListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [postedVostcards, setPostedVostcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before attempting to load Vostcards
    if (!authLoading) {
      loadPostedVostcards();
    }
  }, [authLoading, user]);

  const loadPostedVostcards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Loading posted Vostcards...');
      console.log('🔐 Auth state:', { user: !!user, uid: user?.uid, email: user?.email });
      
      if (!user) {
        console.log('❌ No user authenticated');
        setError('Please log in to view your posted Vostcards.');
        navigate('/login');
        return;
      }

      console.log('🔍 Querying Firestore for posted Vostcards...');
      // Query for posted Vostcards by this user
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('state', '==', 'posted')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`📊 Found ${querySnapshot.docs.length} posted Vostcards`);
      
      const vostcards = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Vostcard data:', {
          id: doc.id,
          title: data.title,
          state: data.state,
          userID: data.userID,
          createdAt: data.createdAt
        });
        return {
          id: doc.id,
          ...data
        };
      });
      
      setPostedVostcards(vostcards);
      console.log('✅ Posted Vostcards loaded successfully:', vostcards.length);
      
    } catch (error) {
      console.error('❌ Error loading posted Vostcards:', error);
      setError('Failed to load posted Vostcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadPostedVostcards();
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* 🔵 Header with Home Icon */}
      <div style={{
        backgroundColor: '#002B4D',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>My Posted Vōstcards</h1>
        <FaHome
          size={28}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* 🔲 List of Posted Vostcards */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading your posted Vostcards...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>
            <button
              onClick={handleRetry}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : postedVostcards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>No posted Vostcards found.</p>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Create and post a Vostcard to see it here!
            </p>
            <button
              onClick={() => navigate('/create-step1')}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Create Your First Vostcard
            </button>
          </div>
        ) : (
          postedVostcards.map((vostcard) => (
            <div key={vostcard.id} style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ margin: '0 0 8px 0' }}>{vostcard.title || 'Untitled Vōstcard'}</h2>
              <p>{vostcard.description || 'No description provided.'}</p>
              <p><strong>Categories:</strong> {vostcard.categories?.join(', ') || 'None'}</p>
              <p><strong>Posted:</strong> {
                vostcard.createdAt?.toDate ? 
                  vostcard.createdAt.toDate().toLocaleDateString() : 
                  vostcard.createdAt ? 
                    new Date(vostcard.createdAt).toLocaleDateString() : 
                    'Unknown'
              }</p>
              <button
                style={{
                  backgroundColor: '#002B4D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/vostcard/${vostcard.id}`)}
              >
                View on Map
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPostedVostcardsListView; 