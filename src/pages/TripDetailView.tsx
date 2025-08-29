import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaMapMarkerAlt, FaCalendar, FaImage, FaPlay, FaChevronRight, FaShare, FaEye, FaTrash, FaExclamationTriangle, FaEdit, FaTimes, FaList, FaMap, FaPhotoVideo, FaPlus, FaSave, FaMusic } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { TripService } from '../services/tripService';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import type { Trip, TripItem } from '../types/TripTypes';
import MultiPhotoModal from '../components/MultiPhotoModal';
import MusicPickerModal from '../components/MusicPickerModal';
import type { BackgroundMusic } from '../types/TripTypes';

// Import pin assets
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import QuickcardPin from '../assets/quickcard_pin.png';

// Custom icons for the map
const vostcardIcon = new L.Icon({
  iconUrl: VostcardPin,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const offerIcon = new L.Icon({
  iconUrl: OfferPin,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const guideIcon = new L.Icon({
  iconUrl: '/Guide_pin.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Component to auto-fit map bounds to show all pins
const AutoFitBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();

  React.useEffect(() => {
    if (positions.length > 0) {
      if (positions.length === 1) {
        // Single pin - center on it with a reasonable zoom
        map.setView(positions[0], 15);
      } else {
        // Multiple pins - fit to bounds
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { 
          padding: [20, 20], // Add some padding around the bounds
          maxZoom: 16 // Don't zoom in too much even for close pins
        });
      }
    }
  }, [map, positions]);

  return null;
};

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

  // Music picker
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  // Background music player for slideshow
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  
  // View mode states
  type ViewMode = 'list' | 'map' | 'slideshow';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Check if current user is viewing a shared trip (not the owner)
  const isViewingSharedTrip = trip && user && user.uid !== trip.userID;
  
  // Slideshow states
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState<Array<{url: string, postTitle: string}>>([]);
  const [loadingSlideshowImages, setLoadingSlideshowImages] = useState(false);
  const [slideshowAutoPlay, setSlideshowAutoPlay] = useState(false);

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

      // For shared trips (not owned by current user), default to thumbnail view
      if (user.uid !== tripData.userID) {
        console.log('🔄 Shared trip detected, defaulting to thumbnail view');
        setViewMode('slideshow'); // We'll show thumbnail instead of full slideshow initially
      }

      // ✅ Automatically cleanup trip if there are issues (duplicates or deleted items)
      if (tripData) {
        const issues = checkTripIssues(tripData);
        if (issues.duplicates > 0 || issues.deleted > 0) {
          console.log(`🧹 Auto-cleanup: Found ${issues.duplicates} duplicates and ${issues.deleted} deleted items`);
          
          try {
            await autoCleanupTrip(tripData);
            console.log('✅ Auto-cleanup completed successfully');
            
            // Reload the trip to get the cleaned data
            const cleanedTripData = await TripService.getTripById(id!);
            setTrip(cleanedTripData);
            console.log(`✅ Reloaded cleaned trip: ${cleanedTripData.items.length} items remaining`);
          } catch (cleanupError) {
            console.warn('⚠️ Auto-cleanup failed, trip loaded but with issues:', cleanupError);
            // Don't fail the entire load if cleanup fails, just log the warning
          }
        }
      }

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
    return checkTripIssues(trip);
  };

  // ✅ Helper function to check trip issues (reusable)
  const checkTripIssues = (tripData: Trip) => {
    const seen = new Set<string>();
    let duplicates = 0;
    let deleted = 0;
    
    tripData.items.forEach(item => {
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

  // ✅ Auto-cleanup function (reusable version of cleanupTrip)
  const autoCleanupTrip = async (tripData: Trip) => {
    if (!tripData || !id) return;
    
    // Find unique items (remove duplicates) and existing items
    const seen = new Set<string>();
    const validItems: TripItem[] = [];
    
    for (const item of tripData.items) {
      const itemKey = `${item.vostcardID}-${item.type}`;
      
      // Skip duplicates
      if (seen.has(itemKey)) {
        console.log(`🗑️ Auto-cleanup: Removing duplicate ${item.type}: ${item.title}`);
        continue;
      }
      
      // Skip deleted items  
      const status = itemsStatus.get(item.vostcardID);
      if (status && !status.loading && !status.exists) {
        console.log(`🗑️ Auto-cleanup: Removing deleted ${item.type}: ${item.title}`);
        continue;
      }
      
      seen.add(itemKey);
      validItems.push(item);
    }
    
    // Update trip with cleaned items
    if (validItems.length !== tripData.items.length) {
      await TripService.updateTrip(id, {
        items: validItems
      });
      console.log(`🧹 Auto-cleanup: Cleaned ${tripData.items.length - validItems.length} items from trip`);
    }
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
    
    // Show public sharing warning
    const confirmMessage = `⚠️ Attention:

This will create a public link for your trip. Anyone with the link can see it.

Tap OK to continue.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    try {
      // Mark trip as shared and public
      const updatedTrip = await TripService.updateTrip(trip.id, {
        isShared: true,
        isPrivate: false,
        visibility: 'public'
      });
      setTrip(updatedTrip);
      
      // Generate public share URL
      const shareUrl = `${window.location.origin}/share-trip/${updatedTrip.id}`;
      
      // Generate share text
      const shareText = `Check out this trip I created with Vōstcard

"${updatedTrip.name || 'My Trip'}"

${updatedTrip.description || 'A collection of my favorite places'}

${shareUrl}`;
      
      // Use native sharing or clipboard
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Share link copied to clipboard!');
      }
      
    } catch (error) {
      console.error('Error sharing trip:', error);
      alert('Failed to share trip. Please try again.');
    }
  };

  // Slideshow functionality with metadata
  const collectTripImages = async (): Promise<Array<{url: string, postTitle: string}>> => {
    if (!trip) return [];
    
    setLoadingSlideshowImages(true);
    const allImages: Array<{url: string, postTitle: string}> = [];
    
    try {
      // Filter out deleted items
      const validItems = trip.items.filter((item) => {
        const status = itemsStatus.get(item.vostcardID);
        return !status || status.loading || status.exists;
      });

      // Sort by order to maintain trip sequence
      const sortedItems = validItems.sort((a, b) => a.order - b.order);

      // Fetch full vostcard data for each item to get all photoURLs with titles
      for (const item of sortedItems) {
        try {
          const vostcardDoc = await getDoc(doc(db, 'vostcards', item.vostcardID));
          if (vostcardDoc.exists()) {
            const vostcardData = vostcardDoc.data();
            // Get photoURLs array, excluding videos
            if (vostcardData.photoURLs && Array.isArray(vostcardData.photoURLs)) {
              const postTitle = vostcardData.title || 'Untitled Post';
              // Add each photo with the post title
              vostcardData.photoURLs.forEach((photoUrl: string) => {
                allImages.push({
                  url: photoUrl,
                  postTitle: postTitle
                });
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch images for item ${item.vostcardID}:`, error);
        }
      }

      console.log(`✅ Collected ${allImages.length} images from ${sortedItems.length} trip posts`);
      return allImages;
    } catch (error) {
      console.error('Error collecting trip images:', error);
      return [];
    } finally {
      setLoadingSlideshowImages(false);
    }
  };

  // Handle slideshow mode
  const handleSlideshowMode = async () => {
    console.log('🎬 handleSlideshowMode called:', { viewMode, slideshowImagesLength: slideshowImages.length });
    
    if (viewMode !== 'slideshow') return;
    
    // Collect images if not already collected
    if (slideshowImages.length === 0) {
      console.log('🖼️ Collecting trip images...');
      const images = await collectTripImages();
      setSlideshowImages(images);
      
      console.log('🖼️ Images collected:', images.length);
      
      // Don't auto-start slideshow - let user manually trigger it
      if (images.length > 0) {
        console.log('🎬 Images ready for slideshow (manual start required)');
        // setShowSlideshow(true); // Commented out - no auto-start
      } else {
        // No images found, show message and switch back to appropriate view
        alert('No images found in this trip to display in slideshow.');
        setViewMode(isViewingSharedTrip ? 'map' : 'list');
      }
    } else {
      // Images already collected, ready for manual slideshow start
      console.log('🎬 Images already ready for slideshow (manual start required)');
      // setShowSlideshow(true); // Commented out - no auto-start
    }
  };

  // Start slideshow with music (called from user interaction)
  const startSlideshowWithMusic = async () => {
    console.log('🎬 Starting slideshow with music from user interaction');
    console.log('🎬 TripDetailView: Setting slideshowAutoPlay to true');
    
    // Enable auto-play for slideshow
    setSlideshowAutoPlay(true);
    
    // Start slideshow
    setShowSlideshow(true);
    
    // Immediately try to start music with user interaction context
    const audioEl = backgroundAudioRef.current;
    if (audioEl && trip?.backgroundMusic?.url) {
      try {
        const volume = typeof trip.backgroundMusic.volume === 'number' ? 
          Math.min(Math.max(trip.backgroundMusic.volume, 0), 1) : 0.5;
        
        // Load the audio source if not already loaded
        if (!audioEl.src || audioEl.src !== trip.backgroundMusic.url) {
          console.log('🎵 Loading audio source for user interaction:', trip.backgroundMusic.url);
          audioEl.src = trip.backgroundMusic.url;
          audioEl.load();
        }
        
        audioEl.volume = volume;
        audioEl.currentTime = 0;
        
        console.log('🎵 Starting music with user interaction context');
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              console.log('✅ Music started successfully with user interaction');
            })
            .catch((error) => {
              console.log('❌ Music failed to start even with user interaction:', error);
            });
        }
      } catch (e) {
        console.error('❌ Music start error:', e);
      }
    }
  };

  // Effect to handle slideshow mode changes
  useEffect(() => {
    if (viewMode === 'slideshow') {
      handleSlideshowMode();
    }
  }, [viewMode]);

  // Play/pause background music when slideshow opens/closes
  useEffect(() => {
    const audioEl = backgroundAudioRef.current;
    console.log('🎵 Music playback effect triggered:', {
      showSlideshow,
      hasAudioEl: !!audioEl,
      hasMusicUrl: !!trip?.backgroundMusic?.url,
      musicUrl: trip?.backgroundMusic?.url,
      volume: trip?.backgroundMusic?.volume
    });
    
    if (!audioEl) {
      console.log('❌ No audio element found');
      return;
    }
    
    try {
      if (showSlideshow && trip?.backgroundMusic?.url) {
        const volume = typeof trip.backgroundMusic.volume === 'number' ? Math.min(Math.max(trip.backgroundMusic.volume, 0), 1) : 0.5;
        
        // Load the audio source if not already loaded
        if (!audioEl.src || audioEl.src !== trip.backgroundMusic.url) {
          console.log('🎵 Loading audio source:', trip.backgroundMusic.url);
          audioEl.src = trip.backgroundMusic.url;
          audioEl.load(); // Force reload with new source
        }
        
        audioEl.volume = volume;
        audioEl.currentTime = 0;
        
        console.log('🎵 Starting music playback:', { volume, url: trip.backgroundMusic.url, readyState: audioEl.readyState });
        
        // Wait for audio to be ready before playing
        const tryPlay = () => {
          const playPromise = audioEl.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => {
                console.log('✅ Music started successfully');
              })
              .catch((error) => {
                console.log('❌ Music autoplay failed:', error);
                // Try to play after user interaction
                if (error.name === 'NotAllowedError') {
                  console.log('🎵 Autoplay blocked - music will start after user interaction');
                }
              });
          }
        };
        
        if (audioEl.readyState >= 2) { // HAVE_CURRENT_DATA
          tryPlay();
        } else {
          audioEl.addEventListener('canplay', tryPlay, { once: true });
        }
      } else {
        console.log('🎵 Pausing music:', { showSlideshow, hasUrl: !!trip?.backgroundMusic?.url });
        audioEl.pause();
      }
    } catch (e) {
      console.error('❌ Music playback error:', e);
    }
  }, [showSlideshow, trip?.backgroundMusic?.url]);

  // Add Post functionality
  const handleOpenAddPostModal = async () => {
    setShowAddPostModal(true);
    setLoadingPosts(true);
    
    try {
      // Load user's posts (both private and public) that aren't already in this trip
      const currentItemIds = trip?.items.map(item => item.vostcardID) || [];
      
      // Get user's vostcards (both private and public posts)
      let userVostcards: any[] = [];
      
      try {
        // Try with the indexed query first
        const userVostcardsQuery = query(
          collection(db, 'vostcards'),
          where('userID', '==', user?.uid),
          orderBy('createdAt', 'desc')
        );
        
        const userVostcardsSnapshot = await getDocs(userVostcardsQuery);
        userVostcards = userVostcardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'vostcard'
        }));
        
        console.log('🔍 Debug: Found userVostcards with index:', userVostcards.length, userVostcards);
      } catch (indexError) {
        console.log('🔍 Debug: Index query failed, trying without orderBy:', indexError);
        
        // Fallback: query without orderBy if index isn't ready
        try {
          const fallbackQuery = query(
            collection(db, 'vostcards'),
            where('userID', '==', user?.uid)
          );
          
          const fallbackSnapshot = await getDocs(fallbackQuery);
          userVostcards = fallbackSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: 'vostcard'
          }));
          
          // Sort manually
          userVostcards.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
            const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
            return bTime - aTime;
          });
          
          console.log('🔍 Debug: Found userVostcards with fallback:', userVostcards.length, userVostcards);
        } catch (fallbackError) {
          console.error('🔍 Debug: Both queries failed:', fallbackError);
          userVostcards = [];
        }
      }
      
      // No need to query quickcards - they have been eliminated
      
      console.log('🔍 Debug: Current trip items:', currentItemIds);
      
      // Filter out posts already in trip (only vostcards now)
      const allPosts = userVostcards.filter(post => 
        !currentItemIds.includes(post.id)
      );
      
      console.log('🔍 Debug: Final available posts:', allPosts.length, allPosts);
      
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
    // Show guide pin for all Jay Bond's vostcards
    if (item.username === 'Jay Bond') return guideIcon;
    
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
        maxHeight: isDesktop ? '844px' : '100vh',
        backgroundColor: '#fff',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: isDesktop ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' // Prevent outer container from scrolling
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
                fontSize: '18px',
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
            {/* ✅ Manual cleanup button (hidden since auto-cleanup is enabled) */}
            {(() => {
              const issues = getTripIssues();
              // Hidden since auto-cleanup runs automatically when loading trips
              if (false && (issues.duplicates > 0 || issues.deleted > 0)) {
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
            

            
            {/* Share Trip Button - Hide for trip owners, only show for shared trip viewers */}
            {isViewingSharedTrip && (
              <button
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
                onClick={handleShareTrip}
                title="Share Trip"
              >
                Share
              </button>
            )}
            
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

          {/* View Mode Controls */}
          {isViewingSharedTrip ? (
            /* Shared Trip: Simple header with date and toggle button */
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '12px 0'
            }}>
              {/* Create Date */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#666',
                fontSize: '14px'
              }}>
                <FaCalendar size={12} />
                {trip?.createdAt ? new Date(trip.createdAt).toLocaleDateString() : 'Unknown date'}
              </div>
              
              {/* Toggle Button */}
              <button
                onClick={() => setViewMode(viewMode === 'map' ? 'slideshow' : 'map')}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
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
                {viewMode === 'map' ? (
                  <>
                    <FaPhotoVideo size={12} />
                    Slideshow
                  </>
                ) : (
                  <>
                    <FaMap size={12} />
                    Map View
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Trip Owner: Full view mode buttons */
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
          )}
          
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

          {/* Background Music Display */}
          {trip.backgroundMusic && (
            <div style={{
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'center',
              color: '#6c757d',
              fontSize: '13px'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FaMusic size={12} />
                <span>
                  Music: <strong style={{ color: '#333' }}>{trip.backgroundMusic.title}</strong>
                  {trip.backgroundMusic.artist ? ` • ${trip.backgroundMusic.artist}` : ''}
                </span>
              </span>
            </div>
          )}

          {/* Add Post, Music and Save Buttons - Only show for trip owner */}
          {user && trip && user.uid === trip.userID && (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
              justifyContent: 'center',
              paddingBottom: '16px'
            }}>
              <button
                onClick={handleOpenAddPostModal}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(76, 175, 80, 0.2)'
                }}
              >
                <FaPlus size={14} />
                Add Post
              </button>

              <button
                onClick={() => setShowMusicPicker(true)}
                style={{
                  backgroundColor: '#6B4D9B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(107, 77, 155, 0.2)'
                }}
              >
                <FaMusic size={14} />
                Add Music
              </button>

              <button
                onClick={handleSaveTrip}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 122, 255, 0.2)'
                }}
              >
                <FaSave size={14} />
                Save
              </button>
            </div>
          )}
        </div>

        {/* Content Area - List, Map, or Slideshow View */}
        <div style={{ 
          flex: 1,
          minHeight: 0, // Important: allows flex child to shrink below content size
          padding: (viewMode === 'map' || viewMode === 'slideshow') ? '0' : '0 20px 20px 20px',
          overflowY: (viewMode === 'map' || viewMode === 'slideshow') ? 'hidden' : 'auto',
          overflowX: 'hidden'
        }}>
          {viewMode === 'slideshow' ? (
            isViewingSharedTrip ? (
              // Shared Trip: Show thumbnail of first image
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '20px',
                color: '#666'
              }}>
                {loadingSlideshowImages ? (
                  <div>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid #f3f3f3',
                      borderTop: '4px solid #007aff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }} />
                    <p style={{ fontSize: '16px', color: '#333' }}>Loading images...</p>
                  </div>
                ) : slideshowImages.length === 0 ? (
                  <div>
                    <FaPhotoVideo size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Images Found</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                      This trip doesn't contain any images to display.
                    </p>
                  </div>
                ) : (
                  // Show large thumbnail of first image
                  <div style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div
                      onClick={startSlideshowWithMusic}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        transition: 'transform 0.2s ease',
                        maxWidth: '90%',
                        maxHeight: '70vh'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <img
                        src={slideshowImages[0].url}
                        alt={slideshowImages[0].postTitle}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          maxHeight: '70vh',
                          objectFit: 'cover'
                        }}
                      />
                      {/* Play overlay */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(0,0,0,0.7)',
                        borderRadius: '50%',
                        width: '80px',
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '24px'
                      }}>
                        <FaPlay />
                      </div>
                    </div>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      margin: '0',
                      textAlign: 'center'
                    }}>
                      Tap to start slideshow ({slideshowImages.length} images)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Trip Owner: Original slideshow interface
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666'
              }}>
                {loadingSlideshowImages ? (
                  <div>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid #f3f3f3',
                      borderTop: '4px solid #007aff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }} />
                    <p style={{ fontSize: '16px', color: '#333' }}>Loading slideshow images...</p>
                  </div>
                ) : slideshowImages.length === 0 ? (
                  <div>
                    <FaPhotoVideo size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Images Found</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                      This trip doesn't contain any images to display in slideshow.
                    </p>
                    <button
                      onClick={() => setViewMode('list')}
                      style={{
                        background: '#007aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Back to List View
                    </button>
                  </div>
                ) : (
                  <div>
                    <FaPhotoVideo size={48} style={{ color: '#007aff', marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Slideshow Ready</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                      {slideshowImages.length} images ready to display
                    </p>
                    <button
                      onClick={startSlideshowWithMusic}
                      style={{
                        background: '#007aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto'
                      }}
                    >
                      <FaPlay />
                      Start Slideshow
                    </button>
                  </div>
                )}
              </div>
            )
          ) : viewMode === 'map' ? (
            // Map View
            (() => {
              console.log('🗺️ Map button clicked!');
              console.log('📊 Trip data:', trip);
              console.log('📊 Trip posts count:', trip.items.length);
              console.log('📊 Trip posts data:', trip.items);
              
              // Enhanced debugging for location data
              trip.items.forEach((item, index) => {
                console.log(`🔍 Checking post for location:`, {
                  id: item.id,
                  title: item.title,
                  latitude: item.latitude,
                  longitude: item.longitude,
                  hasLatitude: !!item.latitude,
                  hasLongitude: !!item.longitude,
                  latitudeType: typeof item.latitude,
                  longitudeType: typeof item.longitude
                });
              });
              
              const itemsWithLocation = trip.items.filter((item) => {
                const status = itemsStatus.get(item.vostcardID);
                const exists = !status || status.loading || status.exists;
                const hasLocation = item.latitude && item.longitude;
                return exists && hasLocation;
              });
              
              console.log(`📍 Posts with location: ${itemsWithLocation.length}`, itemsWithLocation);

              if (itemsWithLocation.length === 0) {
                console.log('❌ No posts with location data found');
                
                // Add a refresh button to try to get location data from original posts
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
                      <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                        None of the posts in this trip have location data.
                      </p>
                      <button
                        onClick={async () => {
                          // Try to refresh location data from original posts
                          console.log('🔄 Refreshing location data from original posts...');
                          for (const item of trip.items) {
                            try {
                              const vostcardDoc = await getDoc(doc(db, 'vostcards', item.vostcardID));
                              if (vostcardDoc.exists()) {
                                const vostcardData = vostcardDoc.data();
                                console.log(`📍 Original post ${item.id} location:`, {
                                  title: vostcardData.title,
                                  latitude: vostcardData.latitude,
                                  longitude: vostcardData.longitude,
                                  hasGeo: !!vostcardData.geo,
                                  geo: vostcardData.geo
                                });
                              }
                            } catch (error) {
                              console.error(`❌ Error checking post ${item.id}:`, error);
                            }
                          }
                        }}
                        style={{
                          background: '#007aff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '12px 24px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          marginTop: '8px'
                        }}
                      >
                        🔍 Debug Location Data
                      </button>
                    </div>
                  </div>
                );
              }

              // Get all positions for auto-fitting bounds
              const positions: [number, number][] = itemsWithLocation.map(item => [
                parseFloat(item.latitude!), 
                parseFloat(item.longitude!)
              ]);

              // Calculate center point as fallback (won't be used due to AutoFitBounds)
              const centerLat = positions.reduce((sum, pos) => sum + pos[0], 0) / positions.length;
              const centerLng = positions.reduce((sum, pos) => sum + pos[1], 0) / positions.length;

              return (
                <div style={{ height: '100%', position: 'relative' }}>
                  <MapContainer
                    center={[centerLat, centerLng]}
                    zoom={10}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <AutoFitBounds positions={positions} />
                    
                    {/* Path line connecting all trip items */}
                    {itemsWithLocation.length > 1 && (
                      <Polyline
                        positions={itemsWithLocation
                          .sort((a, b) => a.order - b.order)
                          .map(item => [parseFloat(item.latitude!), parseFloat(item.longitude!)])
                        }
                        pathOptions={{
                          color: '#007aff',
                          weight: 2,
                          opacity: 0.7,
                          dashArray: '5, 10'
                        }}
                      />
                    )}
                    
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
                <div>
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
          )
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
            
            {/* Description */}
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: '#495057',
                lineHeight: '1.4'
              }}>
                You can add your <strong>personal posts</strong> (private) to this trip. 
                Only personal posts can be added to trips, and they will remain private.
              </p>
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

      {/* Slideshow Modal */}
      {showSlideshow && console.log('🎬 TripDetailView: Rendering MultiPhotoModal with autoPlay:', slideshowAutoPlay)}
      <MultiPhotoModal
        photos={slideshowImages}
        initialIndex={0}
        isOpen={showSlideshow}
        onClose={() => {
          console.log('🎬 TripDetailView: Slideshow closing, resetting autoPlay');
          setShowSlideshow(false);
          setSlideshowAutoPlay(false); // Reset auto-play when closed
          // Switch back to appropriate view after slideshow
          setViewMode(isViewingSharedTrip ? 'map' : 'list');
        }}
        title={`${trip?.name} - Slideshow`}
        autoPlay={slideshowAutoPlay}
        autoPlayInterval={4000}
        tripTitle={trip?.name}
        singleCycle={true}
        onSlideshowComplete={() => {
          console.log('🎬 TripDetailView: Slideshow completed, fading out music and switching to map');
          
          // Fade out background music
          const audioEl = backgroundAudioRef.current;
          if (audioEl && !audioEl.paused) {
            const fadeOutDuration = 2000; // 2 seconds fade out
            const startVolume = audioEl.volume;
            const fadeStep = startVolume / (fadeOutDuration / 100);
            
            const fadeInterval = setInterval(() => {
              if (audioEl.volume > fadeStep) {
                audioEl.volume -= fadeStep;
              } else {
                audioEl.volume = 0;
                audioEl.pause();
                clearInterval(fadeInterval);
              }
            }, 100);
          }
          
          // Close slideshow and switch to map view after fade
          setTimeout(() => {
            setShowSlideshow(false);
            setSlideshowAutoPlay(false);
            setViewMode('map');
          }, 2500); // Wait for fade out to complete
        }}
      />

      {/* Hidden audio element to play background music during slideshow */}
      <audio ref={backgroundAudioRef} loop preload="auto" style={{ display: 'none' }}>
        {trip?.backgroundMusic?.url && (
          <>
            <source src={trip.backgroundMusic.url} type="audio/mpeg" />
            <source src={trip.backgroundMusic.url} type="audio/mp4" />
            <source src={trip.backgroundMusic.url} type="audio/wav" />
            <source src={trip.backgroundMusic.url} type="audio/ogg" />
          </>
        )}
      </audio>

      {/* Music Picker Modal */}
      {user && trip && user.uid === trip.userID && (
        <MusicPickerModal
          isOpen={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
          onSelect={async (track) => {
            try {
              const music: BackgroundMusic = { url: track.url, title: track.title, artist: track.artist, volume: 0.5 };
              const updated = await TripService.updateTrip(trip.id, { backgroundMusic: music });
              setTrip(updated);
              setShowMusicPicker(false);
              alert(`Background music set: ${track.title}`);
            } catch (e) {
              console.error('Failed to set background music', e);
              alert('Failed to set background music.');
            }
          }}
        />
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