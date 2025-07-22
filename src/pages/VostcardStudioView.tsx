import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaList, FaMicrophone, FaStop, FaUpload, FaMapMarkerAlt, FaSave, FaCamera, FaGlobe, FaImages } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { drivecardService } from '../services/drivecardService';
import { QuickcardImporter } from '../components/studio/QuickcardImporter';
import { useVostcard } from '../context/VostcardContext';
import { useVostcardEdit } from '../context/VostcardEditContext';
import type { Drivecard, Vostcard } from '../types/VostcardTypes';
import MultiPhotoModal from '../components/MultiPhotoModal';
import PhotoOptionsModal from '../components/PhotoOptionsModal';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useAuth();
  const { loadQuickcard } = useVostcardEdit();
  const { saveLocalVostcard, setCurrentVostcard, postQuickcard, clearVostcard } = useVostcard();
  
  // Categories from step 3
  const availableCategories = [
    'None',
    'Landmark',
    'Fun Fact',
    'Macabre',
    'Architecture',
    'Historical',
    'Museum',
    'Gallery',
    'Restaurant',
    'Nature',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  
  const canAccessDrivecard = userRole === 'guide' || userRole === 'admin';
  
  // Check if we're editing a drivecard from the library
  const editingDrivecardId = location.state?.editingDrivecard;
  
  // Switch to drivecard section if editing one
  const [activeSection, setActiveSection] = useState<'quickcard' | 'drivecard'>(
    editingDrivecardId && canAccessDrivecard ? 'drivecard' : 'quickcard'
  );

  // Quickcard import state
  const [showQuickcardImporter, setShowQuickcardImporter] = useState(false);
  const [showQuickcardCreator, setShowQuickcardCreator] = useState(false);
  
  // Quickcard creation state - ENHANCED FOR MULTIPLE PHOTOS
  const [quickcardTitle, setQuickcardTitle] = useState('');
  const [quickcardPhotos, setQuickcardPhotos] = useState<(Blob | File)[]>([]); // Array of photos
  const [quickcardPhotoPreviews, setQuickcardPhotoPreviews] = useState<string[]>([]); // Array of previews
  const [quickcardLocation, setQuickcardLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [quickcardAudio, setQuickcardAudio] = useState<Blob | null>(null);
  const [quickcardAudioSource, setQuickcardAudioSource] = useState<'recording' | 'file' | null>(null);
  const [quickcardAudioFileName, setQuickcardAudioFileName] = useState<string | null>(null);
  const [quickcardCategories, setQuickcardCategories] = useState<string[]>([]);
  const [showQuickcardCategoryModal, setShowQuickcardCategoryModal] = useState(false);

  // Editing state
  const [editingDrivecard, setEditingDrivecard] = useState<Drivecard | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Drivecard creation state
  const [title, setTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [drivecardCategory, setDrivecardCategory] = useState('None');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioSource, setAudioSource] = useState<'recording' | 'file' | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showPhotoOptionsModal, setShowPhotoOptionsModal] = useState(false);

  // Load drivecard for editing when component mounts
  useEffect(() => {
    const loadDrivecardForEditing = async () => {
      if (editingDrivecardId) {
        setIsLoading(true);
        try {
          console.log('📝 Loading drivecard for editing:', editingDrivecardId);
          
          // First try IndexedDB, then Firebase
          let drivecard = await drivecardService.loadFromIndexedDB(editingDrivecardId);
          
          if (!drivecard) {
            console.log('🔍 Drivecard not found in IndexedDB, trying Firebase...');
            // If not in IndexedDB, we need to load all from Firebase and find it
            // This is not ideal but works with the current service structure
            const allDrivecards = await drivecardService.loadAll();
            drivecard = allDrivecards.find(d => d.id === editingDrivecardId) || null;
          }
          
          if (drivecard) {
            console.log('✅ Drivecard loaded:', drivecard);
            setEditingDrivecard(drivecard);
            
            // Pre-populate form fields
            setTitle(drivecard.title);
            setDrivecardCategory(drivecard.category || 'None');
            
            if (drivecard.geo) {
              setSelectedLocation({
                latitude: drivecard.geo.latitude,
                longitude: drivecard.geo.longitude,
                address: drivecard.geo.address
              });
            }
            
            // Note: We can't restore the audio blob from storage
            // User will need to keep existing audio or upload/record new audio
            console.log('📝 Form pre-populated with drivecard data');
          } else {
            console.error('❌ Drivecard not found:', editingDrivecardId);
            alert('Drivecard not found. Returning to library.');
            navigate('/drivecards');
          }
        } catch (error) {
          console.error('❌ Error loading drivecard for editing:', error);
          alert('Failed to load drivecard. Please try again.');
          navigate('/drivecards');
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadDrivecardForEditing();
  }, [editingDrivecardId, navigate]);

  // Recording functions
  const startRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioSource('recording');
        setAudioFileName(null);
        setIsRecording(false);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setRecordingError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file.');
      return;
    }

    setAudioBlob(file);
    setAudioSource('file');
    setAudioFileName(file.name);
    setRecordingTime(0);
    event.target.value = '';
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setAudioSource(null);
    setAudioFileName(null);
    setRecordingTime(0);
    setRecordingError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveOrUpdate = async () => {
    if (!user || !title.trim()) {
      alert('Please enter a title for your Drivecard.');
      return;
    }

    if (!selectedLocation) {
      alert('Please set a location for your Drivecard.');
      return;
    }

    // For new drivecards, audio is required
    // For editing, audio is optional (keeps existing if no new audio provided)
    if (!editingDrivecard && !audioBlob) {
      alert('Please record audio or select an audio file for your Drivecard.');
      return;
    }

    try {
      if (editingDrivecard) {
        // Update existing drivecard
        console.log('💾 Updating existing drivecard:', editingDrivecard.id);
        
        const updatedDrivecard: Drivecard = {
          ...editingDrivecard,
          title: title.trim(),
          category: drivecardCategory,
          geo: { 
            latitude: selectedLocation.latitude, 
            longitude: selectedLocation.longitude,
            address: selectedLocation.address 
          },
          updatedAt: new Date().toISOString()
        };

        // Only update audio if new audio was provided
        if (audioBlob) {
          updatedDrivecard.audio = audioBlob;
          console.log('🎵 New audio will be saved with update');
        } else {
          console.log('🎵 Keeping existing audio');
        }

        await drivecardService.update(editingDrivecard.id, updatedDrivecard);
        alert('Drivecard updated successfully!');
        
        // Navigate back to library
        navigate('/drivecards');
      } else {
        // Create new drivecard
        console.log('💾 Creating new drivecard');
        
        const newDrivecard: Drivecard = {
          id: `drivecard_${Date.now()}`,
          title: title.trim(),
          audio: audioBlob!,
          geo: { 
            latitude: selectedLocation.latitude, 
            longitude: selectedLocation.longitude,
            address: selectedLocation.address 
          },
          category: drivecardCategory,
          userID: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await drivecardService.save(newDrivecard);
        alert('Drivecard saved successfully!');
        
        // Clear form for creating another
        setTitle('');
        setSelectedLocation(null);
        setDrivecardCategory('None');
        clearRecording();
      }
      
    } catch (error) {
      console.error('❌ Error saving/updating Drivecard:', error);
      alert('Failed to save Drivecard. Please try again.');
    }
  };

  const handlePinPlacer = () => {
    // Store current drivecard state in sessionStorage
    sessionStorage.setItem('drivecardCreatorState', JSON.stringify({
      title: title,
      audio: audioBlob ? 'hasAudio' : null,
      audioSource: audioSource,
      audioFileName: audioFileName,
      category: drivecardCategory
    }));

    navigate('/pin-placer', {
      state: {
        returnTo: '/studio',
        drivecardCreation: true,
        title: title || 'New Drivecard',
        pinData: {
          id: 'temp_drivecard',
          title: title || 'New Drivecard',
          description: 'Drivecard location',
          latitude: selectedLocation?.latitude || 40.7128,
          longitude: selectedLocation?.longitude || -74.0060,
          isOffer: false,
          isDrivecard: true
        }
      }
    });
  };

  // Handle location data from pin placer
  useEffect(() => {
    const restoreState = async () => {
      const drivecardLocation = sessionStorage.getItem('drivecardLocation');
      const quickcardLocation = sessionStorage.getItem('quickcardLocation');
      
      if (drivecardLocation) {
        try {
          const location = JSON.parse(drivecardLocation);
          setSelectedLocation(location);
          sessionStorage.removeItem('drivecardLocation');
          
          // Restore drivecard creator state
          const creatorState = sessionStorage.getItem('drivecardCreatorState');
          if (creatorState) {
            const state = JSON.parse(creatorState);
            setTitle(state.title || '');
            setDrivecardCategory(state.category || 'None');
            sessionStorage.removeItem('drivecardCreatorState');
          }
        } catch (error) {
          console.error('Error parsing drivecard location:', error);
        }
      }

      if (quickcardLocation) {
        try {
          const location = JSON.parse(quickcardLocation);
          setQuickcardLocation(location);
          sessionStorage.removeItem('quickcardLocation');
          
          // Restore quickcard creator state
          const creatorState = sessionStorage.getItem('quickcardCreatorState');
          if (creatorState) {
            const state = JSON.parse(creatorState);
            
            // Restore basic state
            setQuickcardTitle(state.title || '');
            setQuickcardCategories(state.categories || []);
            setQuickcardAudioSource(state.audioSource || null);
            setQuickcardAudioFileName(state.audioFileName || null);
            
            // ✅ NEW: Restore photo from base64
            if (state.photoBase64) {
              try {
                // Convert base64 back to File object
                const response = await fetch(state.photoBase64);
                const blob = await response.blob();
                const photoFile = new File([blob], 'quickcard-photo.jpg', { type: state.photoType || 'image/jpeg' });
                
                setQuickcardPhoto(photoFile);
                setQuickcardPhotoPreview(state.photoBase64); // Use base64 as preview
                console.log('📸 Photo restored from storage');
              } catch (error) {
                console.error('❌ Failed to restore photo from base64:', error);
              }
            }
            
            // ✅ NEW: Restore audio from base64  
            if (state.audioBase64) {
              try {
                // Convert base64 back to File object
                const response = await fetch(state.audioBase64);
                const blob = await response.blob();
                const audioFile = new File([blob], state.audioFileName || 'quickcard-audio.mp3', { type: state.audioType || 'audio/mpeg' });
                
                setQuickcardAudio(audioFile);
                console.log('🎵 Audio restored from storage');
              } catch (error) {
                console.error('❌ Failed to restore audio from base64:', error);
              }
            }
            
            setShowQuickcardCreator(true);
            sessionStorage.removeItem('quickcardCreatorState');
          }
        } catch (error) {
          console.error('Error parsing quickcard location:', error);
        }
      }
    };

    restoreState();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle quickcard import
  const handleQuickcardImport = (quickcard: Vostcard) => {
    loadQuickcard(quickcard);
    setShowQuickcardImporter(false);
    // Navigate to the advanced editor to continue editing
    navigate('/studio', { state: { editingQuickcard: quickcard.id, activeTab: 'quickcard' } });
  };

  const handleCancelImport = () => {
    setShowQuickcardImporter(false);
  };

  const handleCancelCreator = () => {
    setShowQuickcardCreator(false);
    // Clear creation state and clean up blob URLs
    setQuickcardTitle('');
    quickcardPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setQuickcardPhotos([]);
    setQuickcardPhotoPreviews([]);
    setQuickcardLocation(null);
    setQuickcardAudio(null);
    setQuickcardAudioSource(null);
    setQuickcardAudioFileName(null);
    setQuickcardCategories([]);
  };

  // Enhanced photo upload handler for multiple photos (up to 4)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select valid image files.');
      return;
    }

    // Check total count (existing + new)
    const totalPhotos = quickcardPhotos.length + imageFiles.length;
    if (totalPhotos > 4) {
      alert(`You can only add up to 4 photos. Currently have ${quickcardPhotos.length}, trying to add ${imageFiles.length}.`);
      return;
    }

    // Add new photos and previews
    const newPhotos = [...quickcardPhotos, ...imageFiles];
    const newPreviews = [...quickcardPhotoPreviews];
    
    imageFiles.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push(previewUrl);
    });

    setQuickcardPhotos(newPhotos);
    setQuickcardPhotoPreviews(newPreviews);
    
    console.log(`📸 Added ${imageFiles.length} photos. Total: ${newPhotos.length}/4`);
  };

  // Remove a specific photo
  const removePhoto = (index: number) => {
    const newPhotos = quickcardPhotos.filter((_, i) => i !== index);
    const newPreviews = quickcardPhotoPreviews.filter((_, i) => i !== index);
    
    // Clean up blob URL
    if (quickcardPhotoPreviews[index]) {
      URL.revokeObjectURL(quickcardPhotoPreviews[index]);
    }
    
    setQuickcardPhotos(newPhotos);
    setQuickcardPhotoPreviews(newPreviews);
  };

  const handleQuickcardAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setQuickcardAudio(file);
      setQuickcardAudioSource('file');
      setQuickcardAudioFileName(file.name);
    }
  };

  const handleQuickcardCategoryToggle = (category: string) => {
    if (quickcardCategories.includes(category)) {
      setQuickcardCategories(prev => prev.filter(c => c !== category));
    } else {
      setQuickcardCategories(prev => [...prev, category]);
    }
  };

  const handleQuickcardPinPlacer = () => {
    // ✅ NEW: Store photo and audio as base64 in sessionStorage
    const storePhotoAsBase64 = async (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
  };

    const prepareStateForStorage = async () => {
      const state: any = {
        title: quickcardTitle,
        categories: quickcardCategories,
        audioSource: quickcardAudioSource,
        audioFileName: quickcardAudioFileName
      };

      // ✅ Convert photo to base64 if exists
      if (quickcardPhotos.length > 0) {
        try {
          const base64Photos: string[] = await Promise.all(quickcardPhotos.map(storePhotoAsBase64));
          state.photoBase64 = JSON.stringify(base64Photos);
          state.photoType = 'image/jpeg'; // Default type, can be more specific if needed
          console.log('📸 Photos converted to base64 for storage');
        } catch (error) {
          console.error('❌ Failed to convert photos to base64:', error);
        }
      }

      // ✅ Convert audio to base64 if exists
      if (quickcardAudio) {
        try {
          state.audioBase64 = await storePhotoAsBase64(quickcardAudio);
          state.audioType = quickcardAudio.type;
          console.log('🎵 Audio converted to base64 for storage');
        } catch (error) {
          console.error('❌ Failed to convert audio to base64:', error);
        }
      }

      // Store in sessionStorage
      sessionStorage.setItem('quickcardCreatorState', JSON.stringify(state));
      
      // Navigate to pin placer
      navigate('/pin-placer', {
        state: {
          returnTo: '/studio',
          quickcardCreation: true,
          title: quickcardTitle || 'New Quickcard',
          pinData: {
            id: 'temp_quickcard',
            title: quickcardTitle || 'New Quickcard',
            description: 'Quickcard location',
            latitude: quickcardLocation?.latitude || 40.7128,
            longitude: quickcardLocation?.longitude || -74.0060,
            isOffer: false,
            isQuickcard: true
          }
        }
      });
    };

    prepareStateForStorage();
  };

  // Update creation functions to use multiple photos
  const handleSaveQuickcardAsDraft = async () => {
    if (!quickcardTitle.trim()) {
      alert('Please enter a title for your quickcard.');
      return;
    }

    if (quickcardPhotos.length === 0) {
      alert('Please add at least one photo for your quickcard.');
      return;
    }

    if (!quickcardLocation) {
      alert('Please set a location for your quickcard.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create quickcard as private draft with multiple photos
      const quickcard: Vostcard = {
        id: `quickcard_${Date.now()}`,
        title: quickcardTitle.trim(),
        description: '', 
        photos: quickcardPhotos, // Multiple photos
        audio: quickcardAudio,
        categories: quickcardCategories,
        geo: quickcardLocation,
        username: user?.displayName || user?.email || 'Unknown User',
        userID: user?.uid || '',
        userRole: userRole || 'user',
        state: 'private',
        video: null,
        isQuickcard: true,
        hasVideo: false,
        hasPhotos: quickcardPhotos.length > 0,
        hasAudio: !!quickcardAudio,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveLocalVostcard(quickcard);
      setCurrentVostcard(quickcard);
      
      alert(`✅ Quickcard saved as private draft with ${quickcardPhotos.length} photo(s)!`);
      resetQuickcardForm();
      
    } catch (error) {
      console.error('❌ Error saving quickcard draft:', error);
      alert('Failed to save quickcard draft. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostQuickcardToMap = async () => {
    if (!quickcardTitle.trim()) {
      alert('Please enter a title for your quickcard.');
      return;
    }

    if (quickcardPhotos.length === 0) {
      alert('Please add at least one photo for your quickcard.');
      return;
    }

    if (!quickcardLocation) {
      alert('Please set a location for your quickcard.');
      return;
    }

    if (quickcardCategories.length === 0) {
      alert('Please select at least one category for your quickcard.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create quickcard ready for posting with multiple photos
      const quickcard: Vostcard = {
        id: `quickcard_${Date.now()}`,
        title: quickcardTitle.trim(),
        description: quickcardCategories.join(', ') || 'Quickcard',
        photos: quickcardPhotos, // Multiple photos
        audio: quickcardAudio,
        categories: quickcardCategories,
        geo: quickcardLocation,
        username: user?.displayName || user?.email || 'Unknown User',
        userID: user?.uid || '',
        userRole: userRole || 'user',
        state: 'private',
        video: null,
        isQuickcard: true,
        hasVideo: false,
        hasPhotos: quickcardPhotos.length > 0,
        hasAudio: !!quickcardAudio,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentVostcard(quickcard);
      await new Promise(resolve => setTimeout(resolve, 100));
      await postQuickcard(quickcard);
      
      alert(`🎉 Quickcard posted to map with ${quickcardPhotos.length} photo(s)!`);
      resetQuickcardForm();
      
      navigate('/home', { 
        state: { 
          freshLoad: true,
          timestamp: Date.now(),
          justPosted: 'quickcard'
        }
      });
      
    } catch (error) {
      console.error('❌ Error posting quickcard:', error);
      alert('Failed to post quickcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to reset form - UPDATED for multiple photos
  const resetQuickcardForm = () => {
    setQuickcardTitle('');
    
    // Clean up photo blob URLs
    quickcardPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setQuickcardPhotos([]);
    setQuickcardPhotoPreviews([]);
    
    setQuickcardAudio(null);
    setQuickcardAudioSource(null);
    setQuickcardAudioFileName(null);
    setQuickcardLocation(null);
    setQuickcardCategories([]);
  };

  const handleTakePhoto = () => {
    document.getElementById('quickcard-camera-input')?.click();
  };

  const handleSelectFromGallery = () => {
    document.getElementById('quickcard-gallery-input')?.click();
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '20px',
      paddingBottom: '20px',
      overflowY: 'auto', // ✅ Make scrollable
      maxHeight: '100vh' // ✅ Limit height to enable scrolling
    }}>
      
      {/* Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          Vōstcard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={24} />
          </button>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate('/home')}
          >
            <FaHome color="#fff" size={40} />
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Content */}
      <div style={{ 
        flex: 1,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0 0 10px 0',
          textAlign: 'center'
        }}>
          Vostcard Studio
        </h1>

        {/* Editing Indicator */}
        {editingDrivecard && (
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #2196f3',
            fontSize: '14px',
            color: '#1565c0',
            textAlign: 'center',
            marginBottom: '15px',
            maxWidth: '350px',
            width: '100%'
          }}>
            ✏️ Editing: <strong>{editingDrivecard.title}</strong>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{
            backgroundColor: '#fff3cd',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #ffc107',
            fontSize: '14px',
            color: '#856404',
            textAlign: 'center',
            marginBottom: '15px',
            maxWidth: '350px',
            width: '100%'
          }}>
            ⏳ Loading drivecard for editing...
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '20px',
          width: '100%',
          maxWidth: '350px'
        }}>
          <button
            onClick={() => setActiveSection('quickcard')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSection === 'quickcard' ? '#007aff' : 'transparent',
              color: activeSection === 'quickcard' ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📝 Quickcard
          </button>

          {canAccessDrivecard && (
            <button
              onClick={() => setActiveSection('drivecard')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeSection === 'drivecard' ? '#007aff' : 'transparent',
                color: activeSection === 'drivecard' ? 'white' : '#666',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🚗 Drivecard
            </button>
          )}
        </div>

        {/* Quickcard Section */}
        {activeSection === 'quickcard' && (
          <div style={{
            borderRadius: '8px',
            padding: '15px',
            width: '100%',
            maxWidth: '350px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            maxHeight: 'none', // ✅ Remove height limit
            overflowY: 'visible' // ✅ Allow content to flow
          }}>
            <h3 style={{ marginTop: 0 }}>
              📷 Quickcard Creator
            </h3>

            {/* Title Input */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                Title
              </label>
              <input
                type="text"
                value={quickcardTitle}
                onChange={(e) => setQuickcardTitle(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #333',
                  borderRadius: '4px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1
                }}
              />
            </div>

            {/* Photo Gallery Preview */}
            {quickcardPhotoPreviews.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '8px'
                }}>
                  Photos ({quickcardPhotoPreviews.length}/4)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  {quickcardPhotoPreviews.map((preview, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#f0f0f0'
                      }}
                    >
                      <img
                        src={preview}
                        alt={`Photo ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        disabled={isLoading}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 0, 0, 0.8)',
                          color: 'white',
                          border: 'none',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Button Grid - Photos, Location, and Audio */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <button 
                onClick={() => document.getElementById('quickcard-camera-input')?.click()}
                disabled={isLoading || quickcardPhotos.length >= 4}
                style={{
                  backgroundColor: (isLoading || quickcardPhotos.length >= 4) ? '#ccc' : '#007aff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: (isLoading || quickcardPhotos.length >= 4) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaCamera size={14} />
                📸 Take Photo
              </button>

              <button 
                onClick={() => document.getElementById('quickcard-gallery-input')?.click()}
                disabled={isLoading || quickcardPhotos.length >= 4}
                style={{
                  backgroundColor: (isLoading || quickcardPhotos.length >= 4) ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: (isLoading || quickcardPhotos.length >= 4) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaImages size={14} />
                🖼️ From Library
              </button>
            </div>

            {/* Location and Audio Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <button 
                onClick={handleQuickcardPinPlacer}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaMapMarkerAlt size={14} />
                📍 Set Location
              </button>
              
              <button 
                onClick={() => document.getElementById('quickcard-audio-input')?.click()}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#9c27b0',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaUpload size={14} />
                🎵 Add Audio
              </button>
            </div>

            {/* Audio Status Display */}
            {quickcardAudio && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{
                  backgroundColor: '#f3e5f5',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #9c27b0',
                  fontSize: '14px',
                  color: '#6a1b9a'
                }}>
                  🎵 {quickcardAudioFileName || 'Audio file ready'}
                  <button
                    onClick={() => {
                      setQuickcardAudio(null);
                      setQuickcardAudioSource(null);
                      setQuickcardAudioFileName(null);
                    }}
                    disabled={isLoading}
                    style={{
                      marginLeft: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#d32f2f',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            )}

            {/* Categories Section */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '6px',
                color: '#333'
              }}>
                Categories {quickcardCategories.length > 0 && <span style={{color: 'green'}}>✅</span>}
              </label>
              
              <div
                onClick={() => setShowQuickcardCategoryModal(true)}
                disabled={isLoading}
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: quickcardCategories.length > 0 ? '#333' : '#999',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {quickcardCategories.length > 0 ? 
                  `${quickcardCategories.length} categor${quickcardCategories.length === 1 ? 'y' : 'ies'} selected` : 
                  'Select Categories (Required)'
                }
              </div>

              {/* Display Selected Categories */}
              {quickcardCategories.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {quickcardCategories.map((category, index) => (
                    <span
                      key={category}
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        marginRight: '6px',
                        marginBottom: '4px'
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ Two Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              {/* Save as Draft Button */}
              <button 
                onClick={handleSaveQuickcardAsDraft}
                disabled={!quickcardTitle.trim() || !quickcardLocation || isLoading || quickcardPhotos.length === 0 || quickcardCategories.length === 0}
                style={{
                  backgroundColor: (!quickcardTitle.trim() || !quickcardLocation || isLoading || quickcardPhotos.length === 0 || quickcardCategories.length === 0) ? '#ccc' : '#666',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: (!quickcardTitle.trim() || !quickcardLocation || isLoading || quickcardPhotos.length === 0 || quickcardCategories.length === 0) ? 'not-allowed' : 'pointer',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaSave size={12} />
                Save Draft
              </button>

              {/* Post to Map Button */}
              <button 
                onClick={handlePostQuickcardToMap}
                disabled={!quickcardTitle.trim() || !quickcardLocation || isLoading || quickcardPhotos.length === 0 || quickcardCategories.length === 0}
                style={{
                  backgroundColor: (!quickcardTitle.trim() || !quickcardLocation || isLoading || quickcardPhotos.length === 0 || quickcardCategories.length === 0) ? '#ccc' : '#007aff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: (!quickcardTitle.trim() || !quickcardLocation || isLoading || quickcardPhotos.length === 0 || quickcardCategories.length === 0) ? 'not-allowed' : 'pointer',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaGlobe size={12} />
                Post to Map
              </button>
            </div>

            {/* Clear Photo Button */}
            {quickcardPhotos.length > 0 && (
              <button
                onClick={() => {
                  quickcardPhotos.forEach(photo => URL.revokeObjectURL(URL.createObjectURL(photo)));
                  setQuickcardPhotos([]);
                  setQuickcardPhotoPreviews([]);
                }}
                disabled={isLoading}
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: isLoading ? 0.6 : 1,
                  marginBottom: '10px'
                }}
              >
                Clear All Photos
              </button>
            )}

            {/* Clear Audio Button */}
            {quickcardAudio && (
              <button
                onClick={() => {
                  setQuickcardAudio(null);
                  setQuickcardAudioSource(null);
                  setQuickcardAudioFileName(null);
                }}
                disabled={isLoading}
                style={{
                  backgroundColor: '#ff5722',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: isLoading ? 0.6 : 1,
                  marginBottom: '10px'
                }}
              >
                Clear Audio
              </button>
            )}

            {/* Save/Update Button */}
            <button 
              onClick={handleSaveOrUpdate}
              disabled={!title.trim() || !selectedLocation || isRecording || isLoading || (!editingDrivecard && !audioBlob)}
              style={{
                backgroundColor: (!title.trim() || !selectedLocation || isRecording || isLoading || (!editingDrivecard && !audioBlob)) ? '#ccc' : '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (!title.trim() || !selectedLocation || isRecording || isLoading || (!editingDrivecard && !audioBlob)) ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FaSave size={14} />
              {editingDrivecard ? 'Update Drivecard' : 'Save Drivecard'}
            </button>

            {/* Clear Audio Button */}
            {audioBlob && !isRecording && (
              <button
                onClick={clearRecording}
                disabled={isLoading}
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {editingDrivecard ? 'Clear New Audio' : 'Clear Audio'}
              </button>
            )}
          </div>
        )}

        {/* Category Selection Modal */}
        {showQuickcardCategoryModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 998
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              width: '80%',
              maxWidth: '400px',
              maxHeight: '60vh',
              overflow: 'auto',
              position: 'relative',
              zIndex: 999
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
                Select Categories
              </h3>
              
              {availableCategories.filter(cat => cat !== 'None').map((category) => (
                <div
                  key={category}
                  onClick={() => handleQuickcardCategoryToggle(category)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={quickcardCategories.includes(category)}
                    readOnly
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px' }}>{category}</span>
                </div>
              ))}
              
              <button
                onClick={() => setShowQuickcardCategoryModal(false)}
                style={{
                  marginTop: '15px',
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Photo Options Modal */}
        <PhotoOptionsModal
          isOpen={showPhotoOptionsModal}
          onClose={() => setShowPhotoOptionsModal(false)}
          onTakePhoto={handleTakePhoto}
          onSelectFromGallery={handleSelectFromGallery}
          currentPhotoCount={quickcardPhotos.length}
          maxPhotos={4}
        />

        {/* Hidden Inputs - NATIVE APP ACCESS */}
        <input
          id="quickcard-camera-input"
          type="file"
          accept="image/*"
          capture="environment" // 📸 Opens NATIVE CAMERA APP
          onChange={handlePhotoUpload}
          style={{ display: 'none' }}
        />
        
        <input
          id="quickcard-gallery-input"
          type="file"
          accept="image/*"
          multiple // 🖼️ Opens NATIVE PHOTO LIBRARY with multi-select
          onChange={handlePhotoUpload}
          style={{ display: 'none' }}
        />
        
        <input
          id="quickcard-audio-input"
          type="file"
          accept="audio/*"
          onChange={handleQuickcardAudioUpload}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default VostcardStudioView; 