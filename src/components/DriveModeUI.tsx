// Drive Mode UI - Safe, large-button interface for driving
import React, { useState, useEffect } from 'react';
import { FaPlay, FaPause, FaStop, FaForward, FaVolumeUp, FaVolumeDown, FaCar, FaCog, FaTimes } from 'react-icons/fa';
import { useDriveMode } from '../context/DriveModeContext';
import { AudioPlayerUtils } from '../utils/audioPlayerUtils';
import type { Vostcard } from '../types/VostcardTypes';

interface DriveModeUIProps {
  onExit: () => void;
  onSettings: () => void;
}

export const DriveModeUI: React.FC<DriveModeUIProps> = ({ onExit, onSettings }) => {
  const {
    isDriveModeEnabled,
    isAutoEnabled,
    currentSpeed,
    currentPlayback,
    isPlaying,
    playbackQueue,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    skipToNext,
    stats
  } = useDriveMode();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(AudioPlayerUtils.getGlobalVolume());

  // Update playback time
  useEffect(() => {
    if (currentPlayback?.audioElement) {
      const audioElement = currentPlayback.audioElement;
      
      const updateTime = () => {
        setCurrentTime(audioElement.currentTime);
        setDuration(audioElement.duration || 0);
      };

      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('loadedmetadata', updateTime);

      return () => {
        audioElement.removeEventListener('timeupdate', updateTime);
        audioElement.removeEventListener('loadedmetadata', updateTime);
      };
    }
  }, [currentPlayback]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    AudioPlayerUtils.setGlobalVolume(newVolume);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      fontFamily: 'Arial, sans-serif'
    }}>
      
      {/* Header */}
      <div style={{
        padding: '20px',
        backgroundColor: '#2d2d2d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #444'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <FaCar size={32} color="#4CAF50" />
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#4CAF50'
            }}>
              Drive Mode
            </h1>
            <div style={{ 
              fontSize: '18px', 
              color: '#aaa',
              marginTop: '5px'
            }}>
              {isAutoEnabled ? 'Auto-Enabled' : 'Manual'} • {currentSpeed.toFixed(0)} mph
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={onSettings}
            style={{
              backgroundColor: '#444',
              border: 'none',
              borderRadius: '8px',
              padding: '15px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            <FaCog size={24} />
          </button>
          <button
            onClick={onExit}
            style={{
              backgroundColor: '#f44336',
              border: 'none',
              borderRadius: '8px',
              padding: '15px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            <FaTimes size={24} />
          </button>
        </div>
      </div>

      {/* Current Playback Section */}
      <div style={{
        flex: 1,
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {currentPlayback ? (
          <>
            {/* Now Playing Info */}
            <div style={{
              textAlign: 'center',
              marginBottom: '40px',
              maxWidth: '800px'
            }}>
              <h2 style={{
                fontSize: '36px',
                margin: '0 0 10px 0',
                color: '#fff',
                fontWeight: 'bold'
              }}>
                {currentPlayback.vostcard.title || 'Untitled'}
              </h2>
              <p style={{
                fontSize: '24px',
                margin: '0 0 15px 0',
                color: '#aaa'
              }}>
                by {currentPlayback.vostcard.username}
              </p>
              
              {currentPlayback.triggeredByLocation && (
                <div style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '16px',
                  display: 'inline-block',
                  marginBottom: '20px'
                }}>
                  📍 Auto-triggered by location
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              maxWidth: '600px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#444',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  transition: 'width 0.1s'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '10px',
                fontSize: '18px',
                color: '#aaa'
              }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Audio Controls */}
            <div style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '30px',
              alignItems: 'center'
            }}>
              <button
                onClick={isPlaying ? pausePlayback : resumePlayback}
                style={{
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: 'white'
                }}
              >
                {isPlaying ? <FaPause size={32} /> : <FaPlay size={32} />}
              </button>

              <button
                onClick={stopPlayback}
                style={{
                  backgroundColor: '#f44336',
                  border: 'none',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <FaStop size={24} />
              </button>

              {playbackQueue.length > 0 && (
                <button
                  onClick={skipToNext}
                  style={{
                    backgroundColor: '#2196F3',
                    border: 'none',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <FaForward size={24} />
                </button>
              )}
            </div>

            {/* Volume Control */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => handleVolumeChange(Math.max(0, volume - 0.1))}
                style={{
                  backgroundColor: '#666',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <FaVolumeDown size={20} />
              </button>

              <div style={{
                width: '200px',
                height: '6px',
                backgroundColor: '#444',
                borderRadius: '3px',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                handleVolumeChange(Math.max(0, Math.min(1, percent)));
              }}>
                <div style={{
                  width: `${volume * 100}%`,
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  borderRadius: '3px'
                }} />
                <div style={{
                  position: 'absolute',
                  left: `${volume * 100}%`,
                  top: '-6px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#4CAF50',
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                  cursor: 'pointer'
                }} />
              </div>

              <button
                onClick={() => handleVolumeChange(Math.min(1, volume + 0.1))}
                style={{
                  backgroundColor: '#666',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <FaVolumeUp size={20} />
              </button>

              <span style={{ 
                fontSize: '16px', 
                color: '#aaa',
                minWidth: '45px'
              }}>
                {Math.round(volume * 100)}%
              </span>
            </div>

          </>
        ) : (
          // No current playback
          <div style={{
            textAlign: 'center',
            color: '#aaa'
          }}>
            <FaCar size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
            <h2 style={{ fontSize: '32px', margin: '0 0 15px 0' }}>
              Drive Mode Active
            </h2>
            <p style={{ fontSize: '20px', margin: '0 0 10px 0' }}>
              Listening for nearby Drive Mode vostcards...
            </p>
            <p style={{ fontSize: '18px', color: '#666' }}>
              Speed: {currentSpeed.toFixed(1)} mph
            </p>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div style={{
        padding: '20px',
        backgroundColor: '#2d2d2d',
        borderTop: '2px solid #444',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
              {stats.totalTriggered}
            </div>
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              Triggered
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
              {playbackQueue.length}
            </div>
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              Queued
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
              {Math.round(stats.averageSpeed)}
            </div>
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              Avg MPH
            </div>
          </div>
        </div>

        {playbackQueue.length > 0 && (
          <div style={{ 
            fontSize: '16px', 
            color: '#aaa',
            textAlign: 'right'
          }}>
            <div>Next up:</div>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>
              {playbackQueue[0]?.title || 'Unknown'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 