import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaList, FaMicrophone, FaStop, FaUpload, FaMapMarkerAlt, FaSave, FaCamera } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { drivecardService } from '../services/drivecardService';
import { QuickcardImporter } from '../components/studio/QuickcardImporter';
import { useVostcardEdit } from '../context/VostcardEditContext';
import type { Drivecard, Vostcard } from '../types/VostcardTypes';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useAuth();
  const { loadQuickcard } = useVostcardEdit();
  
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
  
  // Quickcard creation state
  const [quickcardTitle, setQuickcardTitle] = useState('');
  const [quickcardPhoto, setQuickcardPhoto] = useState<Blob | null>(null);
  const [quickcardPhotoPreview, setQuickcardPhotoPreview] = useState<string | null>(null);
  const [quickcardLocation, setQuickcardLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [quickcardAudio, setQuickcardAudio] = useState<Blob | null>(null);
  const [quickcardAudioSource, setQuickcardAudioSource] = useState<'recording' | 'file' | null>(null);
  const [quickcardAudioFileName, setQuickcardAudioFileName] = useState<string | null>(null);
  const [quickcardCategory, setQuickcardCategory] = useState('None');

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
          setQuickcardTitle(state.title || '');
          setQuickcardCategory(state.category || 'None');
          setShowQuickcardCreator(true);
          sessionStorage.removeItem('quickcardCreatorState');
        }
      } catch (error) {
        console.error('Error parsing quickcard location:', error);
      }
    }
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
    // Clear creation state
    setQuickcardTitle('');
    setQuickcardPhoto(null);
    setQuickcardPhotoPreview(null);
    setQuickcardLocation(null);
    setQuickcardAudio(null);
    setQuickcardAudioSource(null);
    setQuickcardAudioFileName(null);
    setQuickcardCategory('None');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setQuickcardPhoto(file);
      const previewUrl = URL.createObjectURL(file);
      setQuickcardPhotoPreview(previewUrl);
    }
  };

  const handleQuickcardAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setQuickcardAudio(file);
      setQuickcardAudioSource('file');
      setQuickcardAudioFileName(file.name);
    }
  };

  const handleQuickcardPinPlacer = () => {
    // Store current quickcard state in sessionStorage
    sessionStorage.setItem('quickcardCreatorState', JSON.stringify({
      title: quickcardTitle,
      photo: quickcardPhoto ? 'hasPhoto' : null,
      audio: quickcardAudio ? 'hasAudio' : null,
      audioSource: quickcardAudioSource,
      audioFileName: quickcardAudioFileName,
      category: quickcardCategory
    }));
    
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

  const handleSaveQuickcard = async () => {
    if (!quickcardTitle.trim()) {
      alert('Please enter a title for your quickcard.');
      return;
    }

    if (!quickcardPhoto) {
      alert('Please add a photo for your quickcard.');
      return;
    }

    if (!quickcardLocation) {
      alert('Please set a location for your quickcard.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create quickcard using VostcardEditContext
      const quickcard: Vostcard = {
        id: `quickcard_${Date.now()}`,
        title: quickcardTitle.trim(),
        description: '', // Can be added later in advanced editor
        photos: [quickcardPhoto],
        audio: quickcardAudio,
        categories: [quickcardCategory],
        geo: quickcardLocation,
        username: user?.displayName || user?.email || 'Unknown User',
        userID: user?.uid || '',
        state: 'private',
        video: null,
        isQuickcard: true,
        hasVideo: false,
        hasPhotos: true,
        hasAudio: !!quickcardAudio,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Load the quickcard into the editor for further editing
      loadQuickcard(quickcard);
      
      // Navigate to advanced editor
      navigate('/studio', { 
        state: { 
          editingQuickcard: quickcard.id,
          activeTab: 'quickcard',
          fromCreator: true
        }
      });
      
      console.log('✅ Quickcard created and loaded into editor');
      
    } catch (error) {
      console.error('❌ Error creating quickcard:', error);
      alert('Failed to create quickcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column'
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
            border: '1px solid #ddd'
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

            {/* Audio Status */}
            <div style={{
              backgroundColor: quickcardAudio ? '#4caf50' : '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '10px',
              textAlign: 'center',
              border: '1px solid #ddd'
            }}>
              {quickcardAudio ? (
                <div>
                  <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    ✅ Audio Ready
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {quickcardAudioSource === 'file' && quickcardAudioFileName}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#666' }}>
                  Record audio or select audio file
                </div>
              )}
            </div>

            {/* Button Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <button 
                onClick={() => document.getElementById('quickcard-photo-input')?.click()}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#002B4D',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaCamera size={14} />
                Add photo
              </button>
              
              <button 
                onClick={() => document.getElementById('quickcard-audio-input')?.click()}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#002B4D',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaUpload size={14} />
                Add audio
              </button>
              
              <button 
                onClick={handleQuickcardPinPlacer}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#002B4D',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaMapMarkerAlt size={14} />
                Pin Placer
              </button>

              <button
                onClick={() => navigate('/quickcards')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaList size={14} />
                Library
              </button>
            </div>
            
            {/* Location Display */}
            {quickcardLocation && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{
                  backgroundColor: '#e8f5e8',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #4caf50',
                  fontSize: '14px',
                  color: '#2e7d32'
                }}>
                  📍 {quickcardLocation.address || `${quickcardLocation.latitude.toFixed(4)}, ${quickcardLocation.longitude.toFixed(4)}`}
                  <button
                    onClick={() => setQuickcardLocation(null)}
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

            {/* Category Selection */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Category
              </label>
              <select
                value={quickcardCategory}
                onChange={(e) => setQuickcardCategory(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '18px',
                  backgroundColor: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {availableCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Save/Update Button */}
            <button 
              onClick={handleSaveQuickcard}
              disabled={!quickcardTitle.trim() || !quickcardLocation || isLoading || !quickcardPhoto}
              style={{
                backgroundColor: (!quickcardTitle.trim() || !quickcardLocation || isLoading || !quickcardPhoto) ? '#ccc' : '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (!quickcardTitle.trim() || !quickcardLocation || isLoading || !quickcardPhoto) ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FaSave size={14} />
              Save Quickcard
            </button>

            {/* Clear Photo Button */}
            {quickcardPhoto && (
              <button
                onClick={() => {
                  setQuickcardPhoto(null);
                  setQuickcardPhotoPreview(null);
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
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Clear Photo
              </button>
            )}

            {/* Hidden File Inputs */}
            <input
              id="quickcard-photo-input"
              type="file"
              accept="image/*"
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
        )}

        {/* Drivecard Section */}
        {activeSection === 'drivecard' && canAccessDrivecard && (
          <div style={{
            borderRadius: '8px',
            padding: '15px',
            width: '100%',
            maxWidth: '350px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ marginTop: 0 }}>
              🚗 {editingDrivecard ? 'Edit Drivecard' : 'Drive Mode Creator'}
            </h3>
            
            {!editingDrivecard && (
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ffc107',
                fontSize: '12px',
                color: '#856404',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                👑 {userRole === 'admin' ? 'Admin' : 'Guide'} Access • Create location-based audio content for Drive Mode
              </div>
            )}

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

            {/* Audio Status */}
            <div style={{
              backgroundColor: isRecording ? '#ffeb3b' : audioBlob ? '#4caf50' : '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '10px',
              textAlign: 'center',
              border: '1px solid #ddd'
            }}>
              {isRecording ? (
                <div>
                  <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                    🔴 Recording... {formatTime(recordingTime)}
                  </div>
                </div>
              ) : audioBlob ? (
                <div>
                  <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    ✅ {editingDrivecard ? 'New Audio Ready' : 'Audio Ready'}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {audioSource === 'recording' ? `Duration: ${formatTime(recordingTime)}` : `File: ${audioFileName}`}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#666' }}>
                  {editingDrivecard 
                    ? 'Record new audio or keep existing (optional)' 
                    : 'Record audio or select audio file'
                  }
                </div>
              )}
            </div>

            {/* Recording Error */}
            {recordingError && (
              <div style={{
                backgroundColor: '#ffebee',
                color: '#d32f2f',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '10px',
                border: '1px solid #ffcdd2'
              }}>
                {recordingError}
              </div>
            )}

            {/* Button Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!!recordingError || isLoading}
                style={{
                  backgroundColor: isRecording ? '#f44336' : '#002B4D',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: (recordingError || isLoading) ? 'not-allowed' : 'pointer',
                  opacity: (recordingError || isLoading) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isRecording ? <FaStop size={14} /> : <FaMicrophone size={14} />}
                {isRecording ? 'Stop' : 'Record'}
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || isLoading}
                style={{
                  backgroundColor: (isRecording || isLoading) ? '#ccc' : '#002B4D',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: (isRecording || isLoading) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaUpload size={14} />
                Add audio
              </button>
              
              <button 
                onClick={handlePinPlacer}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#ccc' : '#002B4D',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaMapMarkerAlt size={14} />
                Pin Placer
              </button>

              <button
                onClick={() => navigate('/drivecards')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaList size={14} />
                Library
              </button>
            </div>
            
            {/* Location Display */}
            {selectedLocation && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{
                  backgroundColor: '#e8f5e8',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #4caf50',
                  fontSize: '14px',
                  color: '#2e7d32'
                }}>
                  📍 {selectedLocation.address || `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
                  <button
                    onClick={() => setSelectedLocation(null)}
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

            {/* Category Selection */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Category
              </label>
              <select
                value={drivecardCategory}
                onChange={(e) => setDrivecardCategory(e.target.value)}
                disabled={isLoading || isRecording}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '18px',
                  backgroundColor: 'white',
                  cursor: (isLoading || isRecording) ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || isRecording) ? 0.6 : 1
                }}
              >
                {availableCategories.map(category => (
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
      </div>
    </div>
  );
};

export default VostcardStudioView; 