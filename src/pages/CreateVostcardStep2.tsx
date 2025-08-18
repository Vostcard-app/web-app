import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegImages } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';
import PhotoOptionsModal from '../components/PhotoOptionsModal';
import { TEMP_UNIFIED_VOSTCARD_FLOW } from '../utils/flags';

export default function CreateVostcardStep2() {
  const navigate = useNavigate();
  const { updateVostcard, currentVostcard, saveLocalVostcard, setVideo } = useVostcard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track selected photos
  const [selectedPhotos, setSelectedPhotos] = useState<(File | null)[]>([null, null, null, null]);
  // Stable preview URLs to avoid repeated URL.createObjectURL churn that crashes iOS Safari
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([null, null, null, null]);
  const [activeThumbnail, setActiveThumbnail] = useState<number | null>(null);
  const [loadedFlags, setLoadedFlags] = useState<boolean[]>([false, false, false, false]);
  
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

  // ---------- Unified Step 2: Optional 60s Video Recorder ----------
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const videoUrl = useMemo(() => (recordedBlob ? URL.createObjectURL(recordedBlob) : ''), [recordedBlob]);

  const stopAllTracks = () => {
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      stopAllTracks();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      mediaStreamRef.current = stream;
      const chunks: BlobPart[] = [];
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = mr;
      setElapsed(0);
      setRecordedBlob(null);
      setRecording(true);
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        stopAllTracks();
        setRecording(false);
        // Save video and return to step 2 to show preview
        setVideo(blob);
        navigate('/create/step2');
      };
      mr.start();
      // 60s cap
      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - started) / 1000);
        setElapsed(sec);
        if (sec >= 60 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
        }
      }, 250) as unknown as number;
    } catch (e) {
      alert('Unable to access camera/microphone. Please check permissions.');
      console.error(e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const saveVideoAndContinue = () => {
    if (recordedBlob) {
      // Persist in context; upload will happen later in posting flow
      // setVideo will attach blob + preserve geo if present
      (window as any).console?.log?.('Saving recorded video blob, size:', recordedBlob.size);
      // @ts-ignore setVideo is available from context
      // Types: VostcardContext has setVideo(video: Blob, geoOverride?)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      setVideo(recordedBlob);
    }
    navigate('/create/step3');
  };

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
      // reset fade-in flags when photos change
      setLoadedFlags(flags => flags.map(() => false));
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

      // Manage object URLs safely
      setPhotoUrls(prev => {
        const next = [...prev];
        if (next[index]) {
          try { URL.revokeObjectURL(next[index]!); } catch {}
        }
        next[index] = URL.createObjectURL(file);
        return next;
      });

      setLoadedFlags(prev => {
        const next = [...prev];
        next[index] = false; // will fade in on load
        return next;
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
        
        // Get the first photo URL for the trip item
        let photoURL = '';
        if (selectedPhotos[0]) {
          photoURL = URL.createObjectURL(selectedPhotos[0]);
        } else if (selectedPhotos[1]) {
          photoURL = URL.createObjectURL(selectedPhotos[1]);
        }
        
        await TripService.addItemToTrip(tripId, {
          vostcardID: currentVostcard.id,
          type: 'vostcard',
          title: currentVostcard.title || `Vostcard ${new Date().toLocaleDateString()}`,
          description: currentVostcard.description,
          photoURL: photoURL,
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
    navigate('/create/step3');
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

      {/* Title Display (if exists) */}
      {currentVostcard?.title && (
        <div style={{
          width: '100%',
          maxWidth: 380,
          textAlign: 'center',
          marginTop: 80,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#002B4D',
            lineHeight: 1.3,
            paddingBottom: 12,
            borderBottom: '1px solid #e0e0e0'
          }}>
            "{currentVostcard.title}"
          </h2>
        </div>
      )}

      {/* Unified Step 2: Optional Video Recorder */}
      {TEMP_UNIFIED_VOSTCARD_FLOW && (
        <div style={{ width: '100%', maxWidth: 420, marginTop: 100, padding: '0 16px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#002B4D' }}>Optional Video (up to 60s)</h2>
          <p style={{ marginTop: 0, color: '#666' }}>You can skip this step if you don't want a video.</p>
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #e5e5e5',
            borderRadius: 10,
            padding: 12,
            height: 320,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {videoUrl ? (
              <video src={videoUrl} controls style={{ width: '100%', borderRadius: 8 }} />
            ) : recording && mediaStreamRef.current ? (
              <video
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                ref={(el) => {
                  if (el && mediaStreamRef.current) {
                    // @ts-ignore - assign srcObject for live preview
                    el.srcObject = mediaStreamRef.current;
                  }
                }}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No video recorded</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {!recording && (
                <button onClick={startRecording} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#007aff', color: 'white', fontWeight: 600 }}>Record</button>
              )}
              {recording && (
                <button onClick={stopRecording} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#dc3545', color: 'white', fontWeight: 600 }}>Stop ({elapsed}s)</button>
              )}
              <button onClick={() => { setRecordedBlob(null); stopAllTracks(); }} style={{ padding: '12px', borderRadius: 8, border: '1px solid #ccc', background: 'white', color: '#333' }}>Re-record</button>
              <button onClick={saveVideoAndContinue} style={{ padding: '12px', borderRadius: 8, border: 'none', background: '#07345c', color: 'white', fontWeight: 600 }}>Continue</button>
              <button onClick={() => navigate('/create/step3')} style={{ padding: '12px', borderRadius: 8, border: '1px solid #ccc', background: 'white' }}>Skip</button>
            </div>
          </div>
        </div>
      )}

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
        marginTop: TEMP_UNIFIED_VOSTCARD_FLOW ? '20px' : (currentVostcard?.title ? '20px' : '80px'),
      }}>
        {/* Photo selection grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: 20,
          width: '100%',
          maxWidth: 380,
          margin: '0 auto'
        }}>
          {[0, 1, 2, 3].map(idx => (
            <button
              key={idx}
              style={optionStyle}
              onClick={() => handleAddPhoto(idx)}
              type="button"
            >
              {selectedPhotos[idx] ? (
                <img
                  src={photoUrls[idx] || ''}
                  alt={idx === 0 ? "Take Photo" : "Photo Library"}
                  onLoad={() => setLoadedFlags(prev => { const n=[...prev]; n[idx]=true; return n; })}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 6,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: loadedFlags[idx] ? 1 : 0,
                    transition: 'opacity 220ms ease'
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
          {selectedPhotos.filter(photo => photo !== null).length} of 1 photo required
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
