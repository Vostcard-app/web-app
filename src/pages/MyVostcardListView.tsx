import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaMapPin, FaTrash, FaEye, FaShare, FaTimes } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, deleteDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// ✅ NEW: Import our refactored utilities and types
import { getVostcardStatus, generateShareText, createErrorMessage } from '../utils/vostcardUtils';
// Video is optional in the unified flow
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import type { Vostcard } from '../types/VostcardTypes';
import SharedOptionsModal from '../components/SharedOptionsModal';

const MyVostcardListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username } = useAuth();
  const { savedVostcards, setSavedVostcards, downloadVostcardContent, deletePrivateVostcard, setCurrentVostcard, loadLocalVostcard, syncVostcardMetadata, loadPrivateVostcards, debugIndexedDB } = useVostcard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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

  // Debug: Log savedVostcards details
  if (savedVostcards.length > 0) {
    console.log('📱 Personal posts found:', savedVostcards.map(v => ({
      id: v.id,
      title: v.title,
      // Removed isQuickcard field
      createdAt: v.createdAt,
      state: v.state
    })));
  } else {
    console.log('📱 No personal posts found. Checking loading state:', {
      loading,
      authLoading,
      user: !!user,
      error
    });
  }

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
            setError('Please log in to view your personal posts.');
            setLoading(false);
            return;
          }

          // Load personal vostcards from IndexedDB via VostcardContext
          console.log('🔄 Loading personal vostcards from IndexedDB...');
          await loadPrivateVostcards();
          
          console.log('✅ Personal Posts loaded successfully');
          
        } catch (error) {
          console.error('❌ Error loading personal posts:', error);
          setError(createErrorMessage(error, 'Failed to load personal posts'));
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [authLoading, user, loadPrivateVostcards]);

  // Watch for changes in savedVostcards and update loading state
  useEffect(() => {
    if (!authLoading && user) {
      setLoading(false);
    }
  }, [savedVostcards, authLoading, user]);

  // ✅ REMOVED: Replaced with imported utility functions
  // const getVostcardStatus = (vostcard: any) => { ... }
  // const isReadyToPost = (vostcard: any) => { ... }

  const handleEdit = async (vostcardId: string) => {
    let vostcard = savedVostcards.find((v: Vostcard) => v.id === vostcardId);
    if (!vostcard) return;

    // If we only have metadata, load full content on-demand
    if ((vostcard as any)._isMetadataOnly) {
      try {
        await downloadVostcardContent(vostcardId);
        vostcard = (savedVostcards.find((v: Vostcard) => v.id === vostcardId) || vostcard) as Vostcard;
      } catch (e) {
        console.error('❌ Failed to load full content for editing:', e);
      }
    }

    // Ensure we hydrate like detail views: require resolved photoURLs/videoURL when Files aren't present
    try {
      const hasFiles = Array.isArray((vostcard as any).photos) && (vostcard as any).photos.length > 0;
      const hasUrls = Array.isArray((vostcard as any).photoURLs) && (vostcard as any).photoURLs.length > 0;
      const hasVideo = !!((vostcard as any).video || (vostcard as any).videoURL);
      if (!hasFiles && (!hasUrls || !hasVideo)) {
        await downloadVostcardContent(vostcardId);
        vostcard = (savedVostcards.find((v: Vostcard) => v.id === vostcardId) || vostcard) as Vostcard;
      }
    } catch (e) {
      console.warn('⚠️ Non-fatal: could not fully hydrate content before edit:', e);
    }

    // Load from Firebase to ensure we have the latest data
    try {
      const docRef = doc(db, 'vostcards', vostcardId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedVostcard = {
          id: vostcardId,
          title: data.title || '',
          description: data.description || '',
          categories: Array.isArray(data.categories) ? data.categories : [],
          username: data.username || '',
          userID: data.userID || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          state: data.state || 'private',
          type: 'vostcard' as const,
          video: null,
          photos: [],
          geo: data.geo || { latitude: data.latitude, longitude: data.longitude } || null,
          hasVideo: data.hasVideo || false,
          hasPhotos: data.hasPhotos || false,
          _firebaseVideoURL: data.videoURL || null,
          _firebasePhotoURLs: Array.isArray(data.photoURLs) ? data.photoURLs : [],
          _isMetadataOnly: true,
          // Add any missing fields from the original vostcard
          ...Object.keys(vostcard).reduce((acc, key) => {
            if (!(key in data)) {
              acc[key] = vostcard[key];
            }
            return acc;
          }, {})
        };
        setCurrentVostcard(updatedVostcard);
      } else {
        console.warn('⚠️ Could not find vostcard in Firebase, proceeding with current object');
        setCurrentVostcard({
          ...vostcard,
          state: vostcard.state || 'private',
          type: 'vostcard' as const
        });
      }
    } catch (e) {
      console.warn('⚠️ Could not load from Firebase before edit, proceeding with current object');
      setCurrentVostcard({
        ...vostcard,
        state: vostcard.state || 'private',
        type: 'vostcard' as const
      });
    }
    console.log('🔄 Editing in unified flow:', vostcard.id);
    navigate(`/edit/${vostcardId}`);
  };

  const handleView = (vostcardId: string) => {
    const sortedVostcards = [...savedVostcards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const currentIndex = sortedVostcards.findIndex(vc => vc.id === vostcardId);
    
    navigate(`/vostcard/${vostcardId}`, {
      state: {
        vostcardList: sortedVostcards.map(vc => vc.id),
        currentIndex: currentIndex
      }
    });
  };

  const handleShare = async (e: React.MouseEvent, vostcard: Vostcard) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show public sharing warning only for private/personal posts
    const confirmMessage = `⚠️ Attention:

This will create a public link for your post. Anyone with the link can see it.

Tap OK to continue.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    try {
      console.log('🔄 Starting share process for:', vostcard.id);
      
      // Validate vostcard data
      if (!vostcard || !vostcard.id) {
        throw new Error('Invalid vostcard data');
      }
      
      // Generate public share URL
      const shareUrl = `${window.location.origin}/share/${vostcard.id}`;
      
      console.log('📍 Generated share URL:', shareUrl);
      
      // Generate share text using utility
      const shareText = generateShareText(vostcard, shareUrl);
      console.log('📝 Generated share text:', shareText);
      
      // Try native sharing first
      if (navigator.share && typeof navigator.share === 'function') {
        console.log('📱 Using native share API');
        try {
          await navigator.share({ text: shareText });
          console.log('✅ Native share completed successfully');
          return;
        } catch (shareError: any) {
          console.warn('⚠️ Native share failed, falling back to clipboard:', shareError.message);
          // Fall through to clipboard method
        }
      } else {
        console.log('📋 Native share not available, using clipboard');
      }
      
      // Fallback to clipboard
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareText);
        console.log('✅ Clipboard copy successful');
        alert('Public share link copied to clipboard!');
      } else {
        // Final fallback - show the text for manual copying
        console.log('📋 Clipboard API not available, showing text');
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Public share link copied to clipboard!');
      }
      
    } catch (error: any) {
      console.error('❌ Share error details:', {
        error: error.message,
        stack: error.stack,
        vostcard: vostcard?.id,
        title: vostcard?.title
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to share. ';
      if (error.message.includes('Invalid vostcard')) {
        errorMessage += 'Invalid post data.';
      } else if (error.message.includes('clipboard')) {
        errorMessage += 'Unable to copy to clipboard.';
      } else if (error.message.includes('share')) {
        errorMessage += 'Sharing not supported on this device.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
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
      await syncVostcardMetadata();
      
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



  const handleRetry = () => {
    console.log('🔄 Retrying to load personal posts (metadata sync)...');
    syncVostcardMetadata();
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

  // If user is not authenticated, show a light UI with a Login button
  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f5f5f5', padding: 20
      }}>
        <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#002B4D' }}>Personal Posts</h2>
          <p style={{ color: '#555' }}>Please log in to view your personal posts.</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: 8,
              padding: '12px 20px', cursor: 'pointer', fontWeight: 600
            }}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  // Render immediately with a lightweight skeleton to minimize initial work on iOS 18
  if (loading && !error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          Loading your posts…
        </div>
      </div>
    );
  }

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
          <h1 
          onClick={() => navigate('/home')}
          style={{ fontSize: '30px', margin: 0, cursor: 'pointer' }}
        >
          Personal Posts
        </h1>
          
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
          WebkitOverflowScrolling: 'auto',
          background: '#f5f5f5'
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
            <h2>No Personal Posts Found</h2>
            <p>You haven't created any personal posts yet.</p>
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
              color: '#495057',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{savedVostcards.length} Personal Post{savedVostcards.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Personal Posts List */}
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {savedVostcards.length > 0 && savedVostcards.map((vostcard, index) => {
                  const missingItems = getVostcardStatus(vostcard);
                  const isDeleting = deletingIds.has(vostcard.id);
                  
                  return (
                <div
                      key={vostcard.id}
                      style={{
                        padding: '16px',
                        margin: '12px 8px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        border: '1px solid #ececec',
                        opacity: isDeleting ? 0.5 : 1
                      }}
                    >
                      {/* Title */}
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
                          onClick={() => !isDeleting && handleEdit(vostcard.id)}
                          onMouseDown={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(0.95)')}
                          onMouseUp={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(1)')}
                          onMouseLeave={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(1)')}
                          title={isDeleting ? 'Loading...' : 'Edit Vostcard'}
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
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.1s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            opacity: isDeleting ? 0.5 : 1,
                            pointerEvents: 'auto', // Ensure pointer events are enabled
                            zIndex: 10 // Ensure it's above other elements
                          }}
                          onClick={(e) => {
                            console.log('🗑️ Delete icon div clicked!');
                            console.log('🗑️ isDeleting:', isDeleting);
                            if (!isDeleting) {
                              handleDelete(e, vostcard.id);
                            } else {
                              console.log('🗑️ Delete click ignored - item is processing');
                            }
                          }}
                          onMouseDown={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(0.95)')}
                          onMouseUp={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(1)')}
                          onMouseLeave={(e) => !isDeleting && (e.currentTarget.style.transform = 'scale(1)')}
                          title={isDeleting ? 'Loading...' : 'Delete Vostcard'}
                        >
                          <FaTrash size={20} color="#dc3545" />
                        </div>
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
            type: 'vostcard'
          }}
        />
      )}
    </div>
  );
};

export default MyVostcardListView; 