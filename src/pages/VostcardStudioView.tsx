import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaList, FaMicrophone, FaStop, FaUpload, FaMapMarkerAlt, FaSave, FaCamera, FaGlobe, FaImages, FaEdit } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { drivecardService } from '../services/drivecardService';
import { VostcardImporter as LegacyVostcardImporter } from '../components/studio/LegacyVostcardImporter';
import { useVostcard } from '../context/VostcardContext';
import { useVostcardEdit } from '../context/VostcardEditContext';
import type { Drivecard, Vostcard } from '../types/VostcardTypes';
import MultiPhotoModal from '../components/MultiPhotoModal';
import PhotoOptionsModal from '../components/PhotoOptionsModal';
import PhotoUploadManager from '../components/PhotoUploadManager';
import AudioRecordingStudio from '../components/AudioRecordingStudio';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useAuth();
  const { startEditing } = useVostcardEdit();
  const { saveVostcard, saveVostcardDirect, setCurrentVostcard, postVostcard, clearVostcard, savedVostcards, currentVostcard, loadAllLocalVostcards } = useVostcard();
  
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
    'Park',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  
  const canAccessDrivecard = true; // All authenticated users can access drivecard functionality
  
  // Check if we're editing a drivecard from the library
  const editingDrivecardId = location.state?.editingDrivecard;
  
  // Switch to drivecard section if editing one
  const [activeSection, setActiveSection] = useState<'vostcard' | 'drivecard'>(
    editingDrivecardId && canAccessDrivecard ? 'drivecard' : 'vostcard'
  );

  // Vostcard import state
  const [showVostcardImporter, setShowVostcardImporter] = useState(false);
  const [showVostcardCreator, setShowVostcardCreator] = useState(false);
  const [showVostcardLoader, setShowVostcardLoader] = useState(false);
  
  // Vostcard creation state - ENHANCED FOR MULTIPLE PHOTOS
  const [vostcardTitle, setVostcardTitle] = useState('');
  const [vostcardDescription, setVostcardDescription] = useState('');
  const [vostcardPhotos, setVostcardPhotos] = useState<(Blob | File)[]>([]); // Array of photos
  const [vostcardPhotoPreviews, setVostcardPhotoPreviews] = useState<string[]>([]); // Array of previews
  const [vostcardLocation, setVostcardLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  // Single audio state (simplified from intro/detail)
  const [vostcardAudio, setVostcardAudio] = useState<Blob | null>(null);
  const [vostcardAudioSource, setVostcardAudioSource] = useState<'recording' | 'file' | null>(null);
  const [vostcardAudioFileName, setVostcardAudioFileName] = useState<string | null>(null);
  const [youtubeURL, setYoutubeURL] = useState<string>('');
  const [instagramURL, setInstagramURL] = useState<string>('');
  const [vostcardCategories, setVostcardCategories] = useState<string[]>([]);
  const [showVostcardCategoryModal, setShowVostcardCategoryModal] = useState(false);

  // Photo grid ref removed - now handled by PhotoUploadManager
  
  // Editing state for vostcards
  const [editingVostcardId, setEditingVostcardId] = useState<string | null>(null);
  const [originalVostcardState, setOriginalVostcardState] = useState<'private' | 'posted' | null>(null);
  const [originalVostcardData, setOriginalVostcardData] = useState<Vostcard | null>(null);

  // Editing state
  const [editingDrivecard, setEditingDrivecard] = useState<Drivecard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVostcards, setIsLoadingVostcards] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  // Drivecard creation state
  const [title, setTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [drivecardCategory, setDrivecardCategory] = useState('None');

  // Audio recording state - moved to AudioRecordingStudio component
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioSource, setAudioSource] = useState<'recording' | 'file' | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

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

  // Audio recording functions moved to AudioRecordingStudio component

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
        // Clear audio state
        setAudioBlob(null);
        setAudioSource(null);
        setAudioFileName(null);
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
      const vostcardLocation = sessionStorage.getItem('vostcardLocation');
      
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

      if (vostcardLocation) {
        try {
          const location = JSON.parse(vostcardLocation);
          setVostcardLocation(location);
          sessionStorage.removeItem('vostcardLocation');
          
          // ONLY restore vostcard creator state when coming back from pin placer
          // This ensures clean initialization when first opening studio
          const creatorState = sessionStorage.getItem('vostcardCreatorState');
          if (creatorState) {
            const state = JSON.parse(creatorState);
            
            // Only restore fields that have actual values
            if (state.title) setVostcardTitle(state.title);
            if (state.description) setVostcardDescription(state.description);
            if (state.categories && state.categories.length > 0) setVostcardCategories(state.categories);
            if (state.audioSource) setVostcardAudioSource(state.audioSource);
            if (state.audioFileName) setVostcardAudioFileName(state.audioFileName);
            
            // ✅ NEW: Restore photo from base64 (only if exists)
            if (state.photoBase64) {
              try {
                // Convert base64 back to File object
                const response = await fetch(state.photoBase64);
                const blob = await response.blob();
                const photoFile = new File([blob], 'vostcard-photo.jpg', { type: state.photoType || 'image/jpeg' });
                
                setVostcardPhotos([photoFile]);
                setVostcardPhotoPreviews([state.photoBase64]); // Use base64 as preview
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
                const audioFile = new File([blob], state.audioFileName || 'vostcard-audio.mp3', { type: state.audioType || 'audio/mpeg' });
                
                setVostcardAudio(audioFile);
                console.log('🎵 Audio restored from storage');
              } catch (error) {
                console.error('❌ Failed to restore audio from base64:', error);
              }
            }
            
            // Clear the creator state after restoration
            sessionStorage.removeItem('vostcardCreatorState');
            console.log('✅ Vostcard location set and state restored');
          } else {
            console.log('✅ Vostcard location set (no stored state to restore)');
          }
          
          setShowVostcardCreator(true);
        } catch (error) {
          console.error('Error parsing vostcard location:', error);
        }
      }
    };

    restoreState();
  }, []); // Only run once on mount

  // Ensure clean initialization when first opening studio (clear stale data)
  useEffect(() => {
    // Only clear if we're not restoring from pin placer or transfer
    const hasLocationToRestore = sessionStorage.getItem('vostcardLocation') || 
                                  sessionStorage.getItem('drivecardLocation');
    const hasTransferData = sessionStorage.getItem('vostcardTransferData');
    const isEditingExisting = editingVostcardId || editingDrivecardId;
    
    if (!hasLocationToRestore && !hasTransferData && !isEditingExisting) {
      // Clear any stale creator state to ensure clean start
      sessionStorage.removeItem('vostcardCreatorState');
      
      // Also clear form data if it's stale (not from current session)
      const hasStaleFormData = vostcardTitle.trim() || vostcardDescription.trim() || vostcardPhotos.length > 0;
      if (hasStaleFormData) {
        console.log('🧹 Clearing stale form data for fresh start');
        resetVostcardForm();
      }
      
      console.log('🧹 Cleared stale vostcard creator state for clean initialization');
    }
  }, []); // Only run once on mount

  // Separate useEffect for loading existing vostcard data - only runs once
  useEffect(() => {
    // Check for existing vostcard data from context or transfer (only on initial load)
    loadExistingVostcardData();
  }, []); // Only run once on mount

  // Cleanup on unmount
  // Stream cleanup moved to AudioRecordingStudio component

  // Auto-refresh vostcards when loader modal opens
  useEffect(() => {
    if (showVostcardLoader) {
      const refreshVostcards = async () => {
        console.log('📂 Vostcard loader opened - refreshing saved vostcards with full sync...');
        setIsLoadingVostcards(true);
        try {
          // Use full sync instead of immediate load to get Firebase data too
          await loadAllLocalVostcards();
          console.log('✅ Saved vostcards refreshed for vostcard loader (full sync)');
        } catch (error) {
          console.error('❌ Failed to refresh saved vostcards:', error);
        } finally {
          setIsLoadingVostcards(false);
        }
      };
      refreshVostcards();
    }
  }, [showVostcardLoader, loadAllLocalVostcards]);

  // Handle vostcard import
  const handleVostcardImport = (vostcard: Vostcard) => {
    startEditing(vostcard);
    setShowVostcardImporter(false);
    // Navigate to the advanced editor to continue editing
    navigate('/studio', { state: { editingVostcard: vostcard.id, activeTab: 'vostcard' } });
  };

  const handleCancelImport = () => {
    setShowVostcardImporter(false);
  };

  // Load vostcard data from currentVostcard context or sessionStorage
  const loadExistingVostcardData = () => {
    try {
      // Don't overwrite existing form data if user has already entered something
      const hasExistingData = vostcardTitle.trim() || vostcardDescription.trim() || vostcardPhotos.length > 0;
      if (hasExistingData) {
        console.log('📱 Skipping data load - form already has content');
        return;
      }
      
      // First try sessionStorage (from transfer button)
      const transferData = sessionStorage.getItem('vostcardTransferData');
      if (transferData) {
        const data = JSON.parse(transferData);
        console.log('📱 Loading transferred vostcard data:', data);
        
        // Populate VostcardStudio fields with transferred data
        setVostcardTitle(data.title || '');
        setVostcardDescription(data.description || '');
        setVostcardCategories(data.categories || []);
        
        // Handle photos
        if (data.photos && data.photos.length > 0) {
          setVostcardPhotos(data.photos);
          // Create preview URLs for the photos
          const previews = data.photos.map((photo: any) => {
            if (photo && (photo instanceof File || photo instanceof Blob)) {
              return URL.createObjectURL(photo);
            }
            return '';
          });
          setVostcardPhotoPreviews(previews);
        }
        
        // Handle location
        if (data.location) {
          setVostcardLocation({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            address: data.location.address
          });
        }
        
        // Show the vostcard creator
        setShowVostcardCreator(true);
        
        // Clear the transfer data
        sessionStorage.removeItem('vostcardTransferData');
        
        console.log('✅ Vostcard data transferred successfully');
        return;
      }
      
      // If no sessionStorage data, check currentVostcard context
      if (currentVostcard && vostcardTitle === '' && vostcardDescription === '') {
        console.log('📱 Loading vostcard data from context:', currentVostcard);
        
        // Populate fields from context
        setVostcardTitle(currentVostcard.title || '');
        setVostcardDescription(currentVostcard.description || '');
        setVostcardCategories(currentVostcard.categories || []);
        
        // Handle photos
        if (currentVostcard.photos && currentVostcard.photos.length > 0) {
          setVostcardPhotos(currentVostcard.photos);
          // Create preview URLs for the photos
          const previews = currentVostcard.photos.map((photo: any) => {
            if (photo && (photo instanceof File || photo instanceof Blob)) {
              return URL.createObjectURL(photo);
            }
            return '';
          });
          setVostcardPhotoPreviews(previews);
        }
        
        // Handle location
        if (currentVostcard.geo) {
          setVostcardLocation({
            latitude: currentVostcard.geo.latitude,
            longitude: currentVostcard.geo.longitude
          });
        }
        
        // Show the vostcard creator
        setShowVostcardCreator(true);
        
        console.log('✅ Vostcard data loaded from context');
      }
    } catch (error) {
      console.error('❌ Error loading vostcard data:', error);
    }
  };

  const handleCancelCreator = () => {
    setShowVostcardCreator(false);
    // Clear creation state and clean up blob URLs
    setVostcardTitle('');
    vostcardPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setVostcardPhotos([]);
    setVostcardPhotoPreviews([]);
    setVostcardLocation(null);
    setVostcardAudio(null);
    setVostcardAudioSource(null);
    setVostcardAudioFileName(null);
    setVostcardAudio(null);
    setVostcardAudioSource(null);
    setVostcardAudioFileName(null);
    setYoutubeURL('');
    setInstagramURL('');
    setVostcardCategories([]);
  };

  // Photo change handler for PhotoUploadManager
  const handlePhotosChange = (newPhotos: (Blob | File)[], newPreviews: string[]) => {
    setVostcardPhotos(newPhotos);
    setVostcardPhotoPreviews(newPreviews);
  };

  // Audio change handler for AudioRecordingStudio (Drivecard)
  const handleDrivecardAudioChange = (audioBlob: Blob | null, audioSource: 'recording' | 'file' | null, audioFileName: string | null) => {
    setAudioBlob(audioBlob);
    setAudioSource(audioSource);
    setAudioFileName(audioFileName);
  };

  // Audio change handler for AudioRecordingStudio (Vostcard)
  const handleVostcardAudioChange = (audioBlob: Blob | null, audioSource: 'recording' | 'file' | null, audioFileName: string | null) => {
    setVostcardAudio(audioBlob);
    setVostcardAudioSource(audioSource);
    setVostcardAudioFileName(audioFileName);
  };

  // Enhanced photo upload handler for multiple photos (unlimited) - kept for legacy inputs
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select valid image files.');
      return;
    }

    // Add new photos and previews
    const newPhotos = [...vostcardPhotos, ...imageFiles];
    const newPreviews = [...vostcardPhotoPreviews];
    
    imageFiles.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push(previewUrl);
    });

    setVostcardPhotos(newPhotos);
    setVostcardPhotoPreviews(newPreviews);
    
    console.log(`📸 Added ${imageFiles.length} photos. Total: ${newPhotos.length}`);
  };

  // Photo removal function moved to PhotoUploadManager component

  // Drag and drop handlers moved to PhotoUploadManager component

  // Touch event handlers and useEffect moved to PhotoUploadManager component

  const handleVostcardAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, audioType: 'intro' | 'detail') => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      if (audioType === 'intro') {
        setVostcardAudio(file);
        setVostcardAudioSource('file');
        setVostcardAudioFileName(file.name);
      } else if (audioType === 'detail') {
        setVostcardAudio(file);
        setVostcardAudioSource('file');
        setVostcardAudioFileName(file.name);
      }
    }
  };

  const handleVostcardCategoryToggle = (category: string) => {
    if (vostcardCategories.includes(category)) {
      setVostcardCategories(prev => prev.filter(c => c !== category));
    } else {
      setVostcardCategories(prev => [...prev, category]);
    }
  };

  // YouTube URL validation and processing
  const validateAndProcessYouTubeURL = (url: string): string | null => {
    if (!url.trim()) return null;
    
    // YouTube URL patterns (including Shorts)
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1]; // Return the video ID
      }
    }
    
    return null;
  };

  const handleYouTubeURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeURL(e.target.value);
  };

  // Instagram URL validation and processing
  const validateAndProcessInstagramURL = (url: string): string | null => {
    if (!url.trim()) return null;
    
    // Instagram URL patterns
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/tv\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1]; // Return the post ID
      }
    }
    
    return null;
  };

  const handleInstagramURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstagramURL(e.target.value);
  };

  const handleVostcardPinPlacer = async () => {
    console.log('🗺️ Pin placer button clicked!'); // Debug log
    
    // ✅ SAVE CURRENT VOSTCARD STATE BEFORE NAVIGATING
    const stateToSave: any = {
      title: vostcardTitle,
      description: vostcardDescription,
      categories: vostcardCategories,
      audioSource: vostcardAudioSource,
      audioFileName: vostcardAudioFileName,
    };

    // Convert photos to base64 for storage
    if (vostcardPhotos.length > 0) {
      try {
        const photoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(vostcardPhotos[0]);
        });
        stateToSave.photoBase64 = photoBase64;
        stateToSave.photoType = vostcardPhotos[0].type;
      } catch (error) {
        console.error('❌ Failed to convert photo to base64:', error);
      }
    }

    // Convert audio to base64 for storage
    if (vostcardAudio) {
      try {
        const audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(vostcardAudio);
        });
        stateToSave.audioBase64 = audioBase64;
        stateToSave.audioType = vostcardAudio.type;
      } catch (error) {
        console.error('❌ Failed to convert audio to base64:', error);
      }
    }

    // Store the state
    sessionStorage.setItem('vostcardCreatorState', JSON.stringify(stateToSave));
    
    // Navigate to pin placer with required pinData
    navigate('/pin-placer', {
      state: {
        returnTo: '/studio',
        vostcardCreation: true,
        title: vostcardTitle || 'New Vostcard',
        pinData: {
          id: 'temp_vostcard',
          title: vostcardTitle || 'New Vostcard',
          description: 'Vostcard location',
          latitude: vostcardLocation?.latitude || 40.7128,
          longitude: vostcardLocation?.longitude || -74.0060,
          isOffer: false
        }
      }
    });
  };

  // Update creation functions to use multiple photos
  const handleSaveVostcardToPersonalPosts = async () => {
    if (!vostcardTitle.trim()) {
      alert('Please enter a title for your vostcard.');
      return;
    }

    if (vostcardPhotos.length === 0) {
      alert('Please add at least one photo for your vostcard.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare audio files and labels
      const audioFiles: Blob[] = [];
      const audioLabels: string[] = [];
      
      if (vostcardAudio) {
        audioFiles.push(vostcardAudio);
        audioLabels.push('audio');
      }

      
      // Process YouTube and Instagram URLs
      const processedYouTubeID = validateAndProcessYouTubeURL(youtubeURL);
      const processedInstagramID = validateAndProcessInstagramURL(instagramURL);
      
      console.log('🔍 YouTube URL Processing Debug:', {
        originalYouTubeURL: youtubeURL,
        processedYouTubeID: processedYouTubeID,
        originalInstagramURL: instagramURL,
        processedInstagramID: processedInstagramID
      });
      
      // Create vostcard as private draft with multiple photos and audio files
      const vostcard: Vostcard = {
        id: uuidv4(), // Use Firebase-compatible UUID instead of timestamp
        title: vostcardTitle.trim(),
        description: vostcardDescription.trim() || '', 
        photos: vostcardPhotos, // Multiple photos
        audio: vostcardAudio, // LEGACY: Keep for backward compatibility
        audioFiles: audioFiles, // NEW: Multiple audio files
        audioLabels: audioLabels, // NEW: Labels for multiple audio files
        categories: vostcardCategories,
        geo: vostcardLocation,
        youtubeURL: processedYouTubeID,
        instagramURL: processedInstagramID,
        username: user?.displayName || user?.email || 'Unknown User',
        userID: user?.uid || '',
        userRole: userRole || 'user',
        state: 'private',
        visibility: 'private',
        type: 'vostcard',
        video: null,
        hasVideo: false,
        hasPhotos: vostcardPhotos.length > 0,
        hasAudio: !!(vostcardAudio),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('🔍 Final Vostcard Object Debug (Personal Posts):', {
        id: vostcard.id,
        youtubeURL: vostcard.youtubeURL,
        instagramURL: vostcard.instagramURL,
        hasYouTubeURL: !!vostcard.youtubeURL,
        hasInstagramURL: !!vostcard.instagramURL
      });

      setCurrentVostcard(vostcard);
      await saveVostcard();
      
      alert(`✅ Vostcard saved to Personal Posts with ${vostcardPhotos.length} photo(s)!`);
      resetVostcardForm();
      
    } catch (error) {
      console.error('❌ Error saving vostcard draft:', error);
      alert('Failed to save vostcard to Personal Posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostVostcardToMap = async () => {
    if (!vostcardTitle.trim()) {
      alert('Please enter a title for your vostcard.');
      return;
    }

    if (vostcardPhotos.length === 0) {
      alert('Please add at least one photo for your vostcard.');
      return;
    }

    if (!vostcardLocation) {
      alert('Please set a location for your vostcard.');
      return;
    }

    if (vostcardCategories.length === 0) {
      alert('Please select at least one category for your vostcard.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare audio files and labels
      const audioFiles: Blob[] = [];
      const audioLabels: string[] = [];
      
      if (vostcardAudio) {
        audioFiles.push(vostcardAudio);
        audioLabels.push('audio');
      }

      
      // Process YouTube and Instagram URLs
      const processedYouTubeID = validateAndProcessYouTubeURL(youtubeURL);
      const processedInstagramID = validateAndProcessInstagramURL(instagramURL);
      
      // Create vostcard ready for posting with multiple photos
      const vostcard: Vostcard = {
        id: uuidv4(), // Use Firebase-compatible UUID instead of timestamp
        title: vostcardTitle.trim(),
        description: vostcardDescription.trim() || 'Vostcard',
        photos: vostcardPhotos, // Multiple photos
        audio: vostcardAudio, // Use intro audio as primary
        audioFiles: audioFiles, // NEW: Multiple audio files
        audioLabels: audioLabels, // NEW: Labels for multiple audio files
        categories: vostcardCategories,
        geo: vostcardLocation,
        youtubeURL: processedYouTubeID,
        instagramURL: processedInstagramID,
        username: user?.displayName || user?.email || 'Unknown User',
        userID: user?.uid || '',
        userRole: userRole || 'user',
        state: 'private',
        video: null,

        hasVideo: false,
        hasPhotos: vostcardPhotos.length > 0,
        hasAudio: !!(vostcardAudio),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('🔍 Final Vostcard Object Debug (Post Vostcard):', {
        id: vostcard.id,
        youtubeURL: vostcard.youtubeURL,
        instagramURL: vostcard.instagramURL,
        hasYouTubeURL: !!vostcard.youtubeURL,
        hasInstagramURL: !!vostcard.instagramURL
      });

      setCurrentVostcard(vostcard);
      await new Promise(resolve => setTimeout(resolve, 100));
      setCurrentVostcard(vostcard);
      await postVostcard();
      
      // Clear any remaining sessionStorage state to ensure clean initialization next time
      sessionStorage.removeItem('vostcardCreatorState');
      sessionStorage.removeItem('vostcardTransferData');
      
      resetVostcardForm();
      alert(`🎉 Vostcard posted to map with ${vostcardPhotos.length} photo(s)! Form cleared for your next vostcard.`);
      
    } catch (error) {
      console.error('❌ Error posting vostcard:', error);
      alert('Failed to post vostcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update and repost existing vostcard
  const handleUpdateAndRepostVostcard = async () => {
    if (!editingVostcardId) {
      alert('No vostcard is being edited.');
      return;
    }

    if (!vostcardTitle.trim()) {
      alert('Please enter a title for your vostcard.');
      return;
    }

    if (vostcardPhotos.length === 0) {
      alert('Please add at least one photo for your vostcard.');
      return;
    }

    if (!vostcardLocation) {
      alert('Please set a location for your vostcard.');
      return;
    }

    if (vostcardCategories.length === 0) {
      alert('Please select at least one category for your vostcard.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare audio files and labels - preserve existing audio if no new audio provided
      const audioFiles: Blob[] = [];
      const audioLabels: string[] = [];
      
      // Use new audio if provided, otherwise preserve original audio
      if (vostcardAudio) {
        audioFiles.push(vostcardAudio);
        audioLabels.push('audio');
      } else if (originalVostcardData?.audioFiles?.[0]) {
        // Preserve original intro audio from audioFiles
        audioFiles.push(originalVostcardData.audioFiles[0]);
        audioLabels.push(originalVostcardData.audioLabels?.[0] || 'intro');
      } else if (originalVostcardData?.audio) {
        // Preserve legacy audio format
        audioFiles.push(originalVostcardData.audio);
        audioLabels.push('audio');
      } else if (originalVostcardData?.audioURL || originalVostcardData?.audioURLs?.[0] || originalVostcardData?._firebaseAudioURL) {
        // Preserve audio from Firebase URLs by fetching and converting to blob
        const audioURL = originalVostcardData.audioURL || originalVostcardData.audioURLs?.[0] || originalVostcardData._firebaseAudioURL;
        try {
          const response = await fetch(audioURL);
          const blob = await response.blob();
          audioFiles.push(blob);
          audioLabels.push('audio');
        } catch (error) {
          console.error('Failed to preserve audio from URL:', error);
        }
      }
      
      // Process YouTube and Instagram URLs
      const processedYouTubeID = validateAndProcessYouTubeURL(youtubeURL);
      const processedInstagramID = validateAndProcessInstagramURL(instagramURL);
      
      console.log('🔍 YouTube URL Processing Debug (Update):', {
        originalYouTubeURL: youtubeURL,
        processedYouTubeID: processedYouTubeID,
        originalInstagramURL: instagramURL,
        processedInstagramID: processedInstagramID
      });
      
      // Debug audio data before creating updated vostcard
      console.log('🎵 Audio data before creating updatedVostcard:', {
        audioFilesLength: audioFiles.length,
        audioLabelsLength: audioLabels.length,
        hasAudio: !!vostcardAudio,
        audioFiles: audioFiles.map((file, i) => ({ index: i, size: file.size, type: file.type })),
        audioLabels: audioLabels
      });

      // Update the existing vostcard with same ID and preserve original state
      const updatedVostcard: Vostcard = {
        id: editingVostcardId, // Keep the same ID
        title: vostcardTitle.trim(),
        description: vostcardDescription.trim() || 'Vostcard',
        photos: vostcardPhotos,
        audio: audioFiles[0] || null, // Use first audio file for legacy compatibility
        audioFiles: audioFiles,
        audioLabels: audioLabels,
        categories: vostcardCategories,
        geo: vostcardLocation,
        youtubeURL: processedYouTubeID,
        instagramURL: processedInstagramID,
        username: originalVostcardData?.username || user?.displayName || user?.email || 'Unknown User', // Preserve original username
        userID: user?.uid || '',
        userRole: userRole || 'user',
        state: originalVostcardState || 'private', // Preserve original state
        video: null,
        // Preserve existing Firebase URLs for audio preservation
        _firebaseAudioURLs: originalVostcardData?._firebaseAudioURLs || originalVostcardData?.audioURLs || (originalVostcardData?.audioURL ? [originalVostcardData.audioURL] : undefined),
        _firebasePhotoURLs: originalVostcardData?._firebasePhotoURLs || originalVostcardData?.photoURLs,
        hasVideo: false,
        hasPhotos: vostcardPhotos.length > 0,
        hasAudio: audioFiles.length > 0 || !!(originalVostcardData?._firebaseAudioURLs?.length || originalVostcardData?.audioURLs?.length || originalVostcardData?.audioURL), // Check if any audio files exist (new or preserved)
        createdAt: new Date().toISOString(), // This will be preserved from original
        updatedAt: new Date().toISOString()
      };

      console.log('🎵 Created updatedVostcard with audio:', {
        hasAudio: updatedVostcard.hasAudio,
        audioFilesLength: updatedVostcard.audioFiles?.length || 0,
        hasLegacyAudio: !!updatedVostcard.audio
      });

      console.log('🔍 Final Vostcard Object Debug (Update):', {
        id: updatedVostcard.id,
        youtubeURL: updatedVostcard.youtubeURL,
        instagramURL: updatedVostcard.instagramURL,
        hasYouTubeURL: !!updatedVostcard.youtubeURL,
        hasInstagramURL: !!updatedVostcard.instagramURL
      });

      // Set the current vostcard for context consistency
      setCurrentVostcard(updatedVostcard);
      
      // Only post to public if the original was already posted, otherwise just save
      if (originalVostcardState === 'posted') {
        console.log('🔄 Updating already posted vostcard - keeping it public');
        // Pass the vostcard directly to avoid state timing issues
        await postVostcard(updatedVostcard);
      } else {
        console.log('🔄 Updating private vostcard - keeping it private');
        await saveVostcardDirect(updatedVostcard);
        
        // Force refresh the vostcard data to ensure YouTube URL is available immediately
        console.log('🔄 Forcing vostcard refresh after YouTube URL update...');
        await loadAllLocalVostcards();
      }
      
      // Clear any remaining sessionStorage state to ensure clean initialization next time
      sessionStorage.removeItem('vostcardCreatorState');
      sessionStorage.removeItem('vostcardTransferData');
      
      resetVostcardForm();
      
      // Show appropriate success message based on what happened
      if (originalVostcardState === 'posted') {
        alert(`🎉 Public vostcard updated with ${vostcardPhotos.length} photo(s)! Changes are live on the map.`);
      } else {
        alert(`🎉 Personal vostcard updated with ${vostcardPhotos.length} photo(s)! Kept private as requested.`);
      }
      
      navigate('/home', { 
        state: { 
          freshLoad: true,
          timestamp: Date.now(),
          justPosted: 'vostcard'
        }
      });
      
    } catch (error) {
      console.error('❌ Error updating vostcard:', error);
      alert('Failed to update vostcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to reset form - UPDATED for multiple photos and single audio
  const resetVostcardForm = () => {
    setVostcardTitle('');
    setVostcardDescription('');
    
    // Clean up photo blob URLs
    vostcardPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setVostcardPhotos([]);
    setVostcardPhotoPreviews([]);
    
    setVostcardAudio(null);
    setVostcardAudioSource(null);
    setVostcardAudioFileName(null);
    setYoutubeURL('');
    setInstagramURL('');
    setVostcardLocation(null);
    setVostcardCategories([]);
    
    // Clear editing state
    setEditingVostcardId(null);
    setOriginalVostcardState(null);
    setOriginalVostcardData(null);
  };

  // Function to load a vostcard for editing
  const loadVostcardForEditing = async (vostcard: Vostcard) => {
    console.log('🔄 Loading vostcard for editing:', vostcard);
    
    try {
      setIsLoading(true);
      setLoadingCardId(vostcard.id); // Set specific card as loading
      
      // Use the VostcardEdit context to start editing
      startEditing(vostcard);
      
      // IMPORTANT: Also set in main VostcardContext for saving
      setCurrentVostcard(vostcard);
      
      // Store the original state to preserve it during updates
      setOriginalVostcardState(vostcard.state || 'private');
      console.log('📝 Original vostcard state:', vostcard.state || 'private');
      
      // Populate VostcardStudio form fields
      setVostcardTitle(vostcard.title || '');
      setVostcardDescription(vostcard.description || '');
      setVostcardCategories(vostcard.categories || []);
      
      // Load location
      if (vostcard.geo) {
        setVostcardLocation({
          latitude: vostcard.geo.latitude,
          longitude: vostcard.geo.longitude,
          address: (vostcard.geo as any).address
        });
      }
      
      // Load YouTube and Instagram URLs
      setYoutubeURL(vostcard.youtubeURL || '');
      setInstagramURL(vostcard.instagramURL || '');
      
      // Load photos if available
      if (vostcard.photos && vostcard.photos.length > 0) {
        setVostcardPhotos(vostcard.photos);
        // Create preview URLs for photos
        const previews = vostcard.photos.map(photo => URL.createObjectURL(photo));
        setVostcardPhotoPreviews(previews);
      } else if (vostcard._firebasePhotoURLs && vostcard._firebasePhotoURLs.length > 0) {
        // Load photos from Firebase URLs
        const photoBlobs: Blob[] = [];
        const photoPreviews: string[] = [];
        for (const photoUrl of vostcard._firebasePhotoURLs) {
          try {
            const response = await fetch(photoUrl);
            const blob = await response.blob();
            photoBlobs.push(blob);
            photoPreviews.push(URL.createObjectURL(blob));
          } catch (error) {
            console.error('Failed to load photo:', photoUrl, error);
          }
        }
        setVostcardPhotos(photoBlobs);
        setVostcardPhotoPreviews(photoPreviews);
      }
      
      // Load audio files if available (simplified to single audio)
      if (vostcard.audioFiles && vostcard.audioFiles.length > 0) {
        // Load first audio file only (simplified from intro/detail)
        if (vostcard.audioFiles[0]) {
          setVostcardAudio(vostcard.audioFiles[0]);
          setVostcardAudioSource('file');
          const audioLabel = vostcard.audioLabels && vostcard.audioLabels[0] ? vostcard.audioLabels[0] : 'Audio';
          setVostcardAudioFileName(audioLabel);
        }
      } else {
        // Load audio from Firebase URLs - check all possible audio fields
        const audioURL = vostcard.audioURL || vostcard.audioURLs?.[0] || vostcard._firebaseAudioURL || vostcard._firebaseAudioURLs?.[0];
        
        if (audioURL) {
          try {
            const response = await fetch(audioURL);
            const blob = await response.blob();
            setVostcardAudio(blob);
            setVostcardAudioSource('file');
            setVostcardAudioFileName('loaded_audio.mp3');
          } catch (error) {
            console.error('Failed to load audio:', error);
          }
        }
      }
      
      // Set editing state
      setEditingVostcardId(vostcard.id);
      setOriginalVostcardData(vostcard); // Store original data for audio preservation
      
      // Close the Load Vostcard modal
      setShowVostcardLoader(false);
      
      // Previously showed an alert on load; switched to silent log to avoid interrupting the flow
      console.log(`✅ Vostcard "${vostcard.title}" loaded for editing`);
      
    } catch (error) {
      console.error('Error loading vostcard:', error);
      alert('❌ Failed to load vostcard. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingCardId(null); // Clear loading state
    }
  };

  const handleTakePhoto = () => {
    document.getElementById('quickcard-camera-input')?.click();
  };

  const handleSelectFromGallery = () => {
    document.getElementById('quickcard-gallery-input')?.click();
  };

  // Handle different photo input methods
  const handleTakePhotoOption = () => {
    setShowPhotoOptionsModal(false);
    // On mobile, use camera input. On desktop, fallback to file input
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      document.getElementById('quickcard-camera-input')?.click();
    } else {
      // On desktop, camera access can be problematic, so use file input instead
      document.getElementById('quickcard-file-input')?.click();
    }
  };

  const handleUploadFileOption = () => {
    setShowPhotoOptionsModal(false);
    document.getElementById('quickcard-file-input')?.click();
  };

  const handleSelectFromLibraryOption = () => {
    setShowPhotoOptionsModal(false);
    
    // On desktop (Mac/Windows), there's no real distinction between file system and photo library
    // Both open the same file picker dialog, so we'll use the file input for consistency
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, try to access native photo library
      document.getElementById('quickcard-gallery-input')?.click();
    } else {
      // On desktop (Mac/Windows), use the regular file input since there's no photo library distinction
      document.getElementById('quickcard-file-input')?.click();
    }
  };

  return (
    <div style={{
      height: '100%',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      
      {/* Standard Banner */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
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
      {/* Audio file input moved to AudioRecordingStudio component */}

      {/* Content - Adjusted for fixed header */}
      <div style={{ 
        flex: 1,
        padding: '20px',
        paddingTop: '20px', // Reduced padding since header is not fixed
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        height: 'calc(100% - 80px)' // Account for header height
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
            💾 This vostcard is being saved and will be available shortly...
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
            onClick={() => setActiveSection('vostcard')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSection === 'vostcard' ? '#134369' : 'transparent',
              color: activeSection === 'vostcard' ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📝 Vōstcard
          </button>

          {canAccessDrivecard && (
            <button
              onClick={() => setActiveSection('drivecard')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeSection === 'drivecard' ? '#134369' : 'transparent',
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

        {/* Vostcard Section */}
        {activeSection === 'vostcard' && (
          <div style={{
            borderRadius: '8px',
            padding: '15px',
            width: '100%',
            maxWidth: '350px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            maxHeight: 'calc(100vh - 200px)', // ✅ Set reasonable max height
            overflowY: 'auto', // ✅ Enable internal scrolling
            overflowX: 'hidden' // ✅ Prevent horizontal scrolling
          }}>
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '8px' }}>
                📷 Vostcard Creator
              </h3>
              {editingVostcardId && (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ffeaa7', 
                  borderRadius: '4px', 
                  padding: '8px 12px', 
                  fontSize: '13px', 
                  color: '#856404',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <FaEdit size={12} />
                  <strong>Editing Mode:</strong> Use "Update & Repost" to avoid creating duplicates
                </div>
              )}
            </div>

            {/* Load Card Button */}
            <div style={{ marginBottom: '15px' }}>
              <button
                onClick={async () => {
                  console.log('📂 Opening vostcard loader - refreshing saved vostcards with full sync...');
                  try {
                    // Use full sync to get both IndexedDB and Firebase data
                    await loadAllLocalVostcards();
                    console.log('✅ Vostcards refreshed with full sync, opening loader modal');
                  } catch (error) {
                    console.error('❌ Failed to refresh vostcards:', error);
                  }
                  setShowVostcardLoader(true);
                }}
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
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaEdit size={14} />
                📂 Load Card
              </button>
            </div>

            {/* Clear Form Button - Always visible */}
            <div style={{ marginBottom: '15px' }}>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear the entire form? All current data will be lost.')) {
                    resetVostcardForm();
                  }
                }}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                🗑️ Clear Entire Form
              </button>
            </div>

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
                value={vostcardTitle}
                onChange={(e) => setVostcardTitle(e.target.value)}
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
                value={vostcardDescription}
                onChange={(e) => setVostcardDescription(e.target.value)}
                disabled={isLoading}
                placeholder="Add a description for your vostcard..."
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

            {/* Photo Upload Manager */}
            <PhotoUploadManager
              photos={vostcardPhotos}
              photoPreviews={vostcardPhotoPreviews}
              onPhotosChange={handlePhotosChange}
              maxPhotos={4}
              disabled={isLoading}
              showPhotoOptionsModal={() => setShowPhotoOptionsModal(true)}
            />

            {/* New Card Button (only when editing) */}
            {editingVostcardId && (
              <div style={{ marginBottom: '15px' }}>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to start a new vostcard? Current changes will be lost.')) {
                      resetVostcardForm();
                    }
                  }}
                  disabled={isLoading}
                  style={{
                    backgroundColor: isLoading ? '#ccc' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <FaEdit size={14} />
                  🆕 New Card
                </button>
              </div>
            )}

            {/* Set Location and Audio Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px',
              marginTop: '5px'
            }}>
              <button 
                onClick={handleVostcardPinPlacer}
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
                🎵 Audio
              </button>
            </div>

            {/* YouTube URL Input and Instagram URL Input */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                  📺 Add YouTube
                </label>
                <input
                  type="text"
                  value={youtubeURL}
                  onChange={handleYouTubeURLChange}
                  placeholder="Paste YouTube URL here..."
                  disabled={isLoading}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: isLoading ? '#f5f5f5' : 'white',
                    color: isLoading ? '#999' : '#333'
                  }}
                />
                {youtubeURL && validateAndProcessYouTubeURL(youtubeURL) && (
                  <div style={{
                    fontSize: '11px',
                    color: '#4CAF50',
                    fontWeight: 'bold'
                  }}>
                    ✅ Valid YouTube URL
                  </div>
                )}
                {youtubeURL && !validateAndProcessYouTubeURL(youtubeURL) && (
                  <div style={{
                    fontSize: '11px',
                    color: '#f44336',
                    fontWeight: 'bold'
                  }}>
                    ❌ Invalid YouTube URL
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                  📷 Add Instagram
                </label>
                <input
                  type="text"
                  value={instagramURL}
                  onChange={handleInstagramURLChange}
                  placeholder="Paste Instagram URL here..."
                  disabled={isLoading}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: isLoading ? '#f5f5f5' : 'white',
                    color: isLoading ? '#999' : '#333'
                  }}
                />
                {instagramURL && validateAndProcessInstagramURL(instagramURL) && (
                  <div style={{
                    fontSize: '11px',
                    color: '#4CAF50',
                    fontWeight: 'bold'
                  }}>
                    ✅ Valid Instagram URL
                  </div>
                )}
                {instagramURL && !validateAndProcessInstagramURL(instagramURL) && (
                  <div style={{
                    fontSize: '11px',
                    color: '#f44336',
                    fontWeight: 'bold'
                  }}>
                    ❌ Invalid Instagram URL
                  </div>
                )}
              </div>
            </div>

            {/* Audio Status Display */}
            {(vostcardAudio) && (
              <div style={{ marginBottom: '15px' }}>
                {vostcardAudio && (
                  <div style={{
                    backgroundColor: '#f3e5f5',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #9c27b0',
                    fontSize: '14px',
                    color: '#6a1b9a',
                    marginBottom: '8px'
                  }}>
                    🎵 Audio: {vostcardAudioFileName || 'Audio file ready'}
                    <button
                      onClick={() => {
                        setVostcardAudio(null);
                        setVostcardAudioSource(null);
                        setVostcardAudioFileName(null);
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
                Categories {vostcardCategories.length > 0 && <span style={{color: 'green'}}>✅</span>}
              </label>
              
              <div
                onClick={isLoading ? undefined : () => setShowVostcardCategoryModal(true)}
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: vostcardCategories.length > 0 ? '#333' : '#999',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {vostcardCategories.length > 0 ? 
                  `${vostcardCategories.length} categor${vostcardCategories.length === 1 ? 'y' : 'ies'} selected` : 
                  'Select Categories (Required)'
                }
              </div>

              {/* Display Selected Categories */}
              {vostcardCategories.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {vostcardCategories.map((category, index) => (
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
            {(vostcardAudio) && (
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

            {/* ✅ Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              {/* Save to Personal Posts Button */}
              <button 
                onClick={handleSaveVostcardToPersonalPosts}
                disabled={!vostcardTitle.trim() || isLoading || vostcardPhotos.length === 0}
                style={{
                  backgroundColor: (!vostcardTitle.trim() || isLoading || vostcardPhotos.length === 0) ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: (!vostcardTitle.trim() || isLoading || vostcardPhotos.length === 0) ? 'not-allowed' : 'pointer',
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

              {/* Post to Map Button - Always visible */}
              <button 
                onClick={handlePostVostcardToMap}
                disabled={!vostcardTitle.trim() || !vostcardLocation || isLoading || vostcardPhotos.length === 0 || vostcardCategories.length === 0}
                style={{
                  backgroundColor: (!vostcardTitle.trim() || !vostcardLocation || isLoading || vostcardPhotos.length === 0 || vostcardCategories.length === 0) ? '#ccc' : '#007aff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: (!vostcardTitle.trim() || !vostcardLocation || isLoading || vostcardPhotos.length === 0 || vostcardCategories.length === 0) ? 'not-allowed' : 'pointer',
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

              {/* Update Button - Only visible when editing */}
              {editingVostcardId && (
                <button 
                  onClick={handleUpdateAndRepostVostcard}
                  disabled={!vostcardTitle.trim() || !vostcardLocation || isLoading || vostcardPhotos.length === 0 || vostcardCategories.length === 0}
                  style={{
                    backgroundColor: (!vostcardTitle.trim() || !vostcardLocation || isLoading || vostcardPhotos.length === 0 || vostcardCategories.length === 0) ? '#ccc' : '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '12px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: (!vostcardTitle.trim() || !vostcardLocation || isLoading || vostcardPhotos.length === 0 || vostcardCategories.length === 0) ? 'not-allowed' : 'pointer',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <FaEdit size={12} />
                  Update
                </button>
              )}
            </div>



            {/* Clear Photo Button */}
            {vostcardPhotos.length > 0 && (
              <button
                onClick={() => {
                  vostcardPhotos.forEach(photo => URL.revokeObjectURL(URL.createObjectURL(photo)));
                  setVostcardPhotos([]);
                  setVostcardPhotoPreviews([]);
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
            {(vostcardAudio) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {vostcardAudio && (
                  <button
                    onClick={() => {
                      setVostcardAudio(null);
                      setVostcardAudioSource(null);
                      setVostcardAudioFileName(null);
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
                    ✕ Remove Audio
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

            {/* Audio Recording Studio */}
            <AudioRecordingStudio
              audioBlob={audioBlob}
              audioSource={audioSource}
              audioFileName={audioFileName}
              onAudioChange={handleDrivecardAudioChange}
              disabled={isLoading}
              required={!editingDrivecard}
              label="Audio"
            />

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
              disabled={!title.trim() || !selectedLocation || isLoading || (!editingDrivecard && !audioBlob)}
              style={{
                backgroundColor: (!title.trim() || !selectedLocation || isLoading || (!editingDrivecard && !audioBlob)) ? '#ccc' : '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (!title.trim() || !selectedLocation || isLoading || (!editingDrivecard && !audioBlob)) ? 'not-allowed' : 'pointer',
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

            {/* Clear Audio Button moved to AudioRecordingStudio component */}
          </div>
        )}

        {/* Category Selection Modal */}
        {showVostcardCategoryModal && (
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
                  onClick={() => handleVostcardCategoryToggle(category)}
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
                    checked={vostcardCategories.includes(category)}
                    readOnly
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px' }}>{category}</span>
                </div>
              ))}
              
              <button
                onClick={() => setShowVostcardCategoryModal(false)}
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
          onTakePhoto={handleTakePhotoOption}
          onUploadFile={handleUploadFileOption}
          onSelectFromLibrary={handleSelectFromLibraryOption}
          title="Add Photos to Vostcard"
          isMobile={/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)}
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
          id="quickcard-file-input"
          type="file"
          accept="image/*"
          multiple // 📁 Opens FILE SYSTEM dialog with multi-select
          onChange={handlePhotoUpload}
          style={{ display: 'none' }}
        />
        
        <input
          id="quickcard-intro-audio-input"
          type="file"
          accept="audio/*"
          onChange={(e) => handleVostcardAudioUpload(e, 'intro')}
          style={{ display: 'none' }}
        />
        


        {/* Vostcard Loader Modal */}
        {showVostcardLoader && (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                    📂 Load Vostcard for Editing
                  </h3>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    🔒 Private cards • 🌐 Public cards • Total: {savedVostcards.length}
                  </div>
                </div>
                <button
                  onClick={() => setShowVostcardLoader(false)}
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



                             {/* Vostcard List */}
               <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                 {isLoadingVostcards ? (
                   <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                     <div style={{ fontSize: '16px', marginBottom: '8px' }}>🔄 Loading vostcards...</div>
                     <div style={{ fontSize: '12px', color: '#999' }}>Refreshing saved vostcards from storage</div>
                   </div>
                 ) : savedVostcards.length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                     <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                     <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>No vostcards found</p>
                     <p style={{ fontSize: '14px', marginBottom: '16px' }}>Create a vostcard first, then you can load it for editing.</p>
                     <div style={{ fontSize: '12px', color: '#999', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                       <div>This loads both:</div>
                       <div>🔒 <strong>Private cards</strong> - Your drafts and unpublished cards</div>
                       <div>🌐 <strong>Public cards</strong> - Your published cards that you can re-edit</div>
                     </div>
                   </div>
                 ) : (
                   savedVostcards.map((vostcard) => {
                     const isPublic = vostcard.visibility === 'public';
                     const isPosted = vostcard.state === 'posted';
                     
                     return (
                       <div
                         key={vostcard.id}
                         onClick={() => !isLoadingVostcards && !loadingCardId && loadVostcardForEditing(vostcard)}
                         style={{
                           display: 'flex',
                           alignItems: 'center',
                           padding: '12px',
                           border: isPublic ? '2px solid #007aff' : '1px solid #ddd',
                           borderRadius: '8px',
                           marginBottom: '8px',
                           cursor: (isLoadingVostcards || loadingCardId) ? 'not-allowed' : 'pointer',
                           backgroundColor: (isLoadingVostcards || loadingCardId === vostcard.id) ? '#f5f5f5' : (isPublic ? '#f0f8ff' : '#f9f9f9'),
                           transition: 'background-color 0.2s',
                           opacity: (isLoadingVostcards || loadingCardId === vostcard.id) ? 0.6 : 1,
                           position: 'relative'
                         }}
                         onMouseEnter={(e) => !(isLoadingVostcards || loadingCardId) && (e.currentTarget.style.backgroundColor = isPublic ? '#e6f3ff' : '#f0f0f0')}
                         onMouseLeave={(e) => !(isLoadingVostcards || loadingCardId) && (e.currentTarget.style.backgroundColor = isPublic ? '#f0f8ff' : '#f9f9f9')}
                       >
                         {/* Visibility Badge */}
                         <div style={{
                           position: 'absolute',
                           top: '8px',
                           right: '8px',
                           backgroundColor: isPublic ? '#007aff' : '#6c757d',
                           color: 'white',
                           fontSize: '10px',
                           fontWeight: 'bold',
                           padding: '2px 6px',
                           borderRadius: '12px',
                           textTransform: 'uppercase'
                         }}>
                           {isPublic ? (isPosted ? '🌐 Public' : '🔓 Public') : '🔒 Private'}
                         </div>
                         
                         <div style={{ flex: 1, paddingRight: '60px' }}>
                           <div style={{ 
                             fontWeight: 'bold', 
                             marginBottom: '4px',
                             color: isPublic ? '#007aff' : '#333'
                           }}>
                             {vostcard.title || 'Untitled Vostcard'}
                           </div>
                           <div style={{ fontSize: '12px', color: '#666' }}>
                             {vostcard.description && vostcard.description.length > 50 
                              ? vostcard.description.substring(0, 50) + '...'
                              : vostcard.description || 'No description'
                             }
                           </div>
                           <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                             Created: {new Date(vostcard.createdAt).toLocaleDateString()}
                             {isPublic && (
                               <span style={{ 
                                 marginLeft: '8px', 
                                 color: isPosted ? '#28a745' : '#ffc107',
                                 fontWeight: 'bold'
                               }}>
                                 • {isPosted ? 'Published' : 'Ready to Publish'}
                               </span>
                             )}
                           </div>
                         </div>
                         <div style={{ marginLeft: '12px', color: isPublic ? '#007aff' : '#28a745' }}>
                           {loadingCardId === vostcard.id ? (
                             <div style={{
                               display: 'flex',
                               alignItems: 'center',
                               gap: '8px',
                               color: '#666'
                             }}>
                               <div style={{
                                 width: '16px',
                                 height: '16px',
                                 border: '2px solid #f3f3f3',
                                 borderTop: '2px solid #007aff',
                                 borderRadius: '50%',
                                 animation: 'spin 1s linear infinite'
                               }} />
                               <span style={{ fontSize: '12px', fontWeight: '500' }}>Loading...</span>
                             </div>
                           ) : (
                             <FaEdit size={16} />
                           )}
                         </div>
                       </div>
                     );
                   })
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add CSS for loading spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-vostcard-studio-animations]')) {
  style.setAttribute('data-vostcard-studio-animations', 'true');
  document.head.appendChild(style);
}

export default VostcardStudioView; 