import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaMapPin } from 'react-icons/fa';
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

      console.log(`🔄 Starting unpost process for: ${title}`);

      // Get the current vostcard data
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      const vostcardSnap = await getDoc(vostcardRef);
      
      if (!vostcardSnap.exists()) {
        throw new Error('Vostcard not found');
      }

      const vostcardData = vostcardSnap.data();
      console.log('📄 Retrieved vostcard data:', vostcardData);

      // Create private vostcard with proper media handling
      const privateVostcard = {
        ...vostcardData,
        id: crypto.randomUUID(), // Generate new ID for local storage
        state: 'private' as const,
        // Keep the media URLs/data as they are - don't null them out
        video: vostcardData.video || null,
        photos: vostcardData.photos || [],
        videoURL: vostcardData.videoURL || null, // Keep Firebase video URL
        photoURLs: vostcardData.photoURLs || [], // Keep Firebase photo URLs
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

      console.log('💾 Setting as current vostcard:', privateVostcard);

      // Set as current vostcard FIRST
      setCurrentVostcard(privateVostcard);
      
      // Wait a moment to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then save to IndexedDB
      console.log('💾 Saving to local storage...');
      await saveLocalVostcard();

      console.log('✅ Saved to local storage successfully');

      // Delete the posted vostcard from Firebase
      await deleteDoc(vostcardRef);
      console.log('🗑️ Deleted from Firebase successfully');

      // Remove from local state
      setPostedVostcards(prev => prev.filter(v => v.id !== vostcardId));

      console.log(`✅ Vostcard "${title}" successfully un-posted and moved to private.`);
      alert(`✅ "${title}" has been moved to your private Vōstcards.`);
      
    } catch (error) {
      console.error('❌ Error un-posting vostcard:', error);
      alert(`❌ Failed to un-post "${title}". Please try again.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      overflow: 'hidden',
      position: 'relative',
      // Prevent bounce scrolling
      touchAction: 'pan-y',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Banner - Fixed at top */}
      <div style={{ 
        background: '#07345c', 
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        height: '64px'
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
        overflowY: 'scroll', // Force scrollbar to appear
        overflowX: 'hidden',
        padding: '20px',
        paddingTop: '84px', // Account for fixed header (64px + 20px)
        background: '#f5f5f5',
        WebkitOverflowScrolling: 'touch',
        minHeight: 0,
        maxHeight: 'calc(100vh - 64px)', // Ensure it doesn't exceed viewport
        // Prevent bounce scrolling
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        // For older iOS versions
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)'
      } as React.CSSProperties}>
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
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingBottom: '40px', // Extra space at bottom for easier scrolling
            minHeight: 'fit-content' // Ensure content can expand
          }}>
            {postedVostcards.map((vostcard) => (
              <div key={vostcard.id} style={{
                border: '1px solid #ccc',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                background: 'white',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
                flexShrink: 0 // Prevent cards from shrinking
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
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
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
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
                    View
                  </button>
                  {/* Add Pin Placer Button */}
                  <button
                    onClick={() => {
                      navigate('/pin-placer', {
                        state: {
                          pinData: {
                            id: vostcard.id,
                            title: vostcard.title || 'Untitled Vostcard',
                            description: vostcard.description || 'No description',
                            latitude: vostcard.latitude || vostcard.geo?.latitude || 0,
                            longitude: vostcard.longitude || vostcard.geo?.longitude || 0,
                            isOffer: false,
                            userID: vostcard.userID
                          }
                        }
                      });
                    }}
                    style={{
                      backgroundColor: '#ff6b35',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e55a2b';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ff6b35';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.3)';
                    }}
                  >
                    <FaMapPin size={14} />
                    Pin Placer
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPostedVostcardsListView; 