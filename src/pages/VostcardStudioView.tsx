import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaList, FaMicrophone, FaStop, FaUpload, FaMapMarkerAlt, FaSave, FaCamera, FaGlobe, FaImages, FaEdit } from 'react-icons/fa';
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
  const { saveLocalVostcard, setCurrentVostcard, postQuickcard, clearVostcard, savedVostcards, currentVostcard, loadAllLocalVostcardsImmediate } = useVostcard();
  
  // Categories from step 3
  const availableCategories = [
    'None',
    'View',
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
  const [showQuickcardLoader, setShowQuickcardLoader] = useState(false);
  
  // Quickcard creation state - ENHANCED FOR MULTIPLE PHOTOS
  const [quickcardTitle, setQuickcardTitle] = useState('');
  const [quickcardDescription, setQuickcardDescription] = useState('');
  const [quickcardPhotos, setQuickcardPhotos] = useState<(Blob | File)[]>([]); // Array of photos
  const [quickcardPhotoPreviews, setQuickcardPhotoPreviews] = useState<string[]>([]); // Array of previews
  const [quickcardLocation, setQuickcardLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  // Separate audio states for Intro and Detail
  const [quickcardIntroAudio, setQuickcardIntroAudio] = useState<Blob | null>(null);
  const [quickcardIntroAudioSource, setQuickcardIntroAudioSource] = useState<'recording' | 'file' | null>(null);
  const [quickcardIntroAudioFileName, setQuickcardIntroAudioFileName] = useState<string | null>(null);
  const [quickcardDetailAudio, setQuickcardDetailAudio] = useState<Blob | null>(null);
  const [quickcardDetailAudioSource, setQuickcardDetailAudioSource] = useState<'recording' | 'file' | null>(null);
  const [quickcardDetailAudioFileName, setQuickcardDetailAudioFileName] = useState<string | null>(null);
  const [quickcardCategories, setQuickcardCategories] = useState<string[]>([]);
  const [showQuickcardCategoryModal, setShowQuickcardCategoryModal] = useState(false);

  // Drag and drop state for photo reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Touch drag state for mobile
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

        await drivecardService.save(updatedDrivecard);
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
          
          // Restore quickcard creator state ONLY if it exists and has actual data
          const creatorState = sessionStorage.getItem('quickcardCreatorState');
          if (creatorState) {
            const state = JSON.parse(creatorState);
            
            // Only restore fields that have actual values (don't overwrite existing data with empty values)
            if (state.title) setQuickcardTitle(state.title);
            if (state.description) setQuickcardDescription(state.description);
            if (state.categories && state.categories.length > 0) setQuickcardCategories(state.categories);
            if (state.audioSource) setQuickcardIntroAudioSource(state.audioSource);
            if (state.audioFileName) setQuickcardIntroAudioFileName(state.audioFileName);
            
            // ✅ NEW: Restore photo from base64 (only if exists)
            if (state.photoBase64) {
              try {
                // Convert base64 back to File object
                const response = await fetch(state.photoBase64);
                const blob = await response.blob();
                const photoFile = new File([blob], 'quickcard-photo.jpg', { type: state.photoType || 'image/jpeg' });
                
                setQuickcardPhotos([photoFile]);
                setQuickcardPhotoPreviews([state.photoBase64]); // Use base64 as preview
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
                
                setQuickcardIntroAudio(audioFile);
                console.log('🎵 Audio restored from storage');
              } catch (error) {
                console.error('❌ Failed to restore audio from base64:', error);
              }
            }
            
            // Clear the creator state after restoration
            sessionStorage.removeItem('quickcardCreatorState');
            console.log('✅ Quickcard location set and state restored');
          } else {
            console.log('✅ Quickcard location set (no stored state to restore)');
          }
          
          setShowQuickcardCreator(true);
        } catch (error) {
          console.error('Error parsing quickcard location:', error);
        }
      }
    };

    restoreState();
  }, []); // Only run once on mount

  // Separate useEffect for loading existing quickcard data - only runs once
  useEffect(() => {
    // Check for existing quickcard data from context or transfer (only on initial load)
    loadExistingQuickcardData();
  }, []); // Only run once on mount

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

  // Load quickcard data from currentVostcard context or sessionStorage
  const loadExistingQuickcardData = () => {
    try {
      // Don't overwrite existing form data if user has already entered something
      const hasExistingData = quickcardTitle.trim() || quickcardDescription.trim() || quickcardPhotos.length > 0;
      if (hasExistingData) {
        console.log('📱 Skipping data load - form already has content');
        return;
      }
      
      // First try sessionStorage (from transfer button)
      const transferData = sessionStorage.getItem('quickcardTransferData');
      if (transferData) {
        const data = JSON.parse(transferData);
        console.log('📱 Loading transferred quickcard data:', data);
        
        // Populate VostcardStudio fields with transferred data
        setQuickcardTitle(data.title || '');
        setQuickcardDescription(data.description || '');
        setQuickcardCategories(data.categories || []);
        
        // Handle photos
        if (data.photos && data.photos.length > 0) {
          setQuickcardPhotos(data.photos);
          // Create preview URLs for the photos
          const previews = data.photos.map((photo: any) => {
            if (photo && (photo instanceof File || photo instanceof Blob)) {
              return URL.createObjectURL(photo);
            }
            return '';
          });
          setQuickcardPhotoPreviews(previews);
        }
        
        // Handle location
        if (data.location) {
          setQuickcardLocation({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            address: data.location.address
          });
        }
        
        // Show the quickcard creator
        setShowQuickcardCreator(true);
        
        // Clear the transfer data
        sessionStorage.removeItem('quickcardTransferData');
        
        console.log('✅ Quickcard data transferred successfully');
        return;
      }
      
      // If no sessionStorage data, check currentVostcard context
      if (currentVostcard?.isQuickcard && quickcardTitle === '' && quickcardDescription === '') {
        console.log('📱 Loading quickcard data from context:', currentVostcard);
        
        // Populate fields from context
        setQuickcardTitle(currentVostcard.title || '');
        setQuickcardDescription(currentVostcard.description || '');
        setQuickcardCategories(currentVostcard.categories || []);
        
        // Handle photos
        if (currentVostcard.photos && currentVostcard.photos.length > 0) {
          setQuickcardPhotos(currentVostcard.photos);
          // Create preview URLs for the photos
          const previews = currentVostcard.photos.map((photo: any) => {
            if (photo && (photo instanceof File || photo instanceof Blob)) {
              return URL.createObjectURL(photo);
            }
            return '';
          });
          setQuickcardPhotoPreviews(previews);
        }
        
        // Handle location
        if (currentVostcard.geo) {
          setQuickcardLocation({
            latitude: currentVostcard.geo.latitude,
            longitude: currentVostcard.geo.longitude
          });
        }
        
        // Show the quickcard creator
        setShowQuickcardCreator(true);
        
        console.log('✅ Quickcard data loaded from context');
      }
    } catch (error) {
      console.error('❌ Error loading quickcard data:', error);
    }
  };

  const handleCancelCreator = () => {
    setShowQuickcardCreator(false);
    // Clear creation state and clean up blob URLs
    setQuickcardTitle('');
    quickcardPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setQuickcardPhotos([]);
    setQuickcardPhotoPreviews([]);
    setQuickcardLocation(null);
    setQuickcardIntroAudio(null);
    setQuickcardIntroAudioSource(null);
    setQuickcardIntroAudioFileName(null);
    setQuickcardDetailAudio(null);
    setQuickcardDetailAudioSource(null);
    setQuickcardDetailAudioFileName(null);
    setQuickcardCategories([]);
  };

  // Enhanced photo upload handler for multiple photos (unlimited)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select valid image files.');
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
    
    console.log(`📸 Added ${imageFiles.length} photos. Total: ${newPhotos.length}`);
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

  // Drag and drop handlers for photo reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
    
    // Prevent default behavior to avoid conflicts with touch events
    e.preventDefault();
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder photos and previews
    const newPhotos = [...quickcardPhotos];
    const newPreviews = [...quickcardPhotoPreviews];
    
    const draggedPhoto = newPhotos[draggedIndex];
    const draggedPreview = newPreviews[draggedIndex];
    
    // Remove from original position
    newPhotos.splice(draggedIndex, 1);
    newPreviews.splice(draggedIndex, 1);
    
    // Insert at new position
    newPhotos.splice(dropIndex, 0, draggedPhoto);
    newPreviews.splice(dropIndex, 0, draggedPreview);
    
    setQuickcardPhotos(newPhotos);
    setQuickcardPhotoPreviews(newPreviews);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setDraggedIndex(index);
    setIsDragging(false);
    
    // Prevent scrolling when starting to drag
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || !touchStartPos) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Start dragging if moved more than 10px
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
      
      // Find which photo we're over
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const photoElement = elements.find(el => el.getAttribute('data-photo-index'));
      if (photoElement) {
        const targetIndex = parseInt(photoElement.getAttribute('data-photo-index') || '0');
        if (targetIndex !== draggedIndex) {
          setDragOverIndex(targetIndex);
        } else {
          setDragOverIndex(null);
        }
      }
    }
    
    // Prevent scrolling while dragging
    if (isDragging) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (draggedIndex === null) return;
    
    if (isDragging && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      // Perform the reorder
      const newPhotos = [...quickcardPhotos];
      const newPreviews = [...quickcardPhotoPreviews];
      
      const draggedPhoto = newPhotos[draggedIndex];
      const draggedPreview = newPreviews[draggedIndex];
      
      newPhotos.splice(draggedIndex, 1);
      newPreviews.splice(draggedIndex, 1);
      
      newPhotos.splice(dragOverIndex, 0, draggedPhoto);
      newPreviews.splice(dragOverIndex, 0, draggedPreview);
      
      setQuickcardPhotos(newPhotos);
      setQuickcardPhotoPreviews(newPreviews);
    }
    
    // Reset all drag state
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartPos(null);
    setIsDragging(false);
  };

  const handleQuickcardAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, audioType: 'intro' | 'detail') => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      if (audioType === 'intro') {
        setQuickcardIntroAudio(file);
        setQuickcardIntroAudioSource('file');
        setQuickcardIntroAudioFileName(file.name);
      } else if (audioType === 'detail') {
        setQuickcardDetailAudio(file);
        setQuickcardDetailAudioSource('file');
        setQuickcardDetailAudioFileName(file.name);
      }
    }
  };

  const handleQuickcardCategoryToggle = (category: string) => {
    if (quickcardCategories.includes(category)) {
      setQuickcardCategories(prev => prev.filter(c => c !== category));
    } else {
      setQuickcardCategories(prev => [...prev, category]);
    }
  };

  const handleQuickcardPinPlacer = async () => {
    console.log('🗺️ Pin placer button clicked!'); // Debug log
    
    // ✅ SAVE CURRENT QUICKCARD STATE BEFORE NAVIGATING
    const stateToSave: any = {
      title: quickcardTitle,
      description: quickcardDescription,
      categories: quickcardCategories,
      audioSource: quickcardIntroAudioSource,
      audioFileName: quickcardIntroAudioFileName,
    };

    // Convert photos to base64 for storage
    if (quickcardPhotos.length > 0) {
      try {
        const photoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(quickcardPhotos[0]);
        });
        stateToSave.photoBase64 = photoBase64;
        stateToSave.photoType = quickcardPhotos[0].type;
      } catch (error) {
        console.error('❌ Failed to convert photo to base64:', error);
      }
    }

    // Convert audio to base64 for storage
    if (quickcardIntroAudio) {
      try {
        const audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(quickcardIntroAudio);
        });
        stateToSave.audioBase64 = audioBase64;
        stateToSave.audioType = quickcardIntroAudio.type;
      } catch (error) {
        console.error('❌ Failed to convert audio to base64:', error);
      }
    }

    // Store the state
    sessionStorage.setItem('quickcardCreatorState', JSON.stringify(stateToSave));
    
    // Navigate to pin placer with required pinData
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

  // Update creation functions to use multiple photos
  const handleSaveQuickcardToPersonalPosts = async () => {
    if (!quickcardTitle.trim()) {
      alert('Please enter a title for your quickcard.');
      return;
    }

    if (quickcardPhotos.length === 0) {
      alert('Please add at least one photo for your quickcard.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare audio files and labels
      const audioFiles: Blob[] = [];
      const audioLabels: string[] = [];
      
      if (quickcardIntroAudio) {
        audioFiles.push(quickcardIntroAudio);
        audioLabels.push('intro');
      }
      
      if (quickcardDetailAudio) {
        audioFiles.push(quickcardDetailAudio);
        audioLabels.push('detail');
      }
      
      // Create quickcard as private draft with multiple photos and audio files
      const quickcard: Vostcard = {
        id: `quickcard_${Date.now()}`,
        title: quickcardTitle.trim(),
        description: quickcardDescription.trim() || '', 
        photos: quickcardPhotos, // Multiple photos
        audio: quickcardIntroAudio, // LEGACY: Keep for backward compatibility
        audioFiles: audioFiles, // NEW: Multiple audio files
        audioLabels: audioLabels, // NEW: Labels for multiple audio files
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
        hasAudio: !!(quickcardIntroAudio || quickcardDetailAudio),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentVostcard(quickcard);
      await saveLocalVostcard();
      
      alert(`✅ Quickcard saved to Personal Posts with ${quickcardPhotos.length} photo(s)!`);
      resetQuickcardForm();
      
    } catch (error) {
      console.error('❌ Error saving quickcard draft:', error);
      alert('Failed to save quickcard to Personal Posts. Please try again.');
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
      
      // Prepare audio files and labels
      const audioFiles: Blob[] = [];
      const audioLabels: string[] = [];
      
      if (quickcardIntroAudio) {
        audioFiles.push(quickcardIntroAudio);
        audioLabels.push('intro');
      }
      
      if (quickcardDetailAudio) {
        audioFiles.push(quickcardDetailAudio);
        audioLabels.push('detail');
      }
      
      // Create quickcard ready for posting with multiple photos
      const quickcard: Vostcard = {
        id: `quickcard_${Date.now()}`,
        title: quickcardTitle.trim(),
        description: quickcardDescription.trim() || 'Quickcard',
        photos: quickcardPhotos, // Multiple photos
        audio: quickcardIntroAudio, // Use intro audio as primary
        audioFiles: audioFiles, // NEW: Multiple audio files
        audioLabels: audioLabels, // NEW: Labels for multiple audio files
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
        hasAudio: !!(quickcardIntroAudio || quickcardDetailAudio),
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
    setQuickcardDescription('');
    
    // Clean up photo blob URLs
    quickcardPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setQuickcardPhotos([]);
    setQuickcardPhotoPreviews([]);
    
    setQuickcardIntroAudio(null);
    setQuickcardIntroAudioSource(null);
    setQuickcardIntroAudioFileName(null);
    setQuickcardDetailAudio(null);
    setQuickcardDetailAudioSource(null);
    setQuickcardDetailAudioFileName(null);
    setQuickcardLocation(null);
    setQuickcardCategories([]);
  };

  // Function to load a quickcard for editing
  const loadQuickcardForEditing = async (quickcard: Vostcard) => {
    console.log('🔄 Loading quickcard for editing:', quickcard);
    
    try {
      setIsLoading(true);
      
      // Load basic information
      setQuickcardTitle(quickcard.title || '');
      setQuickcardDescription(quickcard.description || '');
      setQuickcardCategories(quickcard.categories || []);
      
      // Load location
      if (quickcard.geo) {
        setQuickcardLocation({
          latitude: quickcard.geo.latitude,
          longitude: quickcard.geo.longitude,
          address: (quickcard.geo as any).address // Address might be in geo object
        });
      }

      // Load photos (convert URLs to Blobs)
      if (quickcard._firebasePhotoURLs && quickcard._firebasePhotoURLs.length > 0) {
        const photoBlobs: Blob[] = [];
        const photoPreviews: string[] = [];
        for (const photoUrl of quickcard._firebasePhotoURLs) {
          try {
            const response = await fetch(photoUrl);
            const blob = await response.blob();
            photoBlobs.push(blob);
            photoPreviews.push(URL.createObjectURL(blob));
          } catch (error) {
            console.error('Failed to load photo:', photoUrl, error);
          }
        }
        setQuickcardPhotos(photoBlobs);
        setQuickcardPhotoPreviews(photoPreviews);
      }

      // Load audio from new audioFiles system (preferred)
      if (quickcard.audioFiles && quickcard.audioFiles.length > 0) {
        console.log('🎵 Loading audio from audioFiles:', quickcard.audioFiles.length, 'files');
        
        // Load intro audio (first file)
        if (quickcard.audioFiles[0]) {
          setQuickcardIntroAudio(quickcard.audioFiles[0]);
          setQuickcardIntroAudioSource('file');
          const introLabel = quickcard.audioLabels && quickcard.audioLabels[0] ? quickcard.audioLabels[0] : 'Intro Audio';
          setQuickcardIntroAudioFileName(introLabel);
        }
        
        // Load detail audio (second file)
        if (quickcard.audioFiles[1]) {
          setQuickcardDetailAudio(quickcard.audioFiles[1]);
          setQuickcardDetailAudioSource('file');
          const detailLabel = quickcard.audioLabels && quickcard.audioLabels[1] ? quickcard.audioLabels[1] : 'Detail Audio';
          setQuickcardDetailAudioFileName(detailLabel);
        }
      }
      // Fallback to legacy audio system
      else if (quickcard._firebaseAudioURL) {
        try {
          const response = await fetch(quickcard._firebaseAudioURL);
          const blob = await response.blob();
          setQuickcardIntroAudio(blob);
          setQuickcardIntroAudioSource('file');
          setQuickcardIntroAudioFileName('loaded_audio.mp3');
        } catch (error) {
          console.error('Failed to load intro audio:', error);
        }
      }

      // Fallback to audioURLs system
      const anyQuickcard = quickcard as any;
      if (!quickcard.audioFiles && anyQuickcard.audioURLs && anyQuickcard.audioURLs.length > 1) {
        try {
          const response = await fetch(anyQuickcard.audioURLs[1]);
          const blob = await response.blob();
          setQuickcardDetailAudio(blob);
          setQuickcardDetailAudioSource('file');
          setQuickcardDetailAudioFileName('loaded_detail_audio.mp3');
        } catch (error) {
          console.error('Failed to load detail audio:', error);
        }
      }

      setShowQuickcardLoader(false);
      alert(`✅ Quickcard "${quickcard.title}" loaded for editing!`);
      
    } catch (error) {
      console.error('Error loading quickcard:', error);
      alert('❌ Failed to load quickcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      flexDirection: 'column'
    }}>
      
      {/* Standard Banner - Fixed to reach both sides */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: 'bold', 
            cursor: 'pointer',
            userSelect: 'none'
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

      {/* Content - Adjusted for fixed header */}
      <div style={{ 
        flex: 1,
        padding: '20px',
        paddingTop: '100px', // Account for fixed header height + spacing
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        maxHeight: '100vh'
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
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
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

            {/* Description Input */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                Description
              </label>
              <textarea
                value={quickcardDescription}
                onChange={(e) => setQuickcardDescription(e.target.value)}
                disabled={isLoading}
                placeholder="Add a description for your quickcard..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #333',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1,
                  resize: 'vertical',
                  fontFamily: 'inherit'
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
                      data-photo-index={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onMouseDown={(e) => {
                        // Handle mouse drag for desktop
                        if (e.button === 0) { // Left mouse button only
                          setDraggedIndex(index);
                        }
                      }}
                      onMouseEnter={(e) => {
                        // Handle drag over for mouse
                        if (draggedIndex !== null && draggedIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onMouseLeave={() => {
                        setDragOverIndex(null);
                      }}
                      onMouseUp={() => {
                        // Handle drop for mouse
                        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
                          // Reorder photos
                          const newPhotos = [...quickcardPhotos];
                          const newPreviews = [...quickcardPhotoPreviews];
                          
                          const draggedPhoto = newPhotos[draggedIndex];
                          const draggedPreview = newPreviews[draggedIndex];
                          
                          newPhotos.splice(draggedIndex, 1);
                          newPreviews.splice(draggedIndex, 1);
                          
                          newPhotos.splice(dragOverIndex, 0, draggedPhoto);
                          newPreviews.splice(dragOverIndex, 0, draggedPreview);
                          
                          setQuickcardPhotos(newPhotos);
                          setQuickcardPhotoPreviews(newPreviews);
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#f0f0f0',
                          cursor: 'grab',
                          opacity: draggedIndex === index ? 0.5 : 1,
                          transform: draggedIndex === index ? 'scale(0.95)' : 'scale(1)',
                          transition: isDragging ? 'none' : 'all 0.2s ease', // Disable transition during touch drag
                          border: dragOverIndex === index && draggedIndex !== index ? '2px dashed #007aff' : 'none',
                          boxShadow: dragOverIndex === index && draggedIndex !== index ? '0 0 10px rgba(0, 122, 255, 0.3)' : 'none',
                          touchAction: 'none' // Prevent browser touch behaviors
                        }}
                    >
                      <img
                        src={preview}
                        alt={`Photo ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          pointerEvents: 'none', // Prevent image from interfering with drag
                          userSelect: 'none', // Prevent text selection
                          WebkitUserSelect: 'none'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                      >
                        {index + 1}
                      </div>
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
                          justifyContent: 'center',
                          zIndex: 10
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {quickcardPhotoPreviews.length > 1 && (
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    marginTop: '4px'
                  }}>
                    💡 Tap and drag photos to reorder them
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Button Grid - Load Card and Load Photos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <button
                onClick={() => setShowQuickcardLoader(true)}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#28a745',
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
                <FaEdit size={14} />
                📂 Load Card
              </button>

              <button 
                onClick={() => document.getElementById('quickcard-gallery-input')?.click()}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#007aff',
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
                <FaImages size={14} />
                🖼️ Load Photos
              </button>
            </div>

            {/* Location and Take Photo Buttons */}
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
                onClick={() => document.getElementById('quickcard-camera-input')?.click()}
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
                <FaCamera size={14} />
                📸 Take Photo
              </button>
            </div>

            {/* Intro and Detail Audio Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <button 
                onClick={() => document.getElementById('quickcard-intro-audio-input')?.click()}
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
                🎵 Intro
              </button>
              
              <button 
                onClick={() => document.getElementById('quickcard-detail-audio-input')?.click()}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#e91e63',
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
                🎵 Detail
              </button>
            </div>

            {/* Audio Status Display */}
            {(quickcardIntroAudio || quickcardDetailAudio) && (
              <div style={{ marginBottom: '15px' }}>
                {quickcardIntroAudio && (
                  <div style={{
                    backgroundColor: '#f3e5f5',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #9c27b0',
                    fontSize: '14px',
                    color: '#6a1b9a',
                    marginBottom: '8px'
                  }}>
                    🎵 Intro: {quickcardIntroAudioFileName || 'Audio file ready'}
                    <button
                      onClick={() => {
                        setQuickcardIntroAudio(null);
                        setQuickcardIntroAudioSource(null);
                        setQuickcardIntroAudioFileName(null);
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
                )}
                {quickcardDetailAudio && (
                  <div style={{
                    backgroundColor: '#fce4ec',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #e91e63',
                    fontSize: '14px',
                    color: '#ad1457'
                  }}>
                    🎵 Detail: {quickcardDetailAudioFileName || 'Audio file ready'}
                    <button
                      onClick={() => {
                        setQuickcardDetailAudio(null);
                        setQuickcardDetailAudioSource(null);
                        setQuickcardDetailAudioFileName(null);
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
                )}
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
                onClick={isLoading ? undefined : () => setShowQuickcardCategoryModal(true)}
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

            {/* Audio Status Indicator */}
            {(quickcardIntroAudio || quickcardDetailAudio) && (
              <div style={{
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '10px',
                fontSize: '12px',
                color: '#1976d2',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🎵 Audio files present - will be included when posting to map
              </div>
            )}

            {/* ✅ Two Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              {/* Save to Personal Posts Button */}
              <button 
                onClick={handleSaveQuickcardToPersonalPosts}
                disabled={!quickcardTitle.trim() || isLoading || quickcardPhotos.length === 0}
                style={{
                  backgroundColor: (!quickcardTitle.trim() || isLoading || quickcardPhotos.length === 0) ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: (!quickcardTitle.trim() || isLoading || quickcardPhotos.length === 0) ? 'not-allowed' : 'pointer',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaSave size={12} />
                Save
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

            {/* Clear Audio Buttons */}
            {(quickcardIntroAudio || quickcardDetailAudio) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {quickcardIntroAudio && (
                  <button
                    onClick={() => {
                      setQuickcardIntroAudio(null);
                      setQuickcardIntroAudioSource(null);
                      setQuickcardIntroAudioFileName(null);
                    }}
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#9c27b0',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      flex: 1,
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    Clear Intro
                  </button>
                )}
                {quickcardDetailAudio && (
                  <button
                    onClick={() => {
                      setQuickcardDetailAudio(null);
                      setQuickcardDetailAudioSource(null);
                      setQuickcardDetailAudioFileName(null);
                    }}
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#e91e63',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      flex: 1,
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    Clear Detail
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Drivecard Section */}
        {activeSection === 'drivecard' && (
          <div style={{
            borderRadius: '8px',
            padding: '15px',
            width: '100%',
            maxWidth: '350px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            maxHeight: 'none',
            overflowY: 'visible'
          }}>
            <h3 style={{ marginTop: 0 }}>
              🚗 Drivecard Creator
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                placeholder="Enter drivecard title..."
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

            {/* Audio Recording Section */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                Audio {audioBlob && <span style={{color: 'green'}}>✅</span>}
              </label>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {/* Record Button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  style={{
                    backgroundColor: isRecording ? '#f44336' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    flex: 1,
                    opacity: isLoading ? 0.6 : 1
                  }}
                >
                  {isRecording ? `🔴 Stop (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')})` : '🎙️ Record'}
                </button>

                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isRecording}
                  style={{
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: (isLoading || isRecording) ? 'not-allowed' : 'pointer',
                    flex: 1,
                    opacity: (isLoading || isRecording) ? 0.6 : 1
                  }}
                >
                  📁 Upload
                </button>
              </div>

              {/* Audio Preview */}
              {audioBlob && (
                <div style={{
                  padding: '8px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  {audioSource === 'recording' ? 
                    `🎙️ Recorded audio (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')})` : 
                    `📁 ${audioFileName || 'Uploaded audio'}`
                  }
                </div>
              )}

              {/* Recording Error */}
              {recordingError && (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#ffebee',
                  border: '1px solid #ffcdd2',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#d32f2f',
                  marginTop: '8px'
                }}>
                  {recordingError}
                </div>
              )}
            </div>

            {/* Location Section */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                Location {selectedLocation && <span style={{color: 'green'}}>✅</span>}
              </label>
              
              <button
                onClick={handlePinPlacer}
                disabled={isLoading}
                style={{
                  backgroundColor: selectedLocation ? '#4CAF50' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {selectedLocation ? '📍 Location Set' : '📍 Set Location'}
              </button>

              {selectedLocation && (
                <div style={{
                  padding: '8px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '8px'
                }}>
                  📍 {selectedLocation.address || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                </div>
              )}
            </div>

            {/* Category Section */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                Category
              </label>
              
              <select
                value={drivecardCategory}
                onChange={(e) => setDrivecardCategory(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #333',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

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
          id="quickcard-intro-audio-input"
          type="file"
          accept="audio/*"
          onChange={(e) => handleQuickcardAudioUpload(e, 'intro')}
          style={{ display: 'none' }}
        />
        
        <input
          id="quickcard-detail-audio-input"
          type="file"
          accept="audio/*"
          onChange={(e) => handleQuickcardAudioUpload(e, 'detail')}
          style={{ display: 'none' }}
        />

        {/* Quickcard Loader Modal */}
        {showQuickcardLoader && (
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
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '70vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                  📂 Load Quickcard for Editing
                </h3>
                <button
                  onClick={() => setShowQuickcardLoader(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

                             {/* Debug Button */}
               <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                 <button
                   onClick={() => {
                     console.log('🔧 DEBUG: Checking savedVostcards for quickcards');
                     console.log('🔧 Total savedVostcards:', savedVostcards.length);
                     console.log('🔧 All savedVostcards:', savedVostcards.map(v => ({
                       id: v.id,
                       title: v.title || 'Untitled',
                       isQuickcard: v.isQuickcard,
                       state: v.state
                     })));
                     const quickcards = savedVostcards.filter(card => card.isQuickcard);
                     console.log('🔧 Filtered quickcards:', quickcards.length);
                     console.log('🔧 Quickcard details:', quickcards.map(q => ({
                       id: q.id,
                       title: q.title || 'Untitled',
                       isQuickcard: q.isQuickcard
                     })));
                   }}
                   style={{
                     backgroundColor: '#17a2b8',
                     color: 'white',
                     border: 'none',
                     borderRadius: '4px',
                     padding: '8px 16px',
                     fontSize: '12px',
                     cursor: 'pointer',
                     marginRight: '8px'
                   }}
                 >
                   🔧 Debug Quickcards
                 </button>
                 
                 <button
                   onClick={async () => {
                     console.log('🔄 Manually reloading quickcards...');
                     try {
                       await loadAllLocalVostcardsImmediate();
                       console.log('✅ Quickcards reloaded successfully');
                     } catch (error) {
                       console.error('❌ Failed to reload quickcards:', error);
                     }
                   }}
                   style={{
                     backgroundColor: '#28a745',
                     color: 'white',
                     border: 'none',
                     borderRadius: '4px',
                     padding: '8px 16px',
                     fontSize: '12px',
                     cursor: 'pointer'
                   }}
                 >
                   🔄 Reload Quickcards
                 </button>
               </div>

                             {/* Quickcard List */}
               <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                 {savedVostcards.filter(card => card.isQuickcard).length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                     <p>No quickcards found.</p>
                     <p style={{ fontSize: '14px' }}>Create a quickcard first, then you can load it for editing.</p>
                     <p style={{ fontSize: '12px', color: '#999', marginTop: '16px' }}>
                       Total saved cards: {savedVostcards.length}<br/>
                       Cards with isQuickcard=true: {savedVostcards.filter(card => card.isQuickcard === true).length}
                     </p>
                   </div>
                 ) : (
                   savedVostcards.filter(card => card.isQuickcard).map((quickcard) => (
                     <div
                       key={quickcard.id}
                       onClick={() => loadQuickcardForEditing(quickcard)}
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         padding: '12px',
                         border: '1px solid #ddd',
                         borderRadius: '8px',
                         marginBottom: '8px',
                         cursor: 'pointer',
                         backgroundColor: '#f9f9f9',
                         transition: 'background-color 0.2s'
                       }}
                       onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                     >
                       <div style={{ flex: 1 }}>
                         <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                           {quickcard.title || 'Untitled Quickcard'}
                         </div>
                         <div style={{ fontSize: '12px', color: '#666' }}>
                           {quickcard.description && quickcard.description.length > 50 
                             ? quickcard.description.substring(0, 50) + '...'
                             : quickcard.description || 'No description'
                           }
                         </div>
                         <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                           Created: {new Date(quickcard.createdAt).toLocaleDateString()}
                         </div>
                       </div>
                       <div style={{ marginLeft: '12px', color: '#28a745' }}>
                         <FaEdit size={16} />
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VostcardStudioView; 