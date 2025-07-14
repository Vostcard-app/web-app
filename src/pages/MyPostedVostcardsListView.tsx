import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaEye, FaEnvelope, FaTrash } from 'react-icons/fa';
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

  // Navigate to edit view - posted vostcards would need to be converted back to private for editing
  const handleEdit = (vostcardId: string) => {
    console.log('Edit clicked for vostcard:', vostcardId);
    // TODO: Implement edit functionality
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

  const handleDelete = (e: React.MouseEvent, vostcardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this Vōstcard permanently?')) {
      return;
    }

    console.log('Delete clicked for vostcard:', vostcardId);
    // TODO: Implement delete functionality
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
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          <FaHome size={20} />
        </button>
        <h1 style={{ fontSize: '30px', margin: 0 }}>Posted Vōstcards</h1>
      </div>

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
      {loading && !error && (
        <div style={{
          backgroundColor: '#e3f2fd',
          color: '#1976d2',
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <p>Loading your posted Vostcards...</p>
        </div>
      )}

      {/* 📋 List of Posted Vostcards */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
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
                      onClick={() => handleEdit(vostcard.id)}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title="Edit Vostcard"
                    >
                      <FaEdit size={20} color="#002B4D" />
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