import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaMapPin, FaTrash, FaEye, FaShare, FaTimes } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// ✅ NEW: Import our refactored utilities and types
import { getVostcardStatus, isReadyToPost, generateShareText, createErrorMessage } from '../utils/vostcardUtils';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import type { Vostcard } from '../types/VostcardTypes';
import SharedOptionsModal from '../components/SharedOptionsModal';

const MyVostcardListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username } = useAuth();
  const { savedVostcards, loadAllLocalVostcardsImmediate, syncInBackground, deletePrivateVostcard, setCurrentVostcard, postVostcard } = useVostcard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [postingIds, setPostingIds] = useState<Set<string>>(new Set());
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const [showSharedOptions, setShowSharedOptions] = useState(false);
  const [selectedVostcard, setSelectedVostcard] = useState<Vostcard | null>(null);

  console.log('🔄 MyVostcardListView rendered', {
    authLoading,
    user: !!user,
    loading,
    error,
    savedVostcardsCount: savedVostcards.length
  });

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            setError('Please log in to view your private posts.');
            navigate('/login');
            return;
          }

          // 🚀 PERFORMANCE IMPROVEMENT: Load immediately from local storage
          await loadAllLocalVostcardsImmediate();
          
          // 🔄 Sync in background without blocking UI (deletion markers will use localStorage fallback)
          syncInBackground().catch(error => {
            console.error('❌ Background sync failed:', error);
            // Don't show error to user since local data is already loaded
          });
          
          console.log('✅ Private Posts loaded successfully');
          
        } catch (error) {
          console.error('❌ Error loading private posts:', error);
          // ✅ NEW: Use utility for consistent error handling
          setError(createErrorMessage(error, 'Failed to load private posts'));
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [authLoading, user, loadAllLocalVostcardsImmediate, syncInBackground, navigate]);

  // ✅ REMOVED: Replaced with imported utility functions
  // const getVostcardStatus = (vostcard: any) => { ... }
  // const isReadyToPost = (vostcard: any) => { ... }

  const handleEdit = (vostcardId: string) => {
    const vostcard = savedVostcards.find((v: Vostcard) => v.id === vostcardId);
    if (vostcard) {
      setCurrentVostcard(vostcard);
      navigate('/create-step2');
    }
  };

  const handleView = (vostcardId: string) => {
    navigate(`/vostcard/${vostcardId}`);
  };

  const handleShare = async (e: React.MouseEvent, vostcard: Vostcard) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show public sharing warning
    const confirmMessage = `⚠️ Attention:

This will create a public link for your post. Anyone with the link can see it.

Tap OK to continue.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    try {
      // Generate public share URL
      const isQuickcard = vostcard.isQuickcard === true;
      const shareUrl = isQuickcard 
        ? `${window.location.origin}/share-quickcard/${vostcard.id}`
        : `${window.location.origin}/share/${vostcard.id}`;
      
      // Generate share text using utility
      const shareText = generateShareText(vostcard, shareUrl);
      
      // Use native sharing or clipboard
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Public share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, vostcardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🗑️ Delete icon clicked! vostcardId:', vostcardId);
    console.log('🗑️ Event details:', { type: e.type, target: e.target, currentTarget: e.currentTarget });
    
    if (!window.confirm('Are you sure you want to delete this post permanently? This action cannot be undone.')) {
      console.log('🗑️ User cancelled deletion');
      return;
    }

    console.log('🗑️ Delete confirmed for private post:', vostcardId);
    console.log('🗑️ Current savedVostcards count before deletion:', savedVostcards.length);
    console.log('🗑️ Vostcard to delete exists in list:', savedVostcards.some(v => v.id === vostcardId));
    
    try {
      // Show loading state
      setDeletingIds(prev => new Set([...prev, vostcardId]));
      
      // Delete from both IndexedDB and Firebase
      console.log('🗑️ Calling deletePrivateVostcard...');
      await deletePrivateVostcard(vostcardId);
      
      console.log('✅ Private post deleted successfully:', vostcardId);
      console.log('✅ Current savedVostcards count after deletion:', savedVostcards.length);
      
      // Force refresh the local vostcards list to ensure UI updates
      console.log('🔄 Refreshing vostcard list...');
      await loadAllLocalVostcardsImmediate();
      
      console.log('✅ Vostcard list refreshed after deletion');
      console.log('✅ Final savedVostcards count:', savedVostcards.length);
      
      // Clear loading state
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
      
    } catch (error) {
      console.error('❌ Failed to delete private post:', error);
      console.error('❌ Delete error details:', {
        vostcardId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Clear loading state
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
      
      alert('Failed to delete post. Please try again.');
    }
  };

  const handlePost = async (e: React.MouseEvent, vostcard: Vostcard) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isReadyToPost(vostcard)) {
      alert('Please complete all required fields before posting.');
      return;
    }

    console.log('📤 Post clicked for private post:', vostcard.id);
    
    try {
      // Show loading state
      setPostingIds(prev => new Set([...prev, vostcard.id]));
      
      // Post the vostcard
      await postVostcard(vostcard);
      
      console.log('✅ Private post posted successfully:', vostcard.id);
      
      // Clear loading state
      setPostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcard.id);
        return newSet;
      });
      
    } catch (error) {
      console.error('❌ Failed to post private post:', error);
      
      // Clear loading state
      setPostingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcard.id);
        return newSet;
      });
      
      alert('Failed to publish post. Please try again.');
    }
  };

  const handleRetry = () => {
    console.log('🔄 Retrying to load private posts...');
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
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDesktop ? '#f0f0f0' : '#f5f5f5',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: isDesktop ? '20px' : '0'
    }}>
      {/* Mobile-style container with responsive design */}
      <div style={{
        width: isDesktop ? '390px' : '100%',
        maxWidth: '390px',
        height: isDesktop ? '844px' : '100vh',
        backgroundColor: '#f5f5f5',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: isDesktop ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'all 0.3s ease'
      }}>
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
          padding: '15px 0 24px 20px',
          borderRadius: isDesktop ? '16px 16px 0 0' : '0',
          flexShrink: 0
        }}>
          <h1 style={{ fontSize: '30px', margin: 0 }}>Personal Posts</h1>
          
          {/* Home Button */}
          <FaHome
            size={40}
            style={{
              cursor: 'pointer',
              position: 'absolute',
              right: 29,
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
          flex: 1,
          overflowY: 'auto',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'auto'
        }}>
        {/* Error State */}
        {error && (
          <ErrorMessage message={error} onRetry={handleRetry} />
        )}

        {/* Loading State */}
        {loading && !error ? (
          <LoadingSpinner />
        ) : savedVostcards.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666'
          }}>
            <h2>No Private Posts Found</h2>
            <p>You haven't created any private posts yet.</p>
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
              Create Your First Post
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
              {savedVostcards.length} Private Post{savedVostcards.length !== 1 ? 's' : ''}
            </div>

            {/* Private Posts List */}
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
                      {/* Title with Type Indicator */}
                      <div style={{
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <h3 style={{ 
                          margin: 0, 
                          color: '#002B4D',
                          fontSize: '18px'
                        }}>
                          {vostcard.title || 'Untitled'}
                        </h3>
                        {/* Type Badge */}
                        <span style={{
                          backgroundColor: vostcard.isQuickcard ? '#ff9800' : '#2196f3',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          {vostcard.isQuickcard ? 'Quickcard' : 'Vostcard'}
                        </span>
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
                            // Try multiple location sources
                            let latitude = vostcard.geo?.latitude;
                            let longitude = vostcard.geo?.longitude;
                            
                            // Fallback to direct fields if geo object is missing
                            if (!latitude || !longitude) {
                              latitude = (vostcard as any).latitude;
                              longitude = (vostcard as any).longitude;
                            }
                            
                            if (latitude && longitude) {
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
                          onClick={(e) => handleShare(e, vostcard)}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Share Vostcard"
                        >
                          <FaShare size={20} color="#007bff" />
                        </div>

                        {/* Delete Icon */}
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
                            opacity: (isDeleting || isPosting) ? 0.5 : 1,
                            pointerEvents: 'auto', // Ensure pointer events are enabled
                            zIndex: 10 // Ensure it's above other elements
                          }}
                          onClick={(e) => {
                            console.log('🗑️ Delete icon div clicked!');
                            console.log('🗑️ isDeleting:', isDeleting, 'isPosting:', isPosting);
                            if (!(isDeleting || isPosting)) {
                              handleDelete(e, vostcard.id);
                            } else {
                              console.log('🗑️ Delete click ignored - item is processing');
                            }
                          }}
                          onMouseDown={(e) => !(isDeleting || isPosting) && (e.currentTarget.style.transform = 'scale(0.95)')}
                          onMouseUp={(e) => !(isDeleting || isPosting) && (e.currentTarget.style.transform = 'scale(1)')}
                          onMouseLeave={(e) => !(isDeleting || isPosting) && (e.currentTarget.style.transform = 'scale(1)')}
                          title={(isDeleting || isPosting) ? 'Loading...' : 'Delete Vostcard'}
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

      {/* Share Options Modal */}
      {selectedVostcard && (
        <SharedOptionsModal
          isOpen={showSharedOptions}
          onClose={() => {
            setShowSharedOptions(false);
            setSelectedVostcard(null);
          }}
          item={{
            id: selectedVostcard.id,
            title: selectedVostcard.title,
            description: selectedVostcard.description,
            isQuickcard: selectedVostcard.isQuickcard
          }}
        />
      )}
    </div>
  );
};

export default MyVostcardListView; 