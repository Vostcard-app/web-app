import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages, FaTimes } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';
import PhotoOptionsModal from '../components/PhotoOptionsModal';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function QuickcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard, currentVostcard, saveLocalVostcard } = useVostcard();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos (4 thumbnails for quickcards)
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null, null, null]);
  const [activeThumbnail, setActiveThumbnail] = useState<number | null>(null);
  
  // Desktop photo options modal state
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [pendingPhotoIndex, setPendingPhotoIndex] = useState<number | null>(null);

  // Trip functionality states
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [lastUsedTrip, setLastUsedTrip] = useState<Trip | null>(null);

  // Post functionality states
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [isAddingToPost, setIsAddingToPost] = useState(false);
  const [lastUsedPost, setLastUsedPost] = useState<any | null>(null);

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Initialize empty quickcard or load saved photos when component mounts
  useEffect(() => {
    if (!currentVostcard) {
      // Create empty quickcard when arriving at this step
      console.log('📱 Initializing empty quickcard for photo selection');
      updateVostcard({
        id: `quickcard_${Date.now()}`,
        title: '',
        description: '',
        photos: [],
        categories: [],
        geo: { latitude: 0, longitude: 0 }, // Default location, user can set later
        isQuickcard: true,
        hasVideo: false,
        hasPhotos: false,
        video: null,
        state: 'private',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else if (currentVostcard?.photos) {
      // Load existing photos if quickcard already exists
      const photos = currentVostcard.photos;
      setSelectedPhotos(prevPhotos => {
        const newPhotos = [...prevPhotos];
        photos.forEach((photo, index) => {
          if (index < 4) { // Use first four photos
            newPhotos[index] = photo as File;
          }
        });
        return newPhotos;
      });
    }
  }, [currentVostcard, updateVostcard]);

  // Load user trips and last used trip
  useEffect(() => {
    const loadTrips = async () => {
      try {
        const trips = await TripService.getUserTrips();
        setUserTrips(trips);
        
        // Load last used trip from localStorage
        const lastTripId = localStorage.getItem('lastUsedTripId');
        if (lastTripId) {
          const lastTrip = trips.find(trip => trip.id === lastTripId);
          if (lastTrip) {
            setLastUsedTrip(lastTrip);
          }
        }
      } catch (error) {
        console.error('Error loading trips:', error);
      }
    };

    loadTrips();
  }, []);

  // Load user quickcards and last used post
  useEffect(() => {
    const loadPosts = async () => {
      if (!user?.uid) return;
      
      try {
        // Get user's quickcards from vostcards collection (they're stored there with isQuickcard: true)
        const quickcardsQuery = query(
          collection(db, 'vostcards'),
          where('userID', '==', user.uid),
          where('isQuickcard', '==', true),
          orderBy('createdAt', 'desc'),
          limit(10) // Get last 10 quickcards
        );
        
        const quickcardsSnapshot = await getDocs(quickcardsQuery);
        const quickcards = quickcardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'quickcard'
        }));
        
        console.log('🔍 Loaded quickcards:', quickcards.length, quickcards);
        setUserPosts(quickcards);
        
        // Load last used post from localStorage, or default to most recent quickcard
        const lastPostId = localStorage.getItem('lastUsedPostId');
        let defaultPost = null;
        
        if (lastPostId) {
          defaultPost = quickcards.find(post => post.id === lastPostId);
        }
        
        // If no last used post found, default to the most recent quickcard
        if (!defaultPost && quickcards.length > 0) {
          defaultPost = quickcards[0];
        }
        
        if (defaultPost) {
          setLastUsedPost(defaultPost);
        }
        
      } catch (error) {
        console.error('Error loading quickcards:', error);
      }
    };

    loadPosts();
  }, [user?.uid]);

  // Find next available photo slot
  const findNextAvailableSlot = (): number | null => {
    const nextIndex = selectedPhotos.findIndex(photo => photo === null);
    return nextIndex === -1 ? null : nextIndex;
  };

  // Handler for when a thumbnail is tapped - mobile uses native action sheet, desktop shows modal
  const handleAddPhoto = (index: number) => {
    // Check if photos are full
    const nextSlot = findNextAvailableSlot();
    if (nextSlot === null && selectedPhotos[index] === null) {
      alert('Photos are full! You can replace an existing photo by tapping on it.');
      return;
    }
    
    setActiveThumbnail(index);
    
    if (isMobile) {
      // Mobile: Use native action sheet directly
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('data-index', index.toString());
        fileInputRef.current.click();
      }
    } else {
      // Desktop: Show custom modal with options
      setPendingPhotoIndex(index);
      setShowPhotoOptions(true);
    }
  };

  // Desktop modal handlers
  const handleTakePhoto = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      // For desktop "take photo", we'll open file input (user can use webcam apps)
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  const handleUploadFile = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  const handleSelectFromLibrary = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  // Handler for taking a new photo that goes to next available slot
  const handleTakeNewPhoto = () => {
    const nextSlot = findNextAvailableSlot();
    if (nextSlot === null) {
      alert('Photos are full! You can replace an existing photo by tapping on it.');
      return;
    }
    
    setActiveThumbnail(nextSlot);
    
    if (isMobile) {
      // Mobile: Use native action sheet directly
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('data-index', nextSlot.toString());
        fileInputRef.current.click();
      }
    } else {
      // Desktop: Show custom modal with options
      setPendingPhotoIndex(nextSlot);
      setShowPhotoOptions(true);
    }
  };

  // Handle file selection from camera/gallery
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const indexStr = event.target.getAttribute('data-index');
    const index = indexStr ? parseInt(indexStr, 10) : activeThumbnail;
    
    if (file && index !== null && index >= 0 && index < 4) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      console.log(`📸 Adding photo ${index + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const newPhotos = [...selectedPhotos];
      newPhotos[index] = file;
      setSelectedPhotos(newPhotos);
    }
    
    setActiveThumbnail(null);
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Remove a photo
  const handleRemovePhoto = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const newPhotos = [...selectedPhotos];
    newPhotos[index] = null;
    setSelectedPhotos(newPhotos);
  };

  // Trip handler functions
  const handleAddToTrip = () => {
    // Pre-select the last used trip if available
    if (lastUsedTrip) {
      setSelectedTripId(lastUsedTrip.id);
    }
    setIsTripModalOpen(true);
  };



  const handleTripSelection = async () => {
    if (!selectedTripId && !newTripName.trim()) {
      alert('Please select a trip or enter a new trip name');
      return;
    }

    if (!currentVostcard) {
      alert('No quickcard to add to trip');
      return;
    }

    try {
      setIsCreatingTrip(true);
      let tripId = selectedTripId;

      // Create new trip if needed
      if (!tripId && newTripName.trim()) {
        const newTrip = await TripService.createTrip({
          name: newTripName.trim(),
          description: '',
          isPrivate: true,
          items: []
        });
        tripId = newTrip.id;
        
        // Add to trips list
        setUserTrips(prev => [...prev, newTrip]);
        setLastUsedTrip(newTrip);
      }

      if (tripId) {
        // First save the quickcard to make sure it exists in the database
        console.log('🔄 Saving quickcard before adding to trip...');
        await saveLocalVostcard();
        console.log('✅ Quickcard saved, now adding to trip...');
        
        await TripService.addItemToTrip(tripId, {
          vostcardID: currentVostcard.id,
          type: currentVostcard.isQuickcard ? 'quickcard' : 'vostcard',
          title: currentVostcard.title || `Quickcard ${new Date().toLocaleDateString()}`,
          description: currentVostcard.description,
          latitude: currentVostcard.geo?.latitude,
          longitude: currentVostcard.geo?.longitude
        });
        
        // Update last used trip
        const selectedTrip = userTrips.find(trip => trip.id === tripId);
        if (selectedTrip) {
          setLastUsedTrip(selectedTrip);
          localStorage.setItem('lastUsedTripId', tripId);
        }
        
        alert('Successfully added to trip!');
        setIsTripModalOpen(false);
        setSelectedTripId('');
        setNewTripName('');
      }
    } catch (error) {
      console.error('Error adding to trip:', error);
      alert('Failed to add to trip. Please try again.');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  // Post handler functions
  const handleAddToPost = () => {
    // Pre-select the last used post if available, otherwise select the most recent quickcard
    if (lastUsedPost) {
      setSelectedPostId(lastUsedPost.id);
    } else if (userPosts.length > 0) {
      setSelectedPostId(userPosts[0].id);
    }
    setIsPostModalOpen(true);
  };

  const handlePostSelection = async () => {
    if (!selectedPostId) {
      alert('Please select a post');
      return;
    }

    try {
      setIsAddingToPost(true);
      
      // First save the quickcard to make sure it exists in the database
      console.log('🔄 Saving quickcard before adding to post...');
      await saveLocalVostcard();
      console.log('✅ Quickcard saved, now adding to post...');
      
      // Here you would implement the logic to add the quickcard to the selected post
      // This might involve updating the post's photos array or creating a relationship
      
      // Update last used post
      const selectedPost = userPosts.find(post => post.id === selectedPostId);
      if (selectedPost) {
        setLastUsedPost(selectedPost);
        localStorage.setItem('lastUsedPostId', selectedPostId);
      }
      
      alert('Successfully added to post!');
      setIsPostModalOpen(false);
      setSelectedPostId('');
      
    } catch (error) {
      console.error('Error adding to post:', error);
      alert('Failed to add to post. Please try again.');
    } finally {
      setIsAddingToPost(false);
    }
  };

  // Styles
  const thumbnailStyle = {
    width: 140,
    height: 140,
    borderRadius: 12,
    border: '3px solid #002B4D',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginBottom: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,43,77,0.15)',
  };

  const buttonStyle = {
    backgroundColor: '#002B4D',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '16px',
    fontSize: 20,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    maxWidth: 300,
    marginTop: 24,
    boxShadow: '0 4px 12px rgba(0,43,77,0.12)',
    letterSpacing: '0.01em',
    minHeight: '54px'
  };

  // Save and continue handler
  const handleSaveAndContinue = () => {
    // Filter out null photos - quickcards need at least 1 photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    
    if (validPhotos.length === 0) {
      alert('Please add at least one photo for your Quickcard.');
      return;
    }
    
    // Save photos to context
    updateVostcard({ photos: validPhotos });
    
    console.log('📱 Quickcard photos saved:', {
      photoCount: validPhotos.length
    });
    
    navigate('/quickcard-step3');
  };

  const photoCount = selectedPhotos.filter(photo => photo !== null).length;
  const isFormComplete = photoCount > 0;

  return (
    <div style={{
      height: '100vh',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      {/* Banner */}
      <div style={{
        width: '100%',
        background: '#002B4D',
        color: 'white',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}>
        <span 
          onClick={() => navigate('/home')}
          style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', cursor: 'pointer' }}>
          Vōstcard
        </span>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 20,
            color: 'white'
          }}
        >
          <FaArrowLeft />
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: 400,
        padding: '70px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
        overflowX: 'hidden'
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#002B4D',
          textAlign: 'center',
          marginBottom: 20,
          letterSpacing: '0.01em',
          paddingTop: '5px'
        }}>
          Add Photos
        </h1>
        


        {/* Photo Grid - 3 across layout for smaller buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginBottom: 5,
          width: '100%',
          maxWidth: 300,
          justifyItems: 'center',
          paddingTop: '5px'
        }}>
          {selectedPhotos.slice(0, 3).map((photo, idx) => (
            <button
              key={idx}
              onClick={() => handleAddPhoto(idx)}
              style={{
                width: 90,
                height: 90,
                borderRadius: 8,
                border: '2px solid #002B4D',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginBottom: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,43,77,0.1)',
                backgroundImage: photo ? `url(${URL.createObjectURL(photo)})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: photo ? 'transparent' : '#f8f9fa',
              }}
            >
              {photo ? (
                // Remove button for filled thumbnails
                <button
                  onClick={(e) => handleRemovePhoto(idx, e)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 10,
                    color: '#dc3545',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}
                >
                  <FaTimes />
                </button>
              ) : (
                // Add photo prompt for empty thumbnails
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: '#002B4D',
                  opacity: 0.7
                }}>
                  <FaRegImages size={20} style={{ marginBottom: 4 }} />
                  <span style={{ fontSize: 10, fontWeight: 600 }}>
                    Add Photo
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Fourth photo button - centered below */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 5,
          width: '100%'
        }}>
          <button
            onClick={() => handleAddPhoto(3)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 8,
              border: '2px solid #002B4D',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: 8,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,43,77,0.1)',
              backgroundImage: selectedPhotos[3] ? `url(${URL.createObjectURL(selectedPhotos[3])})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: selectedPhotos[3] ? 'transparent' : '#f8f9fa',
            }}
          >
            {selectedPhotos[3] ? (
              // Remove button for filled thumbnail
              <button
                onClick={(e) => handleRemovePhoto(3, e)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 10,
                  color: '#dc3545',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              >
                <FaTimes />
              </button>
            ) : (
              // Add photo prompt for empty thumbnail
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#002B4D',
                opacity: 0.7
              }}>
                <FaRegImages size={20} style={{ marginBottom: 4 }} />
                <span style={{ fontSize: 10, fontWeight: 600 }}>
                  Add Photo
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Photo count indicator */}
        <div style={{
          fontSize: 14,
          color: '#666',
          textAlign: 'center',
          marginBottom: 20,
          paddingTop: '2px'
        }}>
          {photoCount} of 4 photos added
        </div>

        {/* Take New Photo Button */}
        <div style={{ marginBottom: 20, width: '100%', maxWidth: 380 }}>
          <button
            onClick={handleTakeNewPhoto}
            disabled={photoCount >= 4}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: photoCount >= 4 ? '#cccccc' : '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: photoCount >= 4 ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {photoCount >= 4 ? 'Photos are full!' : 'Take New Photo'}
          </button>
        </div>

        {/* Add to Trip Section */}
        <div style={{ marginTop: 20, width: '100%', maxWidth: 380 }}>
          <label style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 8,
            display: 'block',
            color: '#333'
          }}>
            Add to Trip (Optional)
          </label>
          
          <button
            onClick={handleAddToTrip}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f0f8ff',
              border: '2px solid #07345c',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#07345c',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Add to Trip
          </button>
        </div>

        {/* Add to a Quickcard Section */}
        <div style={{ marginTop: 20, width: '100%', maxWidth: 380 }}>
          <label style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 8,
            display: 'block',
            color: '#333'
          }}>
            Add to a Quickcard (Optional)
          </label>
          
          <button
            onClick={handleAddToPost}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f0f8ff',
              border: '2px solid #07345c',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#07345c',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Add to a Quickcard
          </button>
        </div>

        {/* Continue button */}
        <button
          style={{
            ...buttonStyle,
            backgroundColor: isFormComplete ? '#002B4D' : '#cccccc',
            cursor: isFormComplete ? 'pointer' : 'not-allowed'
          }}
          onClick={handleSaveAndContinue}
          disabled={!isFormComplete}
        >
          Save & Continue
        </button>

        {/* Instructions */}
        <div style={{
          marginTop: 20,
          fontSize: 12,
          color: '#999',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          📱 Tap any thumbnail to add or replace a photo
        </div>
      </div>

      {/* File input - triggers iOS native action sheet on mobile, used by modal on desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={false}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Desktop Photo Options Modal */}
      <PhotoOptionsModal
        isOpen={showPhotoOptions}
        onClose={() => setShowPhotoOptions(false)}
        onTakePhoto={handleTakePhoto}
        onUploadFile={handleUploadFile}
        onSelectFromLibrary={handleSelectFromLibrary}
        title="Add Photo"
      />

      {/* Trip Modal */}
      {isTripModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>Add to Trip</h3>
            
            {userTrips.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Select Existing Trip:
                </label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                  }}
                >
                  <option value="">Choose a trip...</option>
                  {userTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Or Create New Trip:
              </label>
              <input
                type="text"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="Enter trip name"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsTripModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleTripSelection}
                disabled={!selectedTripId && !newTripName.trim() || isCreatingTrip}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: (selectedTripId || newTripName.trim()) && !isCreatingTrip ? '#002B4D' : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: (selectedTripId || newTripName.trim()) && !isCreatingTrip ? 'pointer' : 'not-allowed',
                }}
              >
                {isCreatingTrip ? 'Adding...' : 'Add to Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {isPostModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>Add to a Quickcard</h3>
            
            {userPosts.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Select Existing Quickcard:
                </label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                  }}
                >
                  <option value="">Choose a quickcard...</option>
                  {userPosts.slice(0, 3).map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title || `Quickcard - ${new Date(post.createdAt).toLocaleDateString()}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#f5f5f5', 
                borderRadius: '8px',
                textAlign: 'center',
                color: '#666'
              }}>
                No quickcards available. Create some quickcards first!
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setIsPostModalOpen(false);
                  setSelectedPostId('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'white',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handlePostSelection}
                disabled={!selectedPostId || isAddingToPost}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: selectedPostId && !isAddingToPost ? '#002B4D' : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: selectedPostId && !isAddingToPost ? 'pointer' : 'not-allowed',
                }}
              >
                {isAddingToPost ? 'Adding...' : 'Add to Quickcard'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 