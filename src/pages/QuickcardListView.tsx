import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaEdit, FaMapPin, FaTrash, FaEye, FaShare, FaTimes, FaMicrophone } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const QuickcardListView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { savedVostcards, loadAllLocalVostcardsImmediate, deletePrivateVostcard, setCurrentVostcard, syncInBackground } = useVostcard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Check if we came from Vostcard Studio
  const fromStudio = location.state?.fromStudio === true;

  // Filter quickcards from savedVostcards
  const quickcards = savedVostcards.filter(vostcard => vostcard.isQuickcard === true);

  console.log('🔄 QuickcardListView rendered', {
    authLoading,
    user: !!user,
    loading,
    error,
    quickcardsCount: quickcards.length,
    savedVostcardsCount: savedVostcards.length
  });

  useEffect(() => {
    console.log('🔄 Auth state changed:', { authLoading, user: !!user });
    
    if (!authLoading) {
      const loadData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          if (!user) {
            console.log('❌ No user authenticated');
            setError('Please log in to view your quickcards.');
            navigate('/login');
            return;
          }

          // Load quickcards immediately from IndexedDB
          await loadAllLocalVostcardsImmediate();
          
          // Then sync with Firebase in the background
          console.log('🔄 Starting Firebase sync for quickcards...');
          await syncInBackground();
          
          console.log('✅ Quickcards loaded and synced successfully');
          
        } catch (error) {
          console.error('❌ Error loading quickcards:', error);
          setError(`Failed to load quickcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [authLoading, user, loadAllLocalVostcardsImmediate, navigate, syncInBackground]);

  const handleEdit = (quickcardId: string) => {
    const quickcard = quickcards.find(q => q.id === quickcardId);
    if (quickcard) {
      setCurrentVostcard(quickcard);
      navigate('/quickcard-step3'); // Skip to step 3 for quickcards
    }
  };

  // NEW: Handle selecting quickcard for audio enhancement
  const handleSelectForAudio = (quickcardId: string) => {
    const quickcard = quickcards.find(q => q.id === quickcardId);
    if (quickcard) {
      setCurrentVostcard(quickcard);
      navigate('/vostcard-studio'); // Navigate back to studio with selected quickcard
    }
  };

  const handleView = (quickcardId: string) => {
    navigate(`/quickcard/${quickcardId}`);
  };

  const handleShare = async (e: React.MouseEvent, quickcard: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Update the Quickcard to mark it as privately shared
      if (quickcard?.id) {
        const quickcardRef = doc(db, 'vostcards', quickcard.id);
        await updateDoc(quickcardRef, {
          isPrivatelyShared: true,
          sharedAt: new Date()
        });
      }
      
      // Generate private share URL - FIXED: Use share-quickcard instead of share
      const privateUrl = `${window.location.origin}/share-quickcard/${quickcard.id}`;
      
      const shareText = `Check it out I made this with Vōstcard


"${quickcard?.title || 'Untitled Quickcard'}"


"${quickcard?.description || 'No description'}"


${privateUrl}`;
      
      if (navigator.share) {
        navigator.share({
          text: shareText
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Private share message copied to clipboard!');
        }).catch(() => {
          alert(`Share this message: ${shareText}`);
        });
      }
    } catch (error) {
      console.error('Error sharing Quickcard:', error);
      alert('Failed to share Quickcard. Please try again.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, quickcardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this Quickcard permanently? This action cannot be undone.')) {
      return;
    }

    console.log('🗑️ Delete clicked for quickcard:', quickcardId);
    
    try {
      setDeletingIds(prev => new Set([...prev, quickcardId]));
      
      await deletePrivateVostcard(quickcardId);
      
      console.log('✅ Quickcard deleted successfully:', quickcardId);
      
      // Refresh quickcards list
      await loadAllLocalVostcardsImmediate();
      
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(quickcardId);
        return newSet;
      });
      
    } catch (error) {
      console.error('❌ Error deleting quickcard:', error);
      setError(`Failed to delete quickcard: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(quickcardId);
        return newSet;
      });
    }
  };

  console.log('🔄 Rendering QuickcardListView', {
    loading,
    error,
    quickcardsCount: quickcards.length
  });

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with Home Icon */}
      <div style={{
        backgroundColor: '#07345c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white',
        position: 'relative',
        padding: '15px 20px 15px 20px',
        flexShrink: 0
      }}>
        <h1 style={{ fontSize: '30px', margin: 0 }}>
          {fromStudio ? 'Select Quickcard for Audio' : 'Quickcards'}
        </h1>
        
        {/* Home Button */}
        <button
          onClick={() => navigate('/home')}
          style={{
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <FaHome size={24} />
        </button>
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Loading state */}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            color: '#666'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading quickcards...</div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            color: '#d32f2f'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>❌ {error}</div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#002B4D',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <div style={{ 
            padding: '20px',
            flex: 1,
            overflow: 'auto'
          }}>
            {/* Summary */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}>
              <h2 style={{ 
                margin: '0 0 10px 0', 
                color: '#002B4D',
                fontSize: '20px'
              }}>
                {quickcards.length} Quickcard{quickcards.length !== 1 ? 's' : ''}
              </h2>
              <p style={{ 
                margin: 0, 
                color: '#666',
                fontSize: '14px'
              }}>
                {fromStudio 
                  ? 'Select a quickcard to enhance with audio in Vostcard Studio' 
                  : 'Your private quickcards with single photos'
                }
              </p>
            </div>

            {/* Empty state or Quickcards List */}
            {quickcards.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
                <h3 style={{ 
                  margin: '0 0 10px 0', 
                  color: '#002B4D',
                  fontSize: '18px'
                }}>
                  No Quickcards Yet
                </h3>
                <p style={{ 
                  margin: '0 0 20px 0', 
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Create your first quickcard using the "Create Quickcard" button on the home screen
                </p>
                <button
                  onClick={() => navigate('/home')}
                  style={{
                    backgroundColor: '#002B4D',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Go to Home
                </button>
              </div>
            ) : (
              /* Quickcards List */
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {[...quickcards]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((quickcard) => {
                  const isDeleting = deletingIds.has(quickcard.id);
                  
                  return (
                    <div
                      key={quickcard.id}
                      style={{
                        padding: '20px',
                        margin: '16px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid #e0e0e0',
                        opacity: isDeleting ? 0.5 : 1
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
                          {quickcard.title || 'Untitled Quickcard'}
                        </h3>
                      </div>

                      {/* Description */}
                      {quickcard.description && (
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
                          {quickcard.description.split('\n')[0]}
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
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.1s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            opacity: isDeleting ? 0.5 : 1
                          }}
                          onClick={() => !isDeleting && handleEdit(quickcard.id)}
                          onMouseDown={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(0.95)')}
                          onMouseUp={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(1)')}
                          onMouseLeave={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(1)')}
                          title={isDeleting ? 'Loading...' : 'Edit Quickcard'}
                        >
                          <FaEdit size={20} color="#002B4D" />
                        </div>
                        
                        {/* Pin Icon */}
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
                            // Try multiple location sources
                            let latitude = quickcard.geo?.latitude;
                            let longitude = quickcard.geo?.longitude;
                            
                            // Fallback to direct fields if geo object is missing
                            if (!latitude || !longitude) {
                              latitude = (quickcard as any).latitude;
                              longitude = (quickcard as any).longitude;
                            }
                            
                            if (latitude && longitude) {
                              // Navigate to PinPlacerTool with quickcard data
                              navigate('/pin-placer', {
                                state: {
                                  pinData: {
                                    id: quickcard.id,
                                    title: quickcard.title || 'Untitled Quickcard',
                                    description: quickcard.description || '',
                                    latitude: latitude,
                                    longitude: longitude,
                                    isOffer: false,
                                    isQuickcard: true,
                                    userID: quickcard.userID
                                  }
                                }
                              });
                            } else {
                              alert('No location available for this Quickcard');
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
                          onClick={() => handleView(quickcard.id)}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="View Quickcard"
                        >
                          <FaEye size={20} color="#6c757d" />
                        </div>

                        {/* Share Icon */}
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
                          onClick={(e) => handleShare(e, quickcard)}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Share Quickcard"
                        >
                          <FaShare size={20} color="#007bff" />
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
                          onClick={(e) => handleDelete(e, quickcard.id)}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Delete Quickcard"
                        >
                          <FaTrash size={20} color="#dc3545" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickcardListView; 