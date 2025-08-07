import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';
import PhotoOptionsModal from '../components/PhotoOptionsModal';

/*
  📱 CAMERA APPROACH: Currently using Step2CameraView for enhanced orientation handling
  
  🔄 TO REVERT TO FILE INPUT:
  1. Replace handleAddPhoto with handleAddPhotoFallback
  2. Remove the camera mode indicator
  3. The file input code is already there and ready to use
*/

export default function CreateVostcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard, currentVostcard, saveLocalVostcard } = useVostcard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null]);
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

  // Load saved photos when component mounts
  useEffect(() => {
    if (currentVostcard?.photos) {
      const photos = currentVostcard.photos;
      setSelectedPhotos(prevPhotos => {
        const newPhotos = [...prevPhotos];
        photos.forEach((photo, index) => {
          if (index < 2) { // Only use first two photos
            newPhotos[index] = photo as File;
          }
        });
        return newPhotos;
      });
    }
  }, [currentVostcard]);

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

  // Handler for when a thumbnail is tapped - mobile uses native action sheet, desktop shows modal
  const handleAddPhoto = (index: number) => {
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

  // Handle file selection (camera or library)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const indexStr = event.target.getAttribute('data-index');
    const index = indexStr ? parseInt(indexStr, 10) : activeThumbnail;
    
    if (file && index !== null && index >= 0 && index < 2) {
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

      setSelectedPhotos(prev => {
        const updated = [...prev];
        updated[index] = file;
        return updated;
      });
    }
    
    setActiveThumbnail(null);
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Trip handler functions
  const handleAddToTrip = () => {
    // Pre-select the last used trip if available
    if (lastUsedTrip) {
      setSelectedTripId(lastUsedTrip.id);
    }
    setIsTripModalOpen(true);
  };

  const handleAddToCurrentTrip = async () => {
    if (!lastUsedTrip || !currentVostcard) {
      alert('No current trip available');
      return;
    }

    try {
      // First save the vostcard to make sure it exists in the database
      console.log('🔄 Saving vostcard before adding to trip...');
      await saveLocalVostcard();
      console.log('✅ Vostcard saved, now adding to trip...');
      
      await TripService.addItemToTrip(lastUsedTrip.id, {
        vostcardID: currentVostcard.id,
        type: currentVostcard.isQuickcard ? 'quickcard' : 'vostcard',
        title: currentVostcard.title || `Vostcard ${new Date().toLocaleDateString()}`,
        description: currentVostcard.description,
        latitude: currentVostcard.geo?.latitude,
        longitude: currentVostcard.geo?.longitude
      });
      alert(`Added to "${lastUsedTrip.name}"`);
    } catch (error) {
      console.error('Error adding to current trip:', error);
      alert('Failed to add to trip. Please try again.');
    }
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
          isPrivate: true,
          items: []
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
          type: currentVostcard.isQuickcard ? 'quickcard' : 'vostcard',
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

  // Smaller square thumbnail style to match QuickcardStep2
  const optionStyle = {
    background: '#f4f6f8',
    borderRadius: 8,
    marginBottom: 8,
    width: 90,
    height: 90,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,43,77,0.1)',
    cursor: 'pointer',
    border: '2px solid #002B4D',
    outline: 'none',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    backgroundColor: '#f8f9fa',
  };

  const buttonStyle = {
    background: '#002B4D',
    color: 'white',
    border: 'none',
    borderRadius: 16,
    fontSize: 24,
    fontWeight: 600,
    padding: '20px 0',
    width: '100%',
    maxWidth: 380,
    margin: '0 auto',
    marginTop: 24,
    boxShadow: '0 4px 12px rgba(0,43,77,0.12)',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  };

  // Save and continue handler
  const handleSaveAndContinue = () => {
    // Filter out null photos but allow saving even with just one photo
    const validPhotos = selectedPhotos.filter((photo): photo is File => photo !== null);
    updateVostcard({ photos: validPhotos });
    navigate('/create-step3');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
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
          style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', cursor: 'pointer' }}>Vōstcard</span>
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
            cursor: 'pointer'
          }}
        >
          <FaArrowLeft size={28} color="white" />
        </button>
      </div>

      {/* Options - now scrollable */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '45px 20px 0 20px',
        boxSizing: 'border-box',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        marginTop: '80px', // Account for fixed header
      }}>
        {/* Photo selection grid - matching QuickcardStep2 style */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: 20,
          width: '100%'
        }}>
          {[0, 1].map(idx => (
            <button
              key={idx}
              style={optionStyle}
              onClick={() => handleAddPhoto(idx)}
              type="button"
            >
              {selectedPhotos[idx] ? (
                <img
                  src={URL.createObjectURL(selectedPhotos[idx]!)}
                  alt={idx === 0 ? "Take Photo" : "Photo Library"}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 6,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: '#002B4D',
                  opacity: 0.7
                }}>
                  <FaRegImages size={20} style={{ marginBottom: 4 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
                    {idx === 0 ? "Take Photo" : "Photo Library"}
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
          marginBottom: 20,
          paddingTop: '2px'
        }}>
          {selectedPhotos.filter(photo => photo !== null).length} of 2 photos added
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
              fontWeight: '500',
              marginBottom: '8px'
            }}
          >
            Add to Trip
          </button>

          {lastUsedTrip && (
            <button
              onClick={handleAddToCurrentTrip}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#e8f5e8',
                border: '2px solid #28a745',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#28a745',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Add to {lastUsedTrip.name}
            </button>
          )}
        </div>
        <button
          style={{ ...buttonStyle, marginTop: 15 }}
          onClick={handleSaveAndContinue}
        >
          Save & Continue
        </button>

        {/* Camera mode indicator */}
        <div style={{
          marginTop: 10,
          fontSize: 12,
          color: '#666',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          📱 Using enhanced camera with orientation correction
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
    </div>
  );
}
