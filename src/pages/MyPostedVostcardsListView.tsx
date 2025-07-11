import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';

interface PostedVostcard {
  id: string;
  title: string;
  description: string;
  categories: string[];
  createdAt: any;
  state: string;
  [key: string]: any;
}

const MyPostedVostcardsListView = () => {
  const navigate = useNavigate();
  const [postedVostcards, setPostedVostcards] = useState<PostedVostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpostingIds, setUnpostingIds] = useState<Set<string>>(new Set());
  const { setCurrentVostcard, saveLocalVostcard } = useVostcard();

  useEffect(() => {
    loadPostedVostcards();
  }, []);

  const loadPostedVostcards = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Please log in to view your posted Vostcards.');
        navigate('/login');
        return;
      }

      // Fetch all vostcards by this user, then filter to show only posted ones
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const vostcards = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PostedVostcard))
        .filter(v => v.state === 'posted' && !v.isOffer); // Filter out offers - only show regular vostcards
      setPostedVostcards(vostcards);
    } catch (error) {
      console.error('Error loading posted Vostcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpostVostcard = async (vostcardId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to un-post "${title}"? It will be moved back to your private Vōstcards.`)) {
      return;
    }

    try {
      // Add to unposting set to show loading state
      setUnpostingIds(prev => new Set(prev.add(vostcardId)));

      // Get the current vostcard data
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      const vostcardSnap = await getDoc(vostcardRef);
      
      if (!vostcardSnap.exists()) {
        throw new Error('Vostcard not found');
      }

      const vostcardData = vostcardSnap.data();

      // Save to local storage (IndexedDB)
      const privateVostcard = {
        ...vostcardData,
        id: crypto.randomUUID(), // Generate new ID for local storage
        state: 'private' as const,
        video: null,
        photos: [],
        title: vostcardData.title || '',
        description: vostcardData.description || '',
        categories: vostcardData.categories || [],
        geo: vostcardData.geo || null,
        username: vostcardData.username || '',
        userID: vostcardData.userID || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalPostedId: vostcardId // Keep reference to original
      };

      // Set as current vostcard and save to IndexedDB
      setCurrentVostcard(privateVostcard);
      await saveLocalVostcard();

      // Delete the posted vostcard from Firebase
      await deleteDoc(vostcardRef);

      // Remove from local state
      setPostedVostcards(prev => prev.filter(v => v.id !== vostcardId));

      console.log(`✅ Vostcard "${title}" successfully un-posted and moved to private.`);
      
    } catch (error) {
      console.error('❌ Error un-posting vostcard:', error);
      alert('Failed to un-post vostcard. Please try again.');
    } finally {
      // Remove from unposting set
      setUnpostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Banner */}
      <div style={{ 
        background: '#07345c', 
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          color: 'white', 
          margin: 0,
          fontSize: '24px',
          fontWeight: 600
        }}>
          Posted Vōstcards
        </h1>
        <button 
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FaHome size={20} />
        </button>
      </div>

      {/* List of Posted Vostcards (Scrollable) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px',
        background: '#f5f5f5',
        WebkitOverflowScrolling: 'touch', // Enable smooth scrolling on iOS
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '18px', color: '#666' }}>Loading your posted Vōstcards...</div>
          </div>
        ) : postedVostcards.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#666'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '24px' }}>
              No Posted Vōstcards
            </h3>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.5 }}>
              When you post a Vōstcard, it will appear here.<br />
              You can always un-post them to move them back to private.
            </p>
          </div>
        ) : (
          postedVostcards.map((vostcard) => (
            <div key={vostcard.id} style={{
              border: '1px solid #ccc',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              background: 'white',
            }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#002B4D' }}>
                {vostcard.title || 'Untitled Vōstcard'}
              </h2>
              <p style={{ margin: '8px 0', color: '#666' }}>
                <strong>Categories:</strong> {vostcard.categories?.join(', ') || 'None'}
              </p>
              <p style={{ margin: '8px 0', color: '#666' }}>
                <strong>Posted:</strong> {vostcard.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  style={{
                    backgroundColor: '#002B4D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => navigate(`/vostcard/${vostcard.id}`)}
                >
                  View on Map
                </button>
                <button
                  style={{
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    opacity: unpostingIds.has(vostcard.id) ? 0.6 : 1,
                    pointerEvents: unpostingIds.has(vostcard.id) ? 'none' : 'auto',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleUnpostVostcard(vostcard.id, vostcard.title || 'Untitled Vōstcard')}
                  disabled={unpostingIds.has(vostcard.id)}
                >
                  {unpostingIds.has(vostcard.id) ? 'Un-posting...' : 'Un-Post'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPostedVostcardsListView; 