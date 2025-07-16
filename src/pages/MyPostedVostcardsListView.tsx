import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaMapPin, FaEye, FaEnvelope, FaTrash } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
// Import local storage utilities for Vostcards
import { loadLocalVostcards, deleteLocalVostcard } from '../utils/localVostcardStorage';

const MyPostedVostcardsListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username } = useAuth();
  const { postedVostcards, loadPostedVostcards, setCurrentVostcard } = useVostcard();
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

          // Load and sync posted vostcards with Firebase
          await loadPostedVostcards();
          console.log('✅ Posted Vostcards loaded successfully');

          // Filter out local vostcards not present in Firebase
          const syncLocalWithFirebase = async () => {
            const localVostcards = await loadLocalVostcards(); // implement this to get local Vostcards
            for (const vostcard of localVostcards) {
              const vostcardRef = doc(db, 'vostcards', vostcard.id);
              const docSnap = await getDoc(vostcardRef);
              if (!docSnap.exists()) {
                console.log(`🗑️ Local vostcard ${vostcard.id} not found in Firebase, deleting from device`);
                await deleteLocalVostcard(vostcard.id); // implement this to delete from local storage
              }
            }
          };
          await syncLocalWithFirebase();

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

  // Load posted vostcard from Firebase for editing
  const loadPostedVostcardForEdit = async (vostcardId: string) => {
    try {
      console.log('📝 Loading posted vostcard for editing:', vostcardId);
      
      // Get the vostcard document from Firebase
      const docRef = doc(db, 'vostcards', vostcardId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Vostcard not found');
      }
      
      const firebaseData = docSnap.data();
      console.log('📝 Firebase vostcard data:', firebaseData);
      
      // Download media files and convert to Blobs
      let videoBlob: Blob | null = null;
      let photoBlobs: Blob[] = [];
      
      // Download video if it exists
      if (firebaseData.videoURL) {
        try {
          console.log('📝 Downloading video for editing...');
          const videoResponse = await fetch(firebaseData.videoURL);
          if (videoResponse.ok) {
            videoBlob = await videoResponse.blob();
            console.log('✅ Video downloaded for editing');
          } else {
            console.error('❌ Failed to download video for editing');
          }
        } catch (error) {
          console.error('❌ Error downloading video for editing:', error);
        }
      }
      
      // Download photos if they exist
      if (firebaseData.photoURLs && firebaseData.photoURLs.length > 0) {
        console.log('📝 Downloading photos for editing...');
        const photoPromises = firebaseData.photoURLs.map(async (photoURL: string) => {
          try {
            const photoResponse = await fetch(photoURL);
            if (photoResponse.ok) {
              return await photoResponse.blob();
            } else {
              console.error('❌ Failed to download photo for editing');
              return null;
            }
          } catch (error) {
            console.error('❌ Error downloading photo for editing:', error);
            return null;
          }
        });
        
        const downloadedPhotos = await Promise.all(photoPromises);
        photoBlobs = downloadedPhotos.filter((photo): photo is Blob => photo !== null);
        console.log(`✅ Downloaded ${photoBlobs.length} photos for editing`);
      }
      
      // Convert Firebase data to local Vostcard format
      const editableVostcard = {
        id: firebaseData.id,
        state: 'posted' as const,
        video: videoBlob,
        title: firebaseData.title || '',
        description: firebaseData.description || '',
        photos: photoBlobs,
        categories: firebaseData.categories || [],
        geo: firebaseData.latitude && firebaseData.longitude 
          ? { latitude: firebaseData.latitude, longitude: firebaseData.longitude }
          : null,
        username: firebaseData.username || '',
        userID: firebaseData.userID || '',
        createdAt: firebaseData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: firebaseData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isOffer: firebaseData.isOffer || false,
        offerDetails: firebaseData.offerDetails || null,
        script: firebaseData.script || null,
        scriptId: firebaseData.scriptId || null,
        // Store Firebase URLs as backup
        _firebaseVideoURL: firebaseData.videoURL || null,
        _firebasePhotoURLs: firebaseData.photoURLs || []
      };
      
      console.log('📝 Converted vostcard for editing:', {
        id: editableVostcard.id,
        title: editableVostcard.title,
        hasVideo: !!editableVostcard.video,
        photosCount: editableVostcard.photos.length,
        categoriesCount: editableVostcard.categories.length
      });
      
      // Set as current vostcard in context
      setCurrentVostcard(editableVostcard);
      
      return editableVostcard;
      
    } catch (error) {
      console.error('❌ Error loading posted vostcard for editing:', error);
      throw error;
    }
  };

  // Navigate to edit view - go directly to step 2 since video can't be edited
  const handleEdit = async (vostcardId: string) => {
    try {
      console.log('📝 Edit clicked for posted vostcard:', vostcardId);
      
      // Show loading state
      setUnpostingIds(prev => new Set([...prev, vostcardId]));
      
      // Load the vostcard for editing
      await loadPostedVostcardForEdit(vostcardId);
      
      // Navigate directly to step 2 (skip video step)
      navigate('/create-step2');
      
    } catch (error) {
      console.error('❌ Failed to load vostcard for editing:', error);
      alert('Failed to load vostcard for editing. Please try again.');
    } finally {
      // Remove loading state
      setUnpostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
    }
  };

  const handleView = (vostcardId: string) => {
    navigate(`/vostcard/${vostcardId}`);
  };

  const handleEmail = (e: React.MouseEvent, vostcard: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get user's first name
    const getUserFirstName = () => {
      if (username) {
        return username.split(' ')[0];
      } else if (user?.displayName) {
        return user.displayName.split(' ')[0];
      } else if (user?.email) {
        return user.email.split('@')[0];
      }
      return 'Anonymous';
    };
    
    const subject = encodeURIComponent(`Check out my Vōstcard: "${vostcard.title}"`);
    
    const body = encodeURIComponent(`Hi,

I made this with an app called Vōstcard

View it here: ${window.location.origin}/email/${vostcard.id}

${vostcard.description || 'Description'}

Cheers!

${getUserFirstName()}`);
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleUnpost = async (e: React.MouseEvent, vostcardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to unpost this Vōstcard? It will be removed from the map.')) {
      return;
    }

    try {
      console.log('🗑️ Unposting vostcard:', vostcardId);
      
      // Add to unposting state
      setUnpostingIds(prev => new Set([...prev, vostcardId]));
      
      // Update the vostcard state to private in Firebase
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await updateDoc(vostcardRef, {
        state: 'private',
        visibility: 'private',
        unpostedAt: new Date()
      });
      
      console.log('✅ Vostcard unposted successfully');
      
      // Refresh the posted vostcards list
      await loadPostedVostcards();
      
    } catch (error) {
      console.error('❌ Error unposting vostcard:', error);
      alert('Failed to unpost Vōstcard. Please try again.');
    } finally {
      // Remove from unposting state
      setUnpostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, vostcardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this Vōstcard permanently? This action cannot be undone.')) {
      return;
    }

    console.log('🗑️ Delete clicked for posted vostcard:', vostcardId);
    
    try {
      // Show loading state
      setUnpostingIds(prev => new Set([...prev, vostcardId]));
      
      // Delete from Firebase
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await deleteDoc(vostcardRef);
      
      console.log('✅ Posted vostcard deleted successfully from Firebase:', vostcardId);
      
      // Remove local copy (if applicable) by calling loadPostedVostcards
      await loadPostedVostcards();
      
    } catch (error) {
      console.error('❌ Failed to delete posted vostcard from Firebase:', error);
      alert('Failed to delete Vōstcard. Please try again.');
    } finally {
      // Clear loading state
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

  if (authLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  console.log('🔄 Rendering MyPostedVostcardsListView', {
    loading,
    error,
    postedVostcardsCount: postedVostcards.length
  });

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#f5f5f5' }}>
      {/* 🔵 Header with Home Icon */}
      <div style={{
        backgroundColor: '#07345c',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '16px',
        color: 'white',
        position: 'relative',
        padding: '15px 0 24px 20px'
      }}>
        <h1 style={{ fontSize: '30px', margin: 0 }}>Posted Vōstcards</h1>
        
        {/* Home Button */}
        <FaHome
          size={48}
          style={{
            cursor: 'pointer',
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
            justifyContent: 'center'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* 📋 List of Vostcards */}
      <div style={{ 
        padding: '20px', 
        height: 'calc(100vh - 120px)', 
        overflowY: 'auto',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'auto'
      }}>
        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #ffcdd2'
          }}>
            <p style={{ margin: 0 }}>{error}</p>
            <button
              onClick={handleRetry}
              style={{
                backgroundColor: '#c62828',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666'
          }}>
            <p>Loading your posted Vostcards...</p>
          </div>
        ) : error ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#e74c3c'
          }}>
            <p>{error}</p>
            <button
              onClick={handleRetry}
              style={{
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Retry
            </button>
          </div>
        ) : postedVostcards.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666'
          }}>
            <h2>No Posted Vōstcards Found</h2>
            <p>You haven't posted any Vōstcards yet.</p>
            <button
              onClick={() => navigate('/home')}
              style={{
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Create Your First Vōstcard
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#495057'
            }}>
              {postedVostcards.length} Posted Vōstcard{postedVostcards.length !== 1 ? 's' : ''} on the Map
            </div>

            {/* Vostcard List */}
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {[...postedVostcards]
                .sort((a, b) => {
                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                  return dateB.getTime() - dateA.getTime();
                })
                .map((vostcard, index) => (
                <div
                  key={vostcard.id}
                  style={{
                    padding: '20px',
                    margin: '16px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0',
                    opacity: unpostingIds.has(vostcard.id) ? 0.5 : 1
                  }}
                >
                  {/* Title */}
                  <div style={{
                    marginBottom: '12px'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      color: '#002B4D',
                      fontSize: '18px'
                    }}>
                      {vostcard.title || 'Untitled Vōstcard'}
                    </h3>
                  </div>

                  {/* Description */}
                  {vostcard.description && (
                    <p style={{
                      margin: '0 0 12px 0',
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}>
                      {vostcard.description.split('\n')[0]}
                    </p>
                  )}

                  {/* Action Icons */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    marginTop: '8px'
                  }}>
                    {/* Edit Icon */}
                    <div
                      style={{
                        cursor: unpostingIds.has(vostcard.id) ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        opacity: unpostingIds.has(vostcard.id) ? 0.5 : 1
                      }}
                      onClick={() => !unpostingIds.has(vostcard.id) && handleEdit(vostcard.id)}
                      onMouseDown={(e) => !unpostingIds.has(vostcard.id) && (e.currentTarget.style.transform = 'scale(0.95)')}
                      onMouseUp={(e) => !unpostingIds.has(vostcard.id) && (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => !unpostingIds.has(vostcard.id) && (e.currentTarget.style.transform = 'scale(1)')}
                      title={unpostingIds.has(vostcard.id) ? 'Loading...' : 'Edit Vostcard'}
                    >
                      <FaEdit size={20} color="#002B4D" />
                    </div>
                    
                    {/* 🔧 NEW: Pin Icon */}
                    <div
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6'
                      }}
                      onClick={() => {
                        if (vostcard.latitude && vostcard.longitude) {
                          // Navigate to PinPlacerTool with vostcard data
                          navigate('/pin-placer', {
                            state: {
                              pinData: {
                                id: vostcard.id,
                                title: vostcard.title || 'Untitled Vostcard',
                                description: vostcard.description || '',
                                latitude: vostcard.latitude,
                                longitude: vostcard.longitude,
                                isOffer: vostcard.isOffer || false,
                                userID: vostcard.userID || vostcard.userId
                              }
                            }
                          });
                        } else {
                          alert('No location available for this Vostcard');
                        }
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title="Edit Pin Location"
                    >
                      <FaMapPin size={20} color="#e74c3c" />
                    </div>
                    
                    {/* View Icon */}
                    <div
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6'
                      }}
                      onClick={() => handleView(vostcard.id)}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title="View Vostcard"
                    >
                      <FaEye size={20} color="#6c757d" />
                    </div>

                    {/* Email Icon */}
                    <div
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6'
                      }}
                      onClick={(e) => handleEmail(e, vostcard)}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title="Email Vostcard"
                    >
                      <FaEnvelope size={20} color="#007bff" />
                    </div>

                    {/* Delete Icon */}
                    <div
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6'
                      }}
                      onClick={(e) => handleDelete(e, vostcard.id)}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title="Delete Vostcard"
                    >
                      <FaTrash size={20} color="#dc3545" />
                    </div>
                  </div>

                  {/* Un-post Button */}
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={(e) => handleUnpost(e, vostcard.id)}
                      disabled={unpostingIds.has(vostcard.id)}
                      style={{
                        backgroundColor: unpostingIds.has(vostcard.id) ? '#6c757d' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: unpostingIds.has(vostcard.id) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (!unpostingIds.has(vostcard.id)) {
                          e.currentTarget.style.backgroundColor = '#c82333';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!unpostingIds.has(vostcard.id)) {
                          e.currentTarget.style.backgroundColor = '#dc3545';
                        }
                      }}
                    >
                      {unpostingIds.has(vostcard.id) ? '⏳ Un-posting...' : '📤 Un-post'}
                    </button>
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

export default MyPostedVostcardsListView; 