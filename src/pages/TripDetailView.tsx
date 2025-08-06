import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaMapMarkerAlt, FaCalendar, FaImage, FaPlay, FaChevronRight, FaShare, FaEye, FaTrash, FaExclamationTriangle, FaEdit, FaTimes, FaList, FaMap, FaPhotoVideo, FaPlus, FaSave } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { TripService } from '../services/tripService';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import type { Trip, TripItem } from '../types/TripTypes';

// Import pin assets
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import QuickcardPin from '../assets/quickcard_pin.png';

// Custom icons for the map
const vostcardIcon = new L.Icon({
  iconUrl: VostcardPin,
  iconSize: [60, 60],
  iconAnchor: [30, 60],
  popupAnchor: [0, -60],
});

const offerIcon = new L.Icon({
  iconUrl: OfferPin,
  iconSize: [60, 60],
  iconAnchor: [30, 60],
  popupAnchor: [0, -60],
});

const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [60, 60],
  iconAnchor: [30, 60],
  popupAnchor: [0, -60],
});

const guideIcon = new L.Icon({
  iconUrl: '/Guide_pin.png',
  iconSize: [60, 60],
  iconAnchor: [30, 60],
  popupAnchor: [0, -60],
});

const TripDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsStatus, setItemsStatus] = useState<Map<string, { exists: boolean; loading: boolean }>>(new Map());
  const [cleaning, setCleaning] = useState(false);
  
  // Add Post modal states
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [availablePosts, setAvailablePosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [addingPosts, setAddingPosts] = useState<Set<string>>(new Set());

  
  // View mode states
  type ViewMode = 'list' | 'map' | 'slideshow';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  


  console.log('🔄 TripDetailView rendered', {
    id,
    user: !!user,
    loading,
    error,
    trip: trip?.name
  });

  useEffect(() => {
    if (id) {
      loadTrip();
    } else {
      setError('Invalid trip ID');
      setLoading(false);
    }
  }, [id]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        console.log('❌ No user authenticated');
        setError('Please log in to view this trip.');
        navigate('/login');
        return;
      }

      console.log('📋 Loading trip:', id);
      const tripData = await TripService.getTripById(id!);
      setTrip(tripData);
      
      // Debug ownership information
      console.log('🔍 Trip ownership debug:', {
        tripName: tripData.name,
        tripUserID: tripData.userID,
        currentUserUid: user.uid,
        isOwner: user.uid === tripData.userID
      });
      
      console.log(`✅ Loaded trip: ${tripData.name} with ${tripData.items.length} items`);

    } catch (err) {
      console.error('❌ Error loading trip:', err);
      setError('Failed to load trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: TripItem) => {
    console.log('🔄 Item clicked:', item.vostcardID, item.type);
    if (item.type === 'quickcard') {
      navigate(`/quickcard/${item.vostcardID}`);
    } else {
      navigate(`/vostcard/${item.vostcardID}`);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    try {
      // Handle Firestore Timestamp or ISO string
      const jsDate = typeof date === 'string' ? new Date(date) : date.toDate ? date.toDate() : new Date(date);
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getItemTypeIcon = (item: TripItem) => {
    if (item.type === 'quickcard') {
      return <FaImage style={{ color: '#007aff' }} />;
    } else {
      return <FaPlay style={{ color: '#34c759' }} />;
    }
  };

  const getItemTypeLabel = (item: TripItem) => {
    return item.type === 'quickcard' ? 'Quickcard' : 'Vostcard';
  };

  // ✅ Check if content still exists
  const checkContentExists = async (vostcardID: string) => {
    try {
      const docRef = doc(db, 'vostcards', vostcardID);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking content:', error);
      return false;
    }
  };

  // ✅ Check all trip items for existence
  const checkAllItemsExistence = async () => {
    if (!trip) return;
    
    const statusMap = new Map();
    
    for (const item of trip.items) {
      statusMap.set(item.vostcardID, { exists: false, loading: true });
      setItemsStatus(new Map(statusMap));
      
      const exists = await checkContentExists(item.vostcardID);
      statusMap.set(item.vostcardID, { exists, loading: false });
      setItemsStatus(new Map(statusMap));
    }
  };

  // ✅ Remove duplicates and deleted items
  const cleanupTrip = async () => {
    if (!trip || !id) return;
    
    setCleaning(true);
    try {
      // Find unique items (remove duplicates) and existing items
      const seen = new Set<string>();
      const validItems: TripItem[] = [];
      
      for (const item of trip.items) {
        const itemKey = `${item.vostcardID}-${item.type}`;
        
        // Skip duplicates
        if (seen.has(itemKey)) {
          console.log('🗑️ Removing duplicate:', item.title);
          await TripService.removeItemFromTrip(id, item.id);
          continue;
        }
        
        // Check if content exists
        const exists = await checkContentExists(item.vostcardID);
        if (!exists) {
          console.log('🗑️ Removing deleted content:', item.title);
          await TripService.removeItemFromTrip(id, item.id);
          continue;
        }
        
        seen.add(itemKey);
        validItems.push(item);
      }
      
      // Reload the trip to show cleaned data
      const updatedTrip = await TripService.getTripById(id);
      setTrip(updatedTrip);
      
      alert(`✅ Trip cleaned up!\n\n• Removed ${trip.items.length - validItems.length} duplicate/deleted items\n• ${validItems.length} valid items remaining`);
      
    } catch (error) {
      console.error('Error cleaning trip:', error);
      alert(`Error cleaning trip: ${error.message || 'Unknown error'}`);
    } finally {
      setCleaning(false);
    }
  };

  // ✅ Check for issues in the trip (for cleanup button)
  const getTripIssues = () => {
    if (!trip) return { duplicates: 0, deleted: 0 };
    
    const seen = new Set<string>();
    let duplicates = 0;
    let deleted = 0;
    
    trip.items.forEach(item => {
      const itemKey = `${item.vostcardID}-${item.type}`;
      if (seen.has(itemKey)) {
        duplicates++;
      } else {
        seen.add(itemKey);
      }
      
      const status = itemsStatus.get(item.vostcardID);
      if (status && !status.loading && !status.exists) {
        deleted++;
      }
    });
    
    return { duplicates, deleted };
  };



  // Remove item from trip
  const handleRemoveItemFromTrip = async (itemId: string) => {
    if (!trip) return;
    
    try {
      await TripService.removeItemFromTrip(trip.id, itemId);
      
      // Update trip by removing the item
      setTrip(prev => prev ? {
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      } : null);
      
      console.log('✅ Item removed from trip successfully');
      
    } catch (error) {
      console.error('Error removing item from trip:', error);
      alert('Failed to remove item from trip. Please try again.');
    }
  };



  // Handle share trip
  const handleShareTrip = async () => {
    if (!trip) return;
    
    try {
      // If trip is private, make it public first
      if (trip.isPrivate) {
        const updatedTrip = await TripService.updateTrip(trip.id, {
          isPrivate: false
        });
        setTrip(updatedTrip);
      }
      
      // Generate share URL
      const shareUrl = trip.shareableLink 
        ? `${window.location.origin}/trip/${trip.shareableLink}`
        : `${window.location.origin}/trip/${trip.id}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('✅ Share link copied to clipboard!\n\nAnyone with this link can view your trip.');
      
    } catch (error) {
      console.error('Error sharing trip:', error);
      // Fallback for browsers that don't support clipboard API
      const shareUrl = trip.shareableLink 
        ? `${window.location.origin}/trip/${trip.shareableLink}`
        : `${window.location.origin}/trip/${trip.id}`;
      alert(`Share this link:\n\n${shareUrl}`);
    }
  };

  // Add Post functionality
  const handleOpenAddPostModal = async () => {
    setShowAddPostModal(true);
    setLoadingPosts(true);
    
    try {
      // Load user's posts that aren't already in this trip
      const currentItemIds = trip?.items.map(item => item.vostcardID) || [];
      
      // Get user's posted vostcards (public posts)
      const userPostsQuery = query(
        collection(db, 'vostcards'),
        where('userID', '==', user?.uid),
        where('state', '==', 'posted'),
        orderBy('createdAt', 'desc')
      );
      
      const userPostsSnapshot = await getDocs(userPostsQuery);
      const userPosts = userPostsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'vostcard'
      }));
      
      // Get user's quickcards
      const quickcardsQuery = query(
        collection(db, 'quickcards'),
        where('userID', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      
      const quickcardsSnapshot = await getDocs(quickcardsQuery);
      const quickcards = quickcardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'quickcard'
      }));
      
      // Combine and filter out posts already in trip
      const allPosts = [...userPosts, ...quickcards].filter(post => 
        !currentItemIds.includes(post.id)
      );
      
      setAvailablePosts(allPosts);
      
    } catch (error) {
      console.error('Error loading available posts:', error);
      alert('Failed to load your posts. Please try again.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleAddPostToTrip = async (post: any) => {
    if (!trip) return;
    
    setAddingPosts(prev => new Set([...prev, post.id]));
    
    try {
      const addItemData = {
        vostcardID: post.id,
        type: post.type,
        title: post.title || 'Untitled',
        description: post.description,
        photoURL: post.photoURLs?.[0] || post.photoURL || null,
        latitude: post.latitude,
        longitude: post.longitude
      };
      
      await TripService.addItemToTrip(trip.id, addItemData);
      
      // Refresh the trip to show the new item
      await loadTrip();
      
      // Remove from available posts
      setAvailablePosts(prev => prev.filter(p => p.id !== post.id));
      
      console.log('✅ Added post to trip:', post.id);
      
    } catch (error) {
      console.error('Error adding post to trip:', error);
      alert('Failed to add post to trip. Please try again.');
    } finally {
      setAddingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(post.id);
        return newSet;
      });
    }
  };

  const handleCloseAddPostModal = () => {
    setShowAddPostModal(false);
    setAvailablePosts([]);
  };

  const handleSaveTrip = async () => {
    if (!trip || !user) return;
    
    try {
      // For now, just show a success message since trip is auto-saved
      // In the future, this could save any pending edits
      alert('Trip saved successfully!');
      console.log('✅ Trip saved:', trip.title);
    } catch (error) {
      console.error('❌ Error saving trip:', error);
      alert('Failed to save trip. Please try again.');
    }
  };

  // Function to get the appropriate icon for a trip item
  const getIconForItem = (item: TripItem) => {
    if (item.isOffer) return offerIcon;
    if (item.isQuickcard) {
      // Check user role for quickcards
      if (item.userRole === 'guide' || item.userRole === 'admin') {
        return guideIcon;
      }
      return quickcardIcon;
    }
    // Regular vostcard - check if posted by guide
    if (item.userRole === 'guide') return guideIcon;
    return vostcardIcon;
  };

  // ✅ Check items existence when trip loads
  useEffect(() => {
    if (trip && trip.items.length > 0) {
      checkAllItemsExistence();
    }
  }, [trip]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isDesktop ? '20px' : '0'
      }}>
        <div style={{
          width: isDesktop ? '390px' : '100%',
          maxWidth: '390px',
          height: isDesktop ? '844px' : '100vh',
          backgroundColor: '#fff',
          boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
          borderRadius: isDesktop ? '16px' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #007aff', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#666', fontSize: '14px' }}>Loading trip...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isDesktop ? '20px' : '0'
      }}>
        <div style={{
          width: isDesktop ? '390px' : '100%',
          maxWidth: '390px',
          height: isDesktop ? '844px' : '100vh',
          backgroundColor: '#fff',
          boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
          borderRadius: isDesktop ? '16px' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#ff3b30', fontSize: '16px', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={loadTrip}
              style={{
                background: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isDesktop ? '20px' : '0'
      }}>
        <div style={{
          width: isDesktop ? '390px' : '100%',
          maxWidth: '390px',
          height: isDesktop ? '844px' : '100vh',
          backgroundColor: '#fff',
          boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
          borderRadius: isDesktop ? '16px' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#666', fontSize: '16px' }}>Trip not found</p>
            <button
              onClick={() => navigate('/my-trips')}
              style={{
                background: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              Back to My Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: isDesktop ? '20px' : '0'
    }}>
      <div style={{
        width: isDesktop ? '390px' : '100%',
        maxWidth: '390px',
        height: isDesktop ? '844px' : '100vh',
        backgroundColor: '#fff',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: isDesktop ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        
        {/* Header */}
        <div style={{
          background: '#07345c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '32px 24px 24px 24px',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderTopLeftRadius: isDesktop ? 16 : 0,
          borderTopRightRadius: isDesktop ? 16 : 0,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <button
              onClick={() => navigate('/my-trips')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <FaArrowLeft />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{
                color: 'white',
                fontWeight: 700,
                fontSize: '1.5rem',
                margin: 0,
                lineHeight: '1.2'
              }}>{trip.name}</h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '12px', 
                margin: '4px 0 0 0' 
              }}>
                {(() => {
                  const visibleCount = trip.items.filter((item) => {
                    const status = itemsStatus.get(item.vostcardID);
                    return !status || status.loading || status.exists;
                  }).length;
                  return `${visibleCount} ${visibleCount === 1 ? 'item' : 'items'}`;
                })()}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* ✅ Cleanup button if there are issues */}
            {(() => {
              const issues = getTripIssues();
              if (issues.duplicates > 0 || issues.deleted > 0) {
                return (
                  <button
                    onClick={cleanupTrip}
                    disabled={cleaning}
                    style={{
                      background: cleaning ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: cleaning ? 'not-allowed' : 'pointer',
                      color: 'white',
                      position: 'relative'
                    }}
                    title={`Clean up ${issues.duplicates} duplicates and ${issues.deleted} deleted items`}
                  >
                    {cleaning ? (
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        border: '2px solid #fff3cd', 
                        borderTop: '2px solid #fff', 
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <FaTrash size={14} />
                    )}
                    {/* Issue indicator */}
                    <div style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      background: '#dc3545',
                      color: 'white',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      fontSize: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}>
                      {issues.duplicates + issues.deleted}
                    </div>
                  </button>
                );
              }
              return null;
            })()}
            
            {/* Add Post Button - Only show for trip owner */}
            {user && trip && user.uid === trip.userID && (
              <button
                onClick={handleOpenAddPostModal}
                style={{
                  background: 'rgba(76, 175, 80, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                }}
                title="Add Post to Trip"
              >
                <FaPlus size={14} />
              </button>
            )}
            
            {/* Save Trip Button - Only show for trip owner */}
            {user && trip && user.uid === trip.userID && (
              <button
                onClick={handleSaveTrip}
                style={{
                  background: 'rgba(0, 122, 255, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                }}
                title="Save Trip"
              >
                <FaSave size={14} />
              </button>
            )}
            
            {/* Share Trip Button */}
            <button
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
              onClick={handleShareTrip}
              title="Share Trip"
            >
              <FaShare size={16} />
            </button>
            
            <button
              onClick={() => navigate('/home')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <FaHome size={16} />
            </button>
          </div>
        </div>

        {/* Trip Info */}
        <div style={{ padding: '20px 20px 16px 20px' }}>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            fontSize: '12px',
            color: '#888',
            marginBottom: '16px'
          }}>
            <FaCalendar />
            Created {formatDate(trip.createdAt)}
          </div>

          {/* Trip Description */}
          {trip.description && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <p style={{ 
                margin: '0',
                fontSize: '14px', 
                color: '#555',
                lineHeight: '1.4',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
              }}>
                {trip.description}
              </p>
            </div>
          )}

          {/* View Mode Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                backgroundColor: viewMode === 'list' ? '#007aff' : '#f0f0f0',
                color: viewMode === 'list' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <FaList size={12} />
              List View
            </button>
            
            <button
              onClick={() => setViewMode('map')}
              style={{
                backgroundColor: viewMode === 'map' ? '#007aff' : '#f0f0f0',
                color: viewMode === 'map' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <FaMap size={12} />
              Map View
            </button>
            
            <button
              onClick={() => setViewMode('slideshow')}
              style={{
                backgroundColor: viewMode === 'slideshow' ? '#007aff' : '#f0f0f0',
                color: viewMode === 'slideshow' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <FaPhotoVideo size={12} />
              Slideshow
            </button>
          </div>
          
          {trip.isPublic && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#e8f4fd',
              color: '#007aff',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              marginTop: '8px'
            }}>
              <FaEye size={10} />
              Public Trip
            </div>
          )}
        </div>

        {/* Content Area - List or Map View */}
        <div style={{ 
          flex: 1,
          padding: viewMode === 'map' ? '0' : '0 20px 20px 20px',
          overflowY: viewMode === 'map' ? 'hidden' : 'auto'
        }}>
          {viewMode === 'map' ? (
            // Map View
            (() => {
              const itemsWithLocation = trip.items.filter((item) => {
                const status = itemsStatus.get(item.vostcardID);
                const exists = !status || status.loading || status.exists;
                return exists && item.latitude && item.longitude;
              });

              if (itemsWithLocation.length === 0) {
                return (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#666'
                  }}>
                    <div>
                      <FaMapMarkerAlt size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
                      <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No locations to show</h3>
                      <p style={{ margin: 0, fontSize: '14px' }}>
                        None of the posts in this trip have location data.
                      </p>
                    </div>
                  </div>
                );
              }

              // Calculate center point of all locations
              const centerLat = itemsWithLocation.reduce((sum, item) => sum + parseFloat(item.latitude!), 0) / itemsWithLocation.length;
              const centerLng = itemsWithLocation.reduce((sum, item) => sum + parseFloat(item.longitude!), 0) / itemsWithLocation.length;

              return (
                <div style={{ height: '100%', position: 'relative' }}>
                  <MapContainer
                    center={[centerLat, centerLng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {itemsWithLocation.map((item) => (
                      <Marker
                        key={item.id}
                        position={[parseFloat(item.latitude!), parseFloat(item.longitude!)]}
                        icon={getIconForItem(item)}
                      >
                        <Popup>
                          <div style={{ minWidth: '200px' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                              {item.title || 'Untitled'}
                            </h4>
                            {item.description && (
                              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                                {item.description.length > 100 
                                  ? `${item.description.substring(0, 100)}...` 
                                  : item.description}
                              </p>
                            )}
                            <div style={{ fontSize: '12px', color: '#888' }}>
                              {item.isQuickcard ? 'Quickcard' : item.isOffer ? 'Offer' : 'Vostcard'}
                              {item.username && ` • by ${item.username}`}
                            </div>
                            <button
                              onClick={() => handleItemClick(item)}
                              style={{
                                marginTop: '8px',
                                background: '#007aff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              View Details
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              );
            })()
          ) : (
            // List View
            (() => {
              const visibleItems = trip.items.filter((item) => {
                const status = itemsStatus.get(item.vostcardID);
                return !status || status.loading || status.exists;
              });
              const totalItems = trip.items.length;
            
            // No items at all in database
            if (totalItems === 0) {
              return (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666'
                }}>
                  <FaMapMarkerAlt size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No items yet</h3>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    Add vostcards and quickcards to this trip when creating content!
                  </p>
                </div>
              );
            }
            
            // Has items but all are deleted (hidden)
            if (visibleItems.length === 0 && totalItems > 0) {
              return (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666'
                }}>
                  <FaExclamationTriangle size={48} style={{ color: '#ffc107', marginBottom: '16px' }} />
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>All items deleted</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                    This trip had {totalItems} {totalItems === 1 ? 'item' : 'items'}, but all content has been deleted.
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
                    Use the cleanup button above to remove deleted items permanently.
                  </p>
                </div>
              );
            }
            
            // Show the items list
            return null; // This will fall through to the items list
          })() || (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trip.items
                .sort((a, b) => a.order - b.order) // Sort by order
                .filter((item) => {
                  // ✅ Filter out deleted items automatically
                  const status = itemsStatus.get(item.vostcardID);
                  return !status || status.loading || status.exists;
                })
                .map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#007aff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                >
                  {/* Delete Button */}
                  {user && trip && user.uid === trip.userID && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('This will remove the item from the trip. Are you sure?')) {
                          handleRemoveItemFromTrip(item.id);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        color: '#dc3545',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '12px',
                        zIndex: 10,
                        opacity: 0.7,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.backgroundColor = '#dc3545';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                        e.currentTarget.style.color = '#dc3545';
                      }}
                      title="Remove from trip"
                    >
                      <FaTimes />
                    </button>
                  )}

                  <div 
                    onClick={() => handleItemClick(item)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.photoURL ? (
                        <img
                          src={item.photoURL}
                          alt={item.title || 'Post image'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.innerHTML = item.type === 'quickcard' ? '📷' : '📱';
                            e.currentTarget.parentElement.style.fontSize = '24px';
                            e.currentTarget.parentElement.style.color = '#999';
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '24px', color: '#999' }}>
                          {item.type === 'quickcard' ? '📷' : '📱'}
                        </span>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.title || 'Untitled'}
                      </h3>
                      
                      {item.description && (
                        <p style={{ 
                          margin: '0', 
                          fontSize: '14px', 
                          color: '#666',
                          lineHeight: '1.3',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.description.split('\n')[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* ✅ Show message if items were filtered out */}
              {(() => {
                const totalItems = trip.items.length;
                const visibleItems = trip.items.filter((item) => {
                  const status = itemsStatus.get(item.vostcardID);
                  return !status || status.loading || status.exists;
                }).length;
                
                const hiddenItems = totalItems - visibleItems;
                
                if (hiddenItems > 0) {
                  return (
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      color: '#6c757d',
                      fontSize: '13px',
                      marginTop: '8px'
                    }}>
                      <FaExclamationTriangle style={{ color: '#ffc107', marginRight: '6px' }} />
                      {hiddenItems} deleted {hiddenItems === 1 ? 'item' : 'items'} hidden from view
                      {hiddenItems > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '11px' }}>
                          Use the cleanup button above to remove {hiddenItems === 1 ? 'it' : 'them'} permanently
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
            ))
          )}
        </div>
      </div>

      {/* Add Post Modal */}
      {showAddPostModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={handleCloseAddPostModal}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#333'
              }}>
                Add Post to Trip
              </h3>
              <button
                onClick={handleCloseAddPostModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Loading State */}
            {loadingPosts && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #f3f3f3',
                  borderTop: '3px solid #007aff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                Loading your posts...
              </div>
            )}

            {/* Posts List */}
            {!loadingPosts && (
              <>
                {availablePosts.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#666'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>
                      No posts available
                    </p>
                    <p style={{ margin: '0', fontSize: '14px' }}>
                      All your posts are already in this trip or you haven't created any posts yet.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {availablePosts.map((post) => {
                      const isAdding = addingPosts.has(post.id);
                      return (
                        <div
                          key={post.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            backgroundColor: isAdding ? '#f8f9fa' : 'white'
                          }}
                        >
                          {/* Thumbnail */}
                          <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {(post.photoURLs?.[0] || post.photoURL) ? (
                              <img
                                src={post.photoURLs?.[0] || post.photoURL}
                                alt={post.title || 'Post'}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: '20px', color: '#999' }}>
                                {post.type === 'quickcard' ? '📷' : '📱'}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              margin: '0 0 4px 0',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#333',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {post.title || 'Untitled'}
                            </h4>
                            <p style={{
                              margin: '0',
                              fontSize: '12px',
                              color: '#666',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {post.type === 'quickcard' ? 'Quickcard' : 'Vostcard'}
                              {post.description && ` • ${post.description}`}
                            </p>
                          </div>

                          {/* Add Button */}
                          <button
                            onClick={() => handleAddPostToTrip(post)}
                            disabled={isAdding}
                            style={{
                              backgroundColor: isAdding ? '#ccc' : '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '12px',
                              cursor: isAdding ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0
                            }}
                          >
                            {isAdding ? (
                              <>
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  border: '2px solid #fff',
                                  borderTop: '2px solid transparent',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }} />
                                Adding...
                              </>
                            ) : (
                              <>
                                <FaPlus size={10} />
                                Add
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS Animation for loading spinner */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />

    </div>
  );
};

export default TripDetailView;