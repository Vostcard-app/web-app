import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaTrash, FaPlay, FaPause, FaMusic, FaMapPin } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import type { Drivecard } from '../types/VostcardTypes';
import { drivecardService } from '../services/drivecardService';

const DrivecardsListView: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username } = useAuth();
  const [drivecards, setDrivecards] = useState<Drivecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  // Audio playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadDrivecards();
    }
  }, [authLoading, user]);

  const loadDrivecards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setError('Please log in to view your Drivecards.');
        navigate('/login');
        return;
      }

      // Load Drivecards using the service
      const loadedDrivecards = await drivecardService.loadAll();
      setDrivecards(loadedDrivecards);
      console.log('✅ Drivecards loaded successfully:', loadedDrivecards.length);
      
    } catch (error) {
      console.error('❌ Error loading Drivecards:', error);
      setError('Failed to load Drivecards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (drivecardId: string) => {
    // Stop any playing audio before navigating
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    }
    
    console.log('📝 Edit Drivecard:', drivecardId);
    navigate('/studio', { state: { editingDrivecard: drivecardId } });
  };

  const handleDelete = async (drivecardId: string) => {
    if (!window.confirm('Are you sure you want to delete this Drivecard? This action cannot be undone.')) {
      return;
    }

    // Stop audio if this drivecard is playing
    if (playingAudio === drivecardId && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    }

    try {
      setDeletingIds(prev => new Set([...prev, drivecardId]));
      
      // Delete using the service
      await drivecardService.delete(drivecardId);
      
      // Remove from local state
      setDrivecards(prev => prev.filter(d => d.id !== drivecardId));
      
      console.log('✅ Drivecard deleted:', drivecardId);
      
    } catch (error) {
      console.error('❌ Error deleting Drivecard:', error);
      alert('Failed to delete Drivecard. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(drivecardId);
        return newSet;
      });
    }
  };

  const handlePlayAudio = async (drivecard: Drivecard) => {
    try {
      // If this drivecard is already playing, pause it
      if (playingAudio === drivecard.id) {
        if (audioRef.current) {
          audioRef.current.pause();
          setPlayingAudio(null);
        }
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Clean up previous audio URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      // Get audio source
      let audioSrc = '';
      
      if (drivecard.audio && drivecard.audio instanceof Blob) {
        // Create object URL for local audio blob
        audioSrc = URL.createObjectURL(drivecard.audio);
        audioUrlRef.current = audioSrc;
      } else if (drivecard._firebaseAudioURL) {
        // Use Firebase audio URL
        audioSrc = drivecard._firebaseAudioURL;
      } else {
        console.warn('No audio source available for Drivecard:', drivecard.id);
        alert('Audio not available for this Drivecard.');
        return;
      }

      // Create and configure audio element
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      
      // Set up event listeners
      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
        
        // Clean up object URL
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        alert('Failed to play audio. The audio file may be corrupted.');
        setPlayingAudio(null);
        audioRef.current = null;
        
        // Clean up object URL
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      // Start playback
      setPlayingAudio(drivecard.id);
      await audio.play();
      
      console.log('🔊 Playing Drivecard audio:', drivecard.title);
      
    } catch (error) {
      console.error('❌ Failed to play audio:', error);
      alert('Failed to play audio. Please try again.');
      setPlayingAudio(null);
    }
  };

  const formatLocation = (geo: { latitude: number; longitude: number; address?: string }) => {
    if (geo.address) {
      return geo.address;
    }
    return `${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`;
  };

  const handleRetry = () => {
    loadDrivecards();
  };

  if (authLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDesktop ? '#f0f0f0' : '#f5f5f5',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: isDesktop ? '20px' : '0'
    }}>
      {/* Mobile-style container with responsive design */}
      <div style={{
        width: isDesktop ? '390px' : '100%',
        maxWidth: '390px',
        height: isDesktop ? '844px' : '100vh',
        backgroundColor: '#f5f5f5',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: isDesktop ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#07345c',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '16px',
          color: 'white',
          position: 'relative',
          padding: '15px 0 24px 20px',
          borderRadius: isDesktop ? '16px 16px 0 0' : '0',
          flexShrink: 0
        }}>
          <h1 style={{ fontSize: '30px', margin: 0 }}>Drivecards</h1>
          
          {/* Home Button */}
          <FaHome
            size={40}
            style={{
              cursor: 'pointer',
              position: 'absolute',
              right: 29,
              top: 15,
              background: 'rgba(0,0,0,0.10)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => navigate('/home')}
          />
        </div>

        {/* Content */}
        <div style={{ 
          padding: '20px', 
          flex: 1,
          overflowY: 'auto'
        }}>
          {/* Error State */}
          {error && (
            <ErrorMessage message={error} onRetry={handleRetry} />
          )}

          {/* Loading State */}
          {loading && !error ? (
            <LoadingSpinner />
          ) : drivecards.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666'
            }}>
              <FaMusic size={48} color="#ccc" style={{ marginBottom: '20px' }} />
              <h2>No Drivecards Found</h2>
              <p>You haven't created any Drivecards yet.</p>
              <button
                onClick={() => navigate('/studio')}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '10px',
                  fontSize: '16px'
                }}
              >
                Create Your First Drivecard
              </button>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                borderRadius: '8px 8px 0 0'
              }}>
                {drivecards.length} Drivecard{drivecards.length !== 1 ? 's' : ''}
              </div>

              {/* Drivecards List */}
              <div style={{ 
                maxHeight: '70vh', 
                overflowY: 'auto',
                backgroundColor: 'white',
                borderRadius: '0 0 8px 8px',
                border: '1px solid #dee2e6',
                borderTop: 'none'
              }}>
                {[...drivecards]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((drivecard) => (
                  <div
                    key={drivecard.id}
                    style={{
                      padding: '20px',
                      borderBottom: '1px solid #f0f0f0',
                      opacity: deletingIds.has(drivecard.id) ? 0.5 : 1,
                      backgroundColor: 'white',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      marginBottom: '12px'
                    }}>
                      {/* Audio Play Button */}
                      <button
                        onClick={() => handlePlayAudio(drivecard)}
                        disabled={deletingIds.has(drivecard.id)}
                        style={{
                          backgroundColor: playingAudio === drivecard.id ? '#ff5722' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: deletingIds.has(drivecard.id) ? 'not-allowed' : 'pointer',
                          fontSize: '16px',
                          flexShrink: 0,
                          transition: 'background-color 0.2s',
                          opacity: deletingIds.has(drivecard.id) ? 0.6 : 1
                        }}
                      >
                        {playingAudio === drivecard.id ? <FaPause /> : <FaPlay />}
                      </button>

                      {/* Drivecard Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ 
                          margin: '0 0 8px 0', 
                          color: '#002B4D',
                          fontSize: '18px',
                          wordBreak: 'break-word'
                        }}>
                          {drivecard.title || 'Untitled Drivecard'}
                        </h3>
                        
                        {/* Location */}
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#666',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '4px'
                        }}>
                          <FaMapPin size={12} color="#666" />
                          <span style={{ wordBreak: 'break-word' }}>
                            {formatLocation(drivecard.geo)}
                          </span>
                        </div>
                        
                        {/* Category Badge */}
                        <div style={{ 
                          fontSize: '12px', 
                          marginBottom: '4px'
                        }}>
                          <span style={{
                            backgroundColor: '#6c5ce7',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            {drivecard.category || 'Drive mode'}
                          </span>
                        </div>
                        
                        {/* Playing indicator */}
                        {playingAudio === drivecard.id && (
                          <div style={{
                            fontSize: '12px',
                            color: '#ff5722',
                            fontWeight: 'bold',
                            marginBottom: '4px'
                          }}>
                            🔊 Playing...
                          </div>
                        )}
                        
                        {/* Created Date */}
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#999' 
                        }}>
                          Created: {new Date(drivecard.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => handleEdit(drivecard.id)}
                        disabled={deletingIds.has(drivecard.id)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          cursor: deletingIds.has(drivecard.id) ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: deletingIds.has(drivecard.id) ? 0.6 : 1
                        }}
                      >
                        <FaEdit size={12} />
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleDelete(drivecard.id)}
                        disabled={deletingIds.has(drivecard.id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          cursor: deletingIds.has(drivecard.id) ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          opacity: deletingIds.has(drivecard.id) ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FaTrash size={12} />
                        {deletingIds.has(drivecard.id) ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrivecardsListView; 