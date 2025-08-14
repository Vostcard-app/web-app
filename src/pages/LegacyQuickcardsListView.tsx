import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaMapPin, FaTrash, FaEye, FaShare, FaTimes } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const QuickcardListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { savedVostcards, loadAllLocalVostcardsImmediate, deletePrivateVostcard, setCurrentVostcard, syncInBackground } = useVostcard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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
          
          // Sync in background with Firebase
          await syncInBackground();

          console.log('✅ Quickcards loaded:', quickcards.length);

        } catch (error) {
          console.error('❌ Error loading quickcards:', error);
          setError('Failed to load quickcards. Please try again.');
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
      // Unified edit route
      navigate(`/edit/${quickcardId}`);
    }
  };

  const handleView = (quickcardId: string) => {
    const currentIndex = quickcards.findIndex(q => q.id === quickcardId);
    navigate(`/quickcard/${quickcardId}`, {
      state: {
        vostcardList: quickcards.map(q => q.id),
        currentIndex: currentIndex
      }
    });
  };

  const handleDelete = async (quickcardId: string) => {
    if (!window.confirm('Are you sure you want to delete this quickcard? This action cannot be undone.')) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(quickcardId));
    
    try {
      await deletePrivateVostcard(quickcardId);
      console.log('✅ Quickcard deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting quickcard:', error);
      alert('Failed to delete quickcard. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(quickcardId);
        return next;
      });
    }
  };

  const handleShare = async (quickcardId: string) => {
    // Show public sharing warning
    const confirmMessage = `⚠️ Attention:

This will create a public link for your post. Anyone with the link can see it.

Tap OK to continue.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    try {
      const quickcard = quickcards.find(q => q.id === quickcardId);
      if (!quickcard) return;

      if (quickcard.visibility === 'public') {
        const shareUrl = `${window.location.origin}/share-quickcard/${quickcardId}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Public share link copied to clipboard!');
      } else {
        await updateDoc(doc(db, 'quickcards', quickcardId), {
          visibility: 'public',
          updatedAt: new Date()
        });
        
        const shareUrl = `${window.location.origin}/share-quickcard/${quickcardId}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Quickcard made public and share link copied to clipboard!');
        
        await syncInBackground();
      }
    } catch (error) {
      console.error('❌ Error sharing quickcard:', error);
      alert('Failed to share quickcard. Please try again.');
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #002B4D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading your quickcards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>😕</div>
          <h2 style={{ color: '#333', marginBottom: '15px' }}>Oops!</h2>
          <p style={{ color: '#666', marginBottom: '25px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      paddingBottom: '20px'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        backgroundColor: '#002B4D',
        color: 'white',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}>
        <h1 
          onClick={() => navigate('/home')}
          style={{ margin: 0, fontSize: '24px', cursor: 'pointer' }}
        >
          My Quickcards ({quickcards.length})
        </h1>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <FaHome color="white" size={40} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', marginTop: '88px' }}>
        {quickcards.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📸</div>
            <h2 style={{ color: '#333', marginBottom: '15px' }}>No Quickcards Yet</h2>
            <p style={{ color: '#666', marginBottom: '25px' }}>
              Create your first quickcard to get started!
            </p>
            <button
              onClick={() => navigate('/home')}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Create Quickcard
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {quickcards.map(quickcard => {
              const isDeleting = deletingIds.has(quickcard.id);
              
              return (
                <div
                  key={quickcard.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    opacity: isDeleting ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {/* Image */}
                  {quickcard.imageUrl && (
                    <img
                      src={quickcard.imageUrl}
                      alt={quickcard.title}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}
                    />
                  )}

                  {/* Title */}
                  <h3 style={{
                    margin: '0 0 10px 0',
                    color: '#333',
                    fontSize: '18px'
                  }}>
                    {quickcard.title || 'Untitled'}
                  </h3>

                  {/* Description */}
                  {quickcard.description && (
                    <p style={{
                      color: '#666',
                      fontSize: '14px',
                      margin: '0 0 15px 0',
                      lineHeight: 1.4
                    }}>
                      {quickcard.description.length > 100
                        ? `${quickcard.description.substring(0, 100)}...`
                        : quickcard.description
                      }
                    </p>
                  )}

                  {/* Visibility Badge */}
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    backgroundColor: quickcard.visibility === 'public' ? '#28a745' : '#6c757d',
                    color: 'white'
                  }}>
                    {quickcard.visibility === 'public' ? 'Public' : 'Private'}
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '15px'
                  }}>
                    <button
                      onClick={() => handleEdit(quickcard.id)}
                      disabled={isDeleting}
                      style={{
                        backgroundColor: '#007aff',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaEdit size={12} />
                      Edit
                    </button>

                    <button
                      onClick={() => handleView(quickcard.id)}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaEye size={12} />
                      View
                    </button>

                    <button
                      onClick={() => handleShare(quickcard.id)}
                      style={{
                        backgroundColor: '#ffc107',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaShare size={12} />
                      Share
                    </button>

                    <button
                      onClick={() => handleDelete(quickcard.id)}
                      disabled={isDeleting}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaTrash size={12} />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickcardListView; 