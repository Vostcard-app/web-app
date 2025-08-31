import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaRegImages, FaTimes, FaPencilAlt } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { useVostcard } from '../context/VostcardContext';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';
import PhotoOptionsModal from '../components/PhotoOptionsModal';
import EditTripNameModal from '../components/EditTripNameModal';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, orderBy, getDocs, limit, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { LocationService } from '../services/locationService';

export default function VostcardCreateStep1Photos() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentVostcard, saveLocalVostcard, loadLocalVostcard, deletePrivateVostcard, setCurrentVostcard } = useVostcard();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos (4 thumbnails)
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null, null, null]);
  // Stable preview URLs to avoid recreating object URLs on every render
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([null, null, null, null]);
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
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Initialize empty vostcard when component mounts (only once)
  useEffect(() => {
    const initializeVostcard = async () => {
      if (!currentVostcard) {
        // Get user's location
        console.log('📍 Getting user location for new vostcard');
        let userLocation;
        try {
          userLocation = await LocationService.getCurrentLocation();
          console.log('📍 Got user location:', userLocation);
        } catch (error) {
          console.error('❌ Error getting location:', error);
          userLocation = { latitude: 0, longitude: 0 };
        }

        // Create empty vostcard when arriving at this step
        console.log('📱 Initializing empty vostcard for photo selection');
        setCurrentVostcard({
          id: uuidv4(), // Use Firebase-compatible UUID instead of timestamp
          title: '',
          description: '',
          photos: [],
          categories: [],
          geo: userLocation,
          username: user?.displayName || user?.email || 'Anonymous',
          userID: user?.uid || '',
          video: null,
          state: 'private',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    };

    initializeVostcard();
  }, []); // Only run once on mount

  // Load photos from currentVostcard when it changes (separate effect)
  useEffect(() => {
    if (!currentVostcard) return;

    // Prefer Files if present
    if (currentVostcard.photos && Array.isArray(currentVostcard.photos) && currentVostcard.photos.length > 0) {
      const photos = currentVostcard.photos as (File | Blob | null)[];
      const newPhotos: (File | null)[] = [null, null, null, null];
      const newUrls: (string | null)[] = [null, null, null, null];
      photos.slice(0, 4).forEach((photo, index) => {
        if (photo instanceof File || photo instanceof Blob) {
          try {
            newPhotos[index] = photo as File;
            newUrls[index] = URL.createObjectURL(photo);
          } catch {}
        }
      });
      setSelectedPhotos(newPhotos);
      // Revoke previous blob: URLs only
      setPhotoUrls(prev => {
        prev.forEach(u => { if (u && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch {} } });
        return newUrls;
      });
      return; // Exit early if we loaded from photos
    }

    // Fallback: use remote photoURLs if available (edit from saved metadata)
    if (currentVostcard.photoURLs && Array.isArray(currentVostcard.photoURLs) && currentVostcard.photoURLs.length > 0) {
      const urls = (currentVostcard.photoURLs as string[]).slice(0, 4);
      const paddedUrls: (string | null)[] = [null, null, null, null];
      urls.forEach((u, i) => { paddedUrls[i] = u; });
      // Keep selectedPhotos as null; backgroundImage uses photoUrls for display
      setSelectedPhotos([null, null, null, null]);
      setPhotoUrls(prev => {
        // Revoke only blob: URLs from previous state
        prev.forEach(u => { if (u && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch {} } });
        return paddedUrls;
      });
    }
  }, [currentVostcard?.id]); // Only depend on vostcard ID to avoid circular dependency

  // Auto-open camera if coming from Create button
  useEffect(() => {
    const autoOpenCamera = location.state?.autoOpenCamera;
    if (autoOpenCamera && fileInputRef.current) {
      console.log('📷 Auto-opening camera from Create button');
      // Set camera capture mode and open for first photo
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.setAttribute('data-index', '0');
      fileInputRef.current.click();
      
      // Clear the state to prevent re-opening on re-renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Cleanup created object URLs on unmount
  useEffect(() => {
    return () => {
      photoUrls.forEach(u => { if (u && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch {} } });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    
    // Both mobile and desktop: Show photo options modal
    setPendingPhotoIndex(index);
    setShowPhotoOptions(true);
  };

  // Desktop modal handlers
  const handleTakePhoto = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      // Set capture attribute for camera
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  const handleUploadFile = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      // Remove capture attribute for file upload
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
    }
  };

  const handleSelectFromLibrary = () => {
    setShowPhotoOptions(false);
    if (pendingPhotoIndex !== null && fileInputRef.current) {
      // Remove capture attribute for library selection
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('data-index', pendingPhotoIndex.toString());
      fileInputRef.current.click();
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

      // Create a stable object URL and revoke the previous one to avoid memory leaks
      setPhotoUrls(prev => {
        const next = [...prev];
        if (next[index]) {
          try { URL.revokeObjectURL(next[index]!); } catch {}
        }
        next[index] = URL.createObjectURL(file);
        return next;
      });
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

    setPhotoUrls(prev => {
      const next = [...prev];
      if (next[index]) {
        try { URL.revokeObjectURL(next[index]!); } catch {}
      }
      next[index] = null;
      return next;
    });
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
      alert('No vostcard to add to trip');
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
          isPrivate: true
        });
        tripId = newTrip.id;
        
        // Add to trips list
        setUserTrips(prev => [...prev, newTrip]);
        setLastUsedTrip(newTrip);
      }

      if (tripId && currentVostcard) {
        // First save the vostcard to Firebase to make sure it exists in the database
        console.log('🔄 Saving vostcard to Firebase before adding to trip...');
        
        // Get the first photo URL from the selected photos
        const firstPhotoFile = selectedPhotos.find(photo => photo !== null);
        if (!firstPhotoFile) {
          throw new Error('No photos selected');
        }
        
        // Create a URL for the first photo
        const photoURL = URL.createObjectURL(firstPhotoFile);
        
        // Save to Firebase directly from currentVostcard
        const vostcardRef = doc(db, 'vostcards', currentVostcard.id);
        const now = Timestamp.now();
        await setDoc(vostcardRef, {
          ...currentVostcard,
          type: 'vostcard',
          photoURL: `vostcards/${currentVostcard.userID}/photos/${currentVostcard.id}_0`,
          createdAt: now,
          updatedAt: now
        });
        
        console.log('✅ Vostcard saved to Firebase, now adding to trip...');
        
        await TripService.addItemToTrip(tripId, {
          vostcardID: currentVostcard.id,
          type: 'vostcard',
          title: currentVostcard.title || `Vostcard ${new Date().toLocaleDateString()}`,
          description: currentVostcard.description,
          photoURL,
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
    // Filter out null photos - need at least 1 photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    
    if (validPhotos.length < 1) {
      alert('Please add at least one photo for your Vostcard.');
      return;
    }
    
    // iPhone-specific debugging
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    console.log('📱 iPhone Detection:', { isIOS, userAgent: navigator.userAgent });
    
    // Save photos to context and route into unified step 2
    if (currentVostcard) {
      const updatedVostcard = { ...currentVostcard, photos: validPhotos };
      setCurrentVostcard(updatedVostcard);
      
      console.log('📱 Vostcard photos saved:', {
        photoCount: validPhotos.length,
        isIOS,
        photosTypes: validPhotos.map(p => p.constructor.name),
        photosSizes: validPhotos.map(p => p.size),
        vostcardId: updatedVostcard.id,
        contextUpdated: true
      });
      
      // iPhone-specific: Add small delay to ensure context update completes
      if (isIOS) {
        setTimeout(() => {
          console.log('📱 iPhone: Navigating to step 3 after delay');
          navigate('/create-step3');
        }, 100);
      } else {
        navigate('/create-step3');
      }
    } else {
      console.error('❌ No currentVostcard found when saving photos');
      alert('Error: Unable to save photos. Please try again.');
    }
  };

  // Add video handler - save photos first, then go to Step 2
  const handleAddVideo = () => {
    // Filter out null photos - need at least 1 photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    
    if (validPhotos.length < 1) {
      alert('Please add at least one photo before adding video.');
      return;
    }
    
    // iPhone-specific debugging
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Save photos to context first
    if (currentVostcard) {
      const updatedVostcard = { ...currentVostcard, photos: validPhotos };
      setCurrentVostcard(updatedVostcard);
      
      console.log('📱 Photos saved before adding video:', {
        photoCount: validPhotos.length,
        isIOS,
        photosTypes: validPhotos.map(p => p.constructor.name),
        photosSizes: validPhotos.map(p => p.size),
        vostcardId: updatedVostcard.id,
        contextUpdated: true
      });
      
      // iPhone-specific: Add small delay to ensure context update completes
      if (isIOS) {
        setTimeout(() => {
          console.log('📱 iPhone: Navigating to step 2 after delay');
          navigate('/create-step2');
        }, 100);
      } else {
        navigate('/create-step2');
      }
    } else {
      console.error('❌ No currentVostcard found when saving photos for video');
      alert('Error: Unable to save photos. Please try again.');
    }
  };

  const photoCount = selectedPhotos.filter(photo => photo !== null).length;
  const isFormComplete = photoCount >= 1;
  
  // Debug logging
  console.log('📸 Photo state:', {
    selectedPhotos: selectedPhotos.map((p, i) => p ? `Photo ${i+1}: ${p.name}` : `Slot ${i+1}: empty`),
    photoCount,
    isFormComplete
  });

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
          marginBottom: 5,
          letterSpacing: '0.01em',
          paddingTop: '5px'
        }}>
          Take Photos
        </h1>

        {/* Title Display (if exists) */}
        {currentVostcard?.title && (
          <div style={{
            width: '100%',
            textAlign: 'center',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid #e0e0e0'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: '#333',
              lineHeight: 1.3
            }}>
              "{currentVostcard.title}"
            </h2>
          </div>
        )}

        {/* Photo Grid - 2x2 layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '12px',
          marginBottom: 20,
          width: '100%',
          maxWidth: 240,
          justifyItems: 'center',
          paddingTop: '0px'
        }}>
          {selectedPhotos.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => handleAddPhoto(idx)}
              style={{
                width: 110,
                height: 110,
                borderRadius: 8,
                border: '2px solid #002B4D',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,43,77,0.1)',
                backgroundImage: photoUrls[idx] ? `url(${photoUrls[idx]})` : 'none',
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
                  <FaRegImages size={24} style={{ marginBottom: 4 }} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    Add Photo
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Photo count indicator */}
        <div style={{
          fontSize: 14,
          color: '#666',
          textAlign: 'center',
          marginBottom: 2,
          paddingTop: '2px'
        }}>
          {photoCount} of 4 photos added
        </div>

        {/* Add Video Button */}
        <button
          onClick={handleAddVideo}
          style={{
            ...buttonStyle,
            backgroundColor: '#007AFF',
            marginBottom: '16px'
          }}
        >
          Add Video
        </button>

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
        capture="environment"
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
      {editingTrip && (
        <EditTripNameModal
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onUpdate={(updatedTrip) => {
            setUserTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
            setEditingTrip(null);
          }}
          onDelete={async (tripId) => {
            try {
              await TripService.deleteTrip(tripId);
              setUserTrips(prev => prev.filter(t => t.id !== tripId));
              setEditingTrip(null);
              setSelectedTripId('');
              alert('Trip deleted successfully');
            } catch (error) {
              console.error('Error deleting trip:', error);
              alert('Failed to delete trip. Please try again.');
            }
          }}
        />
      )}
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
                {selectedTripId && (
                  <button
                    onClick={() => {
                      const trip = userTrips.find(t => t.id === selectedTripId);
                      if (trip) {
                        setEditingTrip(trip);
                      }
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      border: '1px solid #002B4D',
                      borderRadius: '4px',
                      color: '#002B4D',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaPencilAlt size={12} />
                    Edit Trip Name
                  </button>
                )}
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
    </div>
  );
}
