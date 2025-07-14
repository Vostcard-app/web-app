import React, { useEffect, useState } from 'react'; // 🔧 ONLY ADDED useState import
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaMapPin, FaTrash, FaEye, FaEnvelope, FaTimes } from 'react-icons/fa'; // 🔧 Added FaMapPin
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const MyVostcardListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { savedVostcards, loadAllLocalVostcardsImmediate, syncInBackground, deletePrivateVostcard, setCurrentVostcard, postVostcard } = useVostcard(); // 🔧 ONLY PERFORMANCE CHANGE + postVostcard
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [postingIds, setPostingIds] = useState<Set<string>>(new Set());

  console.log('🔄 MyVostcardListView rendered', {
    authLoading,
    user: !!user,
    loading,
    error,
    savedVostcardsCount: savedVostcards.length
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
            setError('Please log in to view your private Vostcards.');
            navigate('/login');
            return;
          }

          // 🚀 PERFORMANCE IMPROVEMENT: Load immediately from local storage
          await loadAllLocalVostcardsImmediate();
          
          // 🔄 Sync in background without blocking UI
          syncInBackground().catch(error => {
            console.error('❌ Background sync failed:', error);
            // Don't show error to user since local data is already loaded
          });
          
          console.log('✅ Private Vostcards loaded successfully');
          
        } catch (error) {
          console.error('❌ Error loading private Vostcards:', error);
          setError(`Failed to load private Vostcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [authLoading, user, loadAllLocalVostcardsImmediate, syncInBackground]);

  // Check what's missing for posting
  const getVostcardStatus = (vostcard: any) => {
    const missing = [];
    
    if (!vostcard.video) missing.push('Video');
    if (!vostcard.title) missing.push('Title');
    if (!vostcard.description) missing.push('Description');
    if (!vostcard.categories || vostcard.categories.length === 0) missing.push('Categories');
    if (!vostcard.photos || vostcard.photos.length < 2) missing.push('Photos (need at least 2)');
    if (!vostcard.geo) missing.push('Location');
    
    return missing;
  };

  const isReadyToPost = (vostcard: any) => {
    return getVostcardStatus(vostcard).length === 0;
  };

  const handleEdit = (vostcardId: string) => {
    const vostcard = savedVostcards.find(v => v.id === vostcardId);
    if (vostcard) {
      setCurrentVostcard(vostcard);
      navigate('/create-step2');
    }
  };

  const handleView = (vostcardId: string) => {
    navigate(`/vostcard/${vostcardId}`);
  };

  const handleEmail = (e: React.MouseEvent, vostcard: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const subject = encodeURIComponent(`Check out this Vōstcard: ${vostcard.title}`);
    const body = encodeURIComponent(`I thought you might be interested in this Vōstcard: ${vostcard.title}\n\nView it here: ${window.location.origin}/vostcard/${vostcard.id}`);
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleDelete = async (e: React.MouseEvent, vostcardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this Vōstcard permanently? This action cannot be undone.')) {
      return;
    }

    console.log('🗑️ Delete clicked for private vostcard:', vostcardId);
    
    try {
      // Show loading state
      setDeletingIds(prev => new Set([...prev, vostcardId]));
      
      // Delete from both IndexedDB and Firebase
      await deletePrivateVostcard(vostcardId);
      
      console.log('✅ Private vostcard deleted successfully:', vostcardId);
      
      // Clear loading state
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
      
    } catch (error) {
      console.error('❌ Failed to delete private vostcard:', error);
      
      // Clear loading state
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
      
      alert('Failed to delete Vōstcard. Please try again.');
    }
  };

  const handlePost = async (e: React.MouseEvent, vostcard: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isReadyToPost(vostcard)) {
      alert('Please complete all required fields before posting.');
      return;
    }

    console.log('📤 Post clicked for private vostcard:', vostcard.id);
    
    try {
      // Show loading state
      setPostingIds(prev => new Set([...prev, vostcard.id]));
      
      // Post the vostcard
      await postVostcard(vostcard);
      
      console.log('✅ Private vostcard posted successfully:', vostcard.id);
      
      // Clear loading state
      setPostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcard.id);
        return newSet;
      });
      
    } catch (error) {
      console.error('❌ Failed to post private vostcard:', error);
      
      // Clear loading state
      setPostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcard.id);
        return newSet;
      });
      
      alert('Failed to post Vōstcard. Please try again.');
    }
  };

  const handleRetry = () => {
    console.log('🔄 Retrying to load private Vostcards...');
    loadAllLocalVostcardsImmediate();
  };

  if (authLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  console.log('🔄 Rendering MyVostcardListView', {
    loading,
    error,
    savedVostcardsCount: savedVostcards.length
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
        <h1 style={{ fontSize: '30px', margin: 0 }}>Private Vōstcards</h1>
        
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
            <p>Loading your private Vostcards...</p>
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
        ) : savedVostcards.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666'
          }}>
            <h2>No Private Vōstcards Found</h2>
            <p>You haven't created any private Vōstcards yet.</p>
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
              {savedVostcards.length} Private Vōstcard{savedVostcards.length !== 1 ? 's' : ''}
            </div>

            {/* Vostcard List */}
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {[...savedVostcards]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((vostcard, index) => {
                  const missingItems = getVostcardStatus(vostcard);
                  const canPost = isReadyToPost(vostcard);
                  const isDeleting = deletingIds.has(vostcard.id);
                  const isPosting = postingIds.has(vostcard.id);
                  
                  return (
                    <div
                      key={vostcard.id}
                      style={{
                        padding: '20px',
                        margin: '16px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid #e0e0e0',
                        opacity: isDeleting || isPosting ? 0.5 : 1
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

                      {/* 🔴 Missing Elements with Red X */}
                      {missingItems.length > 0 && (
                        <div style={{
                          marginBottom: '12px',
                          padding: '8px 12px',
                          backgroundColor: '#ffebee',
                          borderRadius: '6px',
                          border: '1px solid #ffcdd2'
                        }}>
                          <div style={{
                            color: '#c62828',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            marginBottom: '4px'
                          }}>
                            Missing for posting:
                          </div>
                          {missingItems.map((item, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#c62828',
                              fontSize: '13px',
                              marginBottom: '2px'
                            }}>
                              <FaTimes size={12} style={{ marginRight: '6px' }} />
                              {item}
                            </div>
                          ))}
                        </div>
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
                            cursor: (isDeleting || isPosting) ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.1s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            opacity: (isDeleting || isPosting) ? 0.5 : 1
                          }}
                          onClick={() => !(isDeleting || isPosting) && handleEdit(vostcard.id)}
                          onMouseDown={(e) => !(isDeleting || isPosting) && (e.currentTarget.style.transform = 'scale(0.95)')}
                          onMouseUp={(e) => !(isDeleting || isPosting) && (e.currentTarget.style.transform = 'scale(1)')}
                          onMouseLeave={(e) => !(isDeleting || isPosting) && (e.currentTarget.style.transform = 'scale(1)')}
                          title={(isDeleting || isPosting) ? 'Loading...' : 'Edit Vostcard'}
                        >
                          <FaEdit size={20} color="#002B4D" />
                        </div>
                        
                        {/* 🔧 Pin Icon with better debugging */}
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
                            // 🔧 SIMPLE DEBUG: Basic alert to show data
                            alert(`DEBUG: Vostcard ID: ${vostcard.id}
Title: ${vostcard.title}
Geo: ${JSON.stringify(vostcard.geo)}
Geo Type: ${typeof vostcard.geo}
Has Geo Lat: ${vostcard.geo?.latitude}
Has Geo Lng: ${vostcard.geo?.longitude}
Direct Lat: ${(vostcard as any).latitude}
Direct Lng: ${(vostcard as any).longitude}`);
                            
                            // Also log to console (in case console is working)
                            console.log('🔍 DEBUG: Vostcard data:', vostcard);
                            
                            // Try multiple location sources
                            let latitude = vostcard.geo?.latitude;
                            let longitude = vostcard.geo?.longitude;
                            
                            // Fallback to direct fields if geo object is missing
                            if (!latitude || !longitude) {
                              latitude = (vostcard as any).latitude;
                              longitude = (vostcard as any).longitude;
                            }
                            
                            if (latitude && longitude) {
                              alert(`✅ Found location: ${latitude}, ${longitude}`);
                              // Navigate to PinPlacerTool with vostcard data
                              navigate('/pin-placer', {
                                state: {
                                  pinData: {
                                    id: vostcard.id,
                                    title: vostcard.title || 'Untitled Vostcard',
                                    description: vostcard.description || '',
                                    latitude: latitude,
                                    longitude: longitude,
                                    isOffer: vostcard.isOffer || false,
                                    userID: vostcard.userID
                                  }
                                }
                              });
                            } else {
                              alert('❌ No location found in vostcard');
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

                      {/* 📤 Post Button */}
                      <div style={{
                        marginTop: '12px',
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <button
                          onClick={(e) => handlePost(e, vostcard)}
                          disabled={!canPost || isPosting}
                          style={{
                            backgroundColor: canPost && !isPosting ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: canPost && !isPosting ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => {
                            if (canPost && !isPosting) {
                              e.currentTarget.style.backgroundColor = '#218838';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (canPost && !isPosting) {
                              e.currentTarget.style.backgroundColor = '#28a745';
                            }
                          }}
                        >
                          {isPosting ? '⏳ Posting...' : canPost ? '📤 Post to Map' : '📋 Complete to Post'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVostcardListView; 