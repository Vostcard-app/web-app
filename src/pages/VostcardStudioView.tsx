import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaList, FaMicrophone, FaStop, FaUpload, FaMapMarkerAlt, FaSave } from 'react-icons/fa';
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
  
  const canAccessDrivecard = userRole === 'guide' || userRole === 'admin';
  
  // Check if we're editing a drivecard from the library
  const editingDrivecardId = location.state?.editingDrivecard;
  
  // Switch to drivecard section if editing one
  const [activeSection, setActiveSection] = useState<'quickcard' | 'drivecard'>(
    editingDrivecardId && canAccessDrivecard ? 'drivecard' : 'quickcard'
  );

  // Quickcard import state
  const [showQuickcardImporter, setShowQuickcardImporter] = useState(false);

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
          category: 'Drive mode',
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
        clearRecording();
      }
      
    } catch (error) {
      console.error('❌ Error saving/updating Drivecard:', error);
      alert('Failed to save Drivecard. Please try again.');
    }
  };

  const handlePinPlacer = () => {
    navigate('/drivecard-pin-placer', {
      state: {
        title: title || 'New Drivecard'
      }
    });
  };

  // Handle location data from pin placer
  useEffect(() => {
    const savedLocation = sessionStorage.getItem('drivecardLocation');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setSelectedLocation(location);
        sessionStorage.removeItem('drivecardLocation');
      } catch (error) {
        console.error('Error parsing saved location:', error);
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
            <FaHome color="#fff" size={24} />
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
            padding: '20px',
            width: '100%',
            maxWidth: '500px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd'
          }}>
            {!showQuickcardImporter ? (
              <div style={{ textAlign: 'center' }}>
                <h3>📝 Quickcard Studio</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Import and enhance your quickcards with audio, improved content, and professional editing tools
                </p>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowQuickcardImporter(true)}
                    style={{
                      backgroundColor: '#007aff',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📱 Import Quickcard
                  </button>
                  
                  <button
                    onClick={() => navigate('/quickcards')}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📋 Browse Library
                  </button>
                </div>

                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  backgroundColor: '#e8f4fd',
                  borderRadius: '8px',
                  border: '1px solid #bee5eb',
                  fontSize: '14px',
                  color: '#0c5460',
                  textAlign: 'left'
                }}>
                  <strong>💡 Studio Features:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Add audio narration to quickcards</li>
                    <li>Enhanced editing with advanced tools</li>
                    <li>Convert quickcards to full vostcards</li>
                    <li>Professional content management</li>
                  </ul>
                </div>
              </div>
            ) : (
              <QuickcardImporter
                onImport={handleQuickcardImport}
                onCancel={handleCancelImport}
              />
            )}
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