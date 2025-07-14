import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';

const MyPostedVostcardsListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { postedVostcards, loadPostedVostcards } = useVostcard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unpostingIds, setUnpostingIds] = useState<Set<string>>(new Set());

  console.log('🔄 MyPostedVostcardsListView rendered', {
    authLoading,
    user: !!user,
    loading,
    error,
    postedVostcardsCount: postedVostcards.length
  });

  useEffect(() => {
    console.log('🔄 Auth state changed:', { authLoading, user: !!user });
    // Wait for auth to finish loading before attempting to load Vostcards
    if (!authLoading) {
      const loadData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          if (!user) {
            console.log('❌ No user authenticated');
            setError('Please log in to view your posted Vostcards.');
            navigate('/login');
            return;
          }

          await loadPostedVostcards();
          console.log('✅ Posted Vostcards loaded successfully');
          
        } catch (error) {
          console.error('❌ Error loading posted Vostcards:', error);
          setError(`Failed to load posted Vostcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [authLoading, user, loadPostedVostcards]);

  const handleUnpost = async (vostcardId: string) => {
    if (!window.confirm('Are you sure you want to unpost this Vōstcard? It will be removed from the public map but saved privately.')) {
      return;
    }

    try {
      setUnpostingIds(prev => new Set(prev).add(vostcardId));
      
      console.log('📤 Unposting Vostcard:', vostcardId);
      
      // Update the Vostcard state to 'private' in Firestore
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await updateDoc(vostcardRef, {
        state: 'private',
        updatedAt: new Date()
      });
      
      console.log('✅ Vostcard unposted successfully');
      
      // Refresh the posted vostcards list
      await loadPostedVostcards();
      
    } catch (error) {
      console.error('❌ Error unposting Vostcard:', error);
      alert('Failed to unpost Vostcard. Please try again.');
    } finally {
      setUnpostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
    }
  };

  const handleRetry = () => {
    console.log('🔄 Retrying to load posted Vostcards...');
    loadPostedVostcards();
  };

  // Show loading while auth is loading
  if (authLoading) {
    console.log('⏳ Showing auth loading screen');
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading authentication...</p>
      </div>
    );
  }

  console.log('🎨 Rendering main component', {
    loading,
    error,
    postedVostcardsCount: postedVostcards.length
  });

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: 'white' }}>
      {/* 🔵 Header with Home Icon */}
      <div style={{
        backgroundColor: '#07345c',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '15px 0 24px 20px',
        color: 'white',
        position: 'relative'
      }}>
        <h1 style={{ fontSize: '30px', margin: 0 }}>Posted Vōstcards</h1>
        <FaHome
          size={48}
          style={{
            position: 'absolute',
            right: 44,
            top: 15,
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* 🔲 List of Posted Vostcards */}
      <div style={{ 
        padding: '20px',
        backgroundColor: 'white',
        minHeight: 'calc(100vh - 70px)',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: 'white'
          }}>
            <p style={{ color: '#333', fontSize: '16px' }}>Loading your posted Vostcards...</p>
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: 'white'
          }}>
            <p style={{ color: 'red', marginBottom: '20px', fontSize: '16px' }}>{error}</p>
            <button
              onClick={handleRetry}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Retry
            </button>
          </div>
        ) : postedVostcards.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: 'white'
          }}>
            <p style={{ color: '#333', fontSize: '16px', marginBottom: '10px' }}>No posted Vostcards found.</p>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
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
                marginTop: '20px',
                fontSize: '14px'
              }}
            >
              Create Your First Vostcard
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {postedVostcards.map((vostcard) => (
              <div key={vostcard.id} style={{
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <h2 style={{ 
                  margin: '0 0 12px 0', 
                  color: '#002B4D',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  {vostcard.title || 'Untitled Vōstcard'}
                </h2>
                <p style={{ 
                  color: '#666', 
                  fontSize: '13px',
                  marginBottom: '8px'
                }}>
                  <strong>Categories:</strong> {vostcard.categories?.join(', ') || 'None'}
                </p>
                <p style={{ 
                  color: '#666', 
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  <strong>Posted:</strong> {
                    vostcard.createdAt?.toDate ? 
                      vostcard.createdAt.toDate().toLocaleDateString() : 
                      vostcard.createdAt ? 
                        new Date(vostcard.createdAt).toLocaleDateString() : 
                        'Unknown'
                  }
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    style={{
                      backgroundColor: '#002B4D',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onClick={() => navigate(`/vostcard/${vostcard.id}`)}
                  >
                    View
                  </button>
                  <button
                    style={{
                      backgroundColor: unpostingIds.has(vostcard.id) ? '#ccc' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: unpostingIds.has(vostcard.id) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onClick={() => handleUnpost(vostcard.id)}
                    disabled={unpostingIds.has(vostcard.id)}
                  >
                    {unpostingIds.has(vostcard.id) ? 'Unposting...' : 'Unpost'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPostedVostcardsListView; 