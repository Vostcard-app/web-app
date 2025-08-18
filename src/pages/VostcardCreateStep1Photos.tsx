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

export default function VostcardCreateStep1Photos() {
  const navigate = useNavigate();
  const { updateVostcard, currentVostcard, saveLocalVostcard, loadLocalVostcard, deletePrivateVostcard, setCurrentVostcard } = useVostcard();
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

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Initialize empty vostcard or load saved photos/URLs when component mounts
  useEffect(() => {
    if (!currentVostcard) {
      // Create empty vostcard when arriving at this step
      console.log('📱 Initializing empty vostcard for photo selection');
      updateVostcard({
        id: `vostcard_${Date.now()}`,
        title: '',
        description: '',
        photos: [],
        categories: [],
        geo: { latitude: 0, longitude: 0 }, // Default location, user can set later
        type: 'vostcard',
        hasVideo: false,
        hasPhotos: false,
        video: null,
        state: 'private',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return;
    }

    // Prefer Files if present
    if (currentVostcard?.photos && Array.isArray(currentVostcard.photos) && currentVostcard.photos.length > 0) {
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
      return;
    }

    // Fallback: use remote photoURLs if available (edit from saved metadata)
    if (currentVostcard?.photoURLs && Array.isArray(currentVostcard.photoURLs) && currentVostcard.photoURLs.length > 0) {
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
      return;
    }
  }, [currentVostcard, updateVostcard]);

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

      if (tripId) {
        // First save the vostcard to make sure it exists in the database
        console.log('🔄 Saving vostcard before adding to trip...');
        await saveLocalVostcard();
        console.log('✅ Vostcard saved, now adding to trip...');
        
        await TripService.addItemToTrip(tripId, {
          vostcardID: currentVostcard.id,
          type: 'vostcard',
          title: currentVostcard.title || `Vostcard ${new Date().toLocaleDateString()}`,
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
    // Filter out null photos - need at least 2 photos
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    
    if (validPhotos.length < 2) {
      alert('Please add at least two photos for your Vostcard.');
      return;
    }
    
    // Save photos to context and route into unified step 2
    updateVostcard({ photos: validPhotos });
    
    console.log('📱 Vostcard photos saved:', {
      photoCount: validPhotos.length
    });
    
    // Go to Step 2 (optional video)
    navigate('/create/step2');
  };

  const photoCount = selectedPhotos.filter(photo => photo !== null).length;
  const isFormComplete = photoCount >= 2;

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

        {/* Add to Trip Section */}
        <div style={{ marginTop: 2, width: '100%', maxWidth: 380 }}>
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
    </div>
  );
}
