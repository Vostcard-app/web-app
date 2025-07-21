// Vostcard Studio - Professional content creation and management interface
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaRocket, FaMicrophone, FaStop, FaUpload, FaMapMarkerAlt, FaList } from 'react-icons/fa';
import { useStudioAccess, useStudioAccessSummary } from '../hooks/useStudioAccess';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/shared';
import PinPlacerModal from '../components/PinPlacerModal';
import { drivecardService } from '../services/drivecardService';
import type { Drivecard } from '../types/VostcardTypes';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { hasAccess, upgradeMessage } = useStudioAccess();
  const studioSummary = useStudioAccessSummary();
  
  // Check if user can access Drivecard section
  const canAccessDrivecard = userRole === 'guide' || userRole === 'admin';
  
  // Section state - default to quickcard for all users, drivecard only for guides/admins
  const [activeSection, setActiveSection] = useState<'quickcard' | 'drivecard'>('quickcard');

  // Ensure non-privileged users stay on quickcard section
  React.useEffect(() => {
    if (activeSection === 'drivecard' && !canAccessDrivecard) {
      setActiveSection('quickcard');
    }
  }, [activeSection, canAccessDrivecard]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  
  // Pin Placer Modal state
  const [showPinPlacer, setShowPinPlacer] = useState(false);
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
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check access and load
  useEffect(() => {
    if (!hasAccess) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(false);
  }, [hasAccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setRecordingError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioSource('recording');
        setAudioFileName(null);
        setIsRecording(false);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        console.log('✅ Audio recording completed:', {
          size: audioBlob.size,
          type: audioBlob.type,
          duration: recordingTime
        });
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Auto-stop at 60 seconds
          if (newTime >= 60) {
            stopRecording();
            return 60;
          }
          
          return newTime;
        });
      }, 1000);
      
      console.log('🎤 Started audio recording');
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setRecordingError('Microphone permission denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          setRecordingError('No microphone found. Please connect a microphone and try again.');
        } else {
          setRecordingError('Failed to start recording. Please try again.');
        }
      } else {
        setRecordingError('Failed to start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      console.log('🛑 Stopped audio recording');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Audio file is too large. Please select a file smaller than 10MB.');
      return;
    }

    console.log('📁 Audio file selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Stop any ongoing recording
    if (isRecording) {
      stopRecording();
    }

    // Set the file as audio blob
    setAudioBlob(file);
    setAudioSource('file');
    setAudioFileName(file.name);
    setRecordingTime(0); // Reset recording time since this isn't a recording
    setRecordingError(null);

    // Clear the file input value so the same file can be selected again if needed
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSaveDrivecard = async () => {
    if (!user || !title.trim()) {
      alert('Please enter a title for your Drivecard.');
      return;
    }

    if (!audioBlob) {
      alert('Please record audio or select an audio file for your Drivecard.');
      return;
    }

    if (!selectedLocation) {
      alert('Please set a location for your Drivecard using Pin Placer.');
      return;
    }

    try {
      // Create new Drivecard with selected location
      const newDrivecard: Drivecard = {
        id: `drivecard_${Date.now()}`,
        title: title.trim(),
        audio: audioBlob,
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

      // Save to storage service
      await drivecardService.save(newDrivecard);
      
      // Clear form
      setTitle('');
      setSelectedLocation(null);
      clearRecording();
      
      alert('Drivecard saved successfully!');
      
    } catch (error) {
      console.error('❌ Error saving Drivecard:', error);
      alert('Failed to save Drivecard. Please try again.');
    }
  };

  const handlePinPlacer = () => {
    // Store current form data in session storage
    sessionStorage.setItem('drivecardFormData', JSON.stringify({
      title: title,
      audioBlob: audioBlob ? 'has_audio' : null, // Can't serialize Blob
      audioSource: audioSource,
      audioFileName: audioFileName
    }));
    
    // Navigate to pin placer without passing functions
    navigate('/drivecard-pin-placer', {
      state: {
        title: title || 'New Drivecard'
      }
    });
  };

  // Check for location data when component mounts or when returning from pin placer
  useEffect(() => {
    const savedLocation = sessionStorage.getItem('drivecardLocation');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setSelectedLocation(location);
        sessionStorage.removeItem('drivecardLocation'); // Clear after using
      } catch (error) {
        console.error('Error parsing saved location:', error);
      }
    }

    // Restore form data if available
    const savedFormData = sessionStorage.getItem('drivecardFormData');
    if (savedFormData) {
      try {
        const formData = JSON.parse(savedFormData);
        if (formData.title && !title) {
          setTitle(formData.title);
        }
        sessionStorage.removeItem('drivecardFormData'); // Clear after using
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, []);

  // Handle location selection from PinPlacerModal
  const handleLocationSelected = (location: { latitude: number; longitude: number; address?: string }) => {
    setSelectedLocation(location);
    setShowPinPlacer(false);
  };

  // Access denied screen
  if (!hasAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <FaRocket size={48} color="#ff6b35" style={{ marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>
            Vostcard Studio Access Required
          </h2>
          <p style={{ color: '#666', marginBottom: '25px', lineHeight: 1.6 }}>
            {upgradeMessage}
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px'
          }}>
            <strong>Your Status:</strong> {studioSummary.roleDisplay}
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading Vostcard Studio..." size="large" />;
  }

  return (
    <div style={{
      backgroundColor: 'white', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      
      {/* Standard Vostcard Header */}
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

      {/* Content Area */}
      <div style={{ 
        flex: 1,
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto'
      }}>
        {/* Vostcard Studio Title */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0 0 20px 0',
          textAlign: 'center'
        }}>
          Vostcard Studio
        </h1>

        {/* Section Navigation Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '20px',
          width: '100%',
          maxWidth: '350px'
        }}>
          {/* Quickcard Tab - Always visible */}
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
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📝 Quickcard
          </button>

          {/* Drivecard Tab - Only for guides and admins */}
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
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🚗 Drivecard
            </button>
          )}
        </div>

        {/* Section Content */}
        {activeSection === 'quickcard' && (
          <div style={{
            borderRadius: '8px',
            padding: '0px 15px 15px 15px',
            width: '100%',
            maxWidth: '350px',
            backgroundColor: 'white'
          }}>
            {/* Quickcard Editor Header */}
            <div style={{
              textAlign: 'left',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '15px'
            }}>
              📝 Quickcard Editor
            </div>

            {/* Quickcard Selection */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                Select Quickcard to Edit
              </label>
              <div style={{
                backgroundColor: '#f9f9f9',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📱</div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  Select an existing quickcard to add audio and enhance
                </div>
                <button
                  onClick={() => navigate('/quickcards', { 
                    state: { fromStudio: true } 
                  })}
                  style={{
                    backgroundColor: '#007aff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Browse My Quickcards
                </button>
              </div>
            </div>

            {/* Audio Enhancement */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                Audio Enhancement
              </label>

              {/* Audio Status */}
              <div style={{
                backgroundColor: audioBlob ? '#4caf50' : '#f5f5f5',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '10px',
                textAlign: 'center',
                border: '1px solid #ddd'
              }}>
                {audioBlob ? (
                  <div>
                    <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                      ✅ Audio Ready for Quickcard
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {audioSource === 'recording' ? 'Recorded Audio' : audioFileName || 'Audio File'} • {formatFileSize(audioBlob.size)}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#666' }}>
                    Record audio or upload a file to enhance your quickcard
                  </div>
                )}
              </div>

              {/* Audio Controls */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: audioBlob ? '1fr 1fr' : '1fr 1fr',
                gap: '8px',
                marginBottom: '10px'
              }}>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isRecording}
                  style={{
                    backgroundColor: isRecording ? '#ff4444' : '#007aff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  {isRecording ? <FaStop size={12} /> : <FaMicrophone size={12} />}
                  {isRecording ? 'Recording...' : 'Record'}
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    opacity: isRecording ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <FaUpload size={12} />
                  Upload
                </button>
              </div>

              {/* Recording Timer */}
              {isRecording && (
                <div style={{
                  textAlign: 'center',
                  color: '#ff4444',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '10px'
                }}>
                  🔴 Recording: {formatTime(recordingTime)}
                </div>
              )}

              {/* Clear Audio Button */}
              {audioBlob && !isRecording && (
                <button
                  onClick={clearRecording}
                  style={{
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Clear Audio
                </button>
              )}
            </div>

            {/* Info Box */}
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #2196f3',
              fontSize: '12px',
              color: '#1565c0',
              textAlign: 'center'
            }}>
              💡 Add audio to your existing quickcards to make them more engaging and informative
            </div>
          </div>
        )}

        {activeSection === 'drivecard' && canAccessDrivecard && (
          <div style={{
            borderRadius: '8px',
            padding: '0px 15px 15px 15px',
            width: '100%',
            maxWidth: '350px',
            backgroundColor: 'white'
          }}>
            {/* Drive Mode Creator Header */}
            <div style={{
              textAlign: 'left',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '5px'
            }}>
              🚗 Drive Mode Creator
            </div>

            {/* Role Info */}
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ffc107',
              fontSize: '12px',
              color: '#856404',
              textAlign: 'center',
              marginBottom: '15px'
            }}>
              👑 {userRole === 'admin' ? 'Admin' : 'Guide'} Access • Create location-based audio content for Drive Mode
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '2px solid #333',
                borderRadius: '4px',
                fontSize: '16px',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Audio Recording/Upload Section */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '8px'
            }}>
              Audio
            </label>
            
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
                  <div style={{ 
                    color: '#d32f2f', 
                    fontWeight: 'bold', 
                    marginBottom: '4px' 
                  }}>
                    🔴 Recording...
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {formatTime(recordingTime)} / 1:00
                  </div>
                </div>
              ) : audioBlob ? (
                <div>
                  <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    ✅ Audio {audioSource === 'recording' ? 'Recording' : 'File'} Ready
                  </div>
                  {audioSource === 'recording' ? (
                    <div style={{ fontSize: '14px' }}>
                      Duration: {formatTime(recordingTime)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px' }}>
                      File: {audioFileName}
                      <br />
                      Size: {formatFileSize(audioBlob.size)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#666' }}>
                  Record audio or select audio file
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
          </div>

          {/* Button Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '15px'
          }}>
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!recordingError}
              style={{
                backgroundColor: isRecording ? '#f44336' : '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: recordingError ? 'not-allowed' : 'pointer',
                opacity: recordingError ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isRecording ? (
                <>
                  <FaStop size={14} />
                  Stop
                </>
              ) : (
                <>
                  <FaMicrophone size={14} />
                  Record
                </>
              )}
            </button>
            
            <button 
              onClick={handleFileSelect}
              disabled={isRecording}
              style={{
                backgroundColor: isRecording ? '#ccc' : '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: isRecording ? 'not-allowed' : 'pointer',
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
              style={{
                backgroundColor: '#002B4D',
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
              <FaMapMarkerAlt size={14} />
              Pin Placer
            </button>

            {/* Library Button */}
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
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '8px'
                }}>
                  Location
                </label>
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
                    style={{
                      marginLeft: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#d32f2f',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={handleSaveDrivecard}
              disabled={!title.trim() || !audioBlob || !selectedLocation || isRecording}
              style={{
                backgroundColor: (!title.trim() || !audioBlob || !selectedLocation || isRecording) ? '#ccc' : '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (!title.trim() || !audioBlob || !selectedLocation || isRecording) ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '10px'
              }}
            >
              Save
            </button>

          {/* Clear Audio Button */}
          {audioBlob && !isRecording && (
            <button
              onClick={clearRecording}
              style={{
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                marginTop: '10px',
                width: '100%'
              }}
            >
              Clear Audio
            </button>
          )}
        </div>
        )}
      </div>

      {/* Pin Placer Modal */}
      {showPinPlacer && (
        <PinPlacerModal
          isOpen={showPinPlacer}
          onClose={() => setShowPinPlacer(false)}
          onLocationSelected={handleLocationSelected}
        />
      )}
    </div>
  );
};

export default VostcardStudioView; 