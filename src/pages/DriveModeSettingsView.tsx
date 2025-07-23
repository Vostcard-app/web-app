// Drive Mode Settings View - Comprehensive settings and preferences for Drive Mode
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome, FaCar, FaMusic, FaInfoCircle, FaList, FaCog, FaDigitalTachograph, FaMapMarkerAlt, FaVolumeUp, FaClock, FaPlay, FaPause, FaFastForward } from 'react-icons/fa';
import { useDriveMode } from '../context/DriveModeContext';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';

const DriveModeSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  
  const {
    isDriveModeEnabled,
    isAutoEnabled,
    currentSpeed,
    settings,
    currentPlayback,
    isPlaying,
    playbackQueue,
    stats,
    enableDriveMode,
    disableDriveMode,
    updateSettings,
    pausePlayback,
    resumePlayback,
    skipToNext,
    stopPlayback
  } = useDriveMode();

  const [activeSection, setActiveSection] = useState<'settings' | 'status' | 'info'>('settings');

  const handleToggleDriveMode = () => {
    if (isDriveModeEnabled) {
      disableDriveMode();
    } else {
      enableDriveMode(true); // Manual enable
    }
  };

  const handleAutoEnableToggle = () => {
    updateSettings({
      isEnabled: !settings.isEnabled
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDistance = (miles: number) => {
    const feet = miles * 5280;
    if (feet < 1000) {
      return `${Math.round(feet)} feet`;
    }
    return `${miles} miles`;
  };

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
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#07345c',
          color: 'white',
          padding: '32px 24px 24px 24px',
          borderRadius: isDesktop ? '16px 16px 0 0' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h1 
            onClick={() => navigate('/home')}
            style={{
              color: 'white',
              fontWeight: 700,
              fontSize: '1.8rem',
              margin: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaCar />
            Drive Mode
          </h1>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'rgba(0,0,0,0.10)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              cursor: 'pointer',
            }}
          >
            <FaHome size={40} color="white" />
          </button>
        </div>

        {/* Section Navigation */}
        <div style={{
          display: 'flex',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0
        }}>
          {[
            { key: 'settings', label: 'Settings', icon: FaCog },
            { key: 'status', label: 'Status', icon: FaDigitalTachograph },
            { key: 'info', label: 'Info', icon: FaInfoCircle }
          ].map(section => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key as any)}
              style={{
                flex: 1,
                padding: '16px 8px',
                border: 'none',
                backgroundColor: activeSection === section.key ? '#07345c' : 'white',
                color: activeSection === section.key ? 'white' : '#07345c',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.3s ease'
              }}
            >
              <section.icon size={16} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div style={{ 
          flex: 1,
          overflow: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: 'white'
        }}>
          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div style={{ padding: '20px' }}>
              {/* Settings Overview */}
              <div style={{
                backgroundColor: '#e8f4fd',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #bee5eb'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c5460', fontSize: '16px' }}>
                  🚗 Drive Mode Settings
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#0c5460', lineHeight: '1.4' }}>
                  <strong>System Activation</strong> controls when Drive Mode turns on/off automatically.<br/>
                  <strong>Content Triggering</strong> controls when individual drivecards play during Drive Mode.
                </p>
              </div>
              {/* Main Drive Mode Toggle */}
              <div style={{
                backgroundColor: isDriveModeEnabled ? '#4CAF50' : '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: isDriveModeEnabled ? '2px solid #4CAF50' : '2px solid #e0e0e0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    color: isDriveModeEnabled ? 'white' : '#002B4D',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FaCar />
                    Drive Mode
                  </h3>
                  <button
                    onClick={handleToggleDriveMode}
                    style={{
                      backgroundColor: isDriveModeEnabled ? 'white' : '#4CAF50',
                      color: isDriveModeEnabled ? '#4CAF50' : 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {isDriveModeEnabled ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
                
                <div style={{ 
                  fontSize: '14px', 
                  color: isDriveModeEnabled ? 'rgba(255,255,255,0.9)' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FaDigitalTachograph />
                  Current Speed: {currentSpeed.toFixed(0)} mph
                  {isAutoEnabled && <span>(Auto-enabled)</span>}
                </div>

                {isDriveModeEnabled && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'white'
                  }}>
                    ✅ Drive Mode is active - Listening for nearby vostcards with "Drive Mode" category
                  </div>
                )}
              </div>

              {/* System Activation Settings */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#002B4D' }}>⚡ Drive Mode Activation</h4>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 15px 0' }}>
                  Controls when Drive Mode automatically turns on and off
                </p>
                
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '15px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={handleAutoEnableToggle}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>
                    Enable automatic activation when driving
                  </span>
                </label>

                {settings.isEnabled && (
                  <div style={{ paddingLeft: '20px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      <label style={{ minWidth: '120px', fontSize: '14px' }}>
                        Auto-enable speed:
                      </label>
                      <input
                        type="range"
                        min="15"
                        max="45"
                        step="5"
                        value={settings.autoEnableSpeed}
                        onChange={(e) => updateSettings({ autoEnableSpeed: parseInt(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        minWidth: '50px',
                        textAlign: 'right'
                      }}>
                        {settings.autoEnableSpeed} mph
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      <label style={{ minWidth: '120px', fontSize: '14px' }}>
                        Auto-disable delay:
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="1"
                        value={settings.autoDisableAfterStop}
                        onChange={(e) => updateSettings({ autoDisableAfterStop: parseInt(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        minWidth: '50px',
                        textAlign: 'right'
                      }}>
                        {settings.autoDisableAfterStop} min
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Triggering Settings */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#002B4D' }}>
                  <FaMapMarkerAlt style={{ marginRight: '8px' }} />
                  Content Triggering
                </h4>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 15px 0' }}>
                  Controls when individual drivecards play during Drive Mode
                </p>
                
                {/* Content Triggering Method */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '10px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="triggerMethod"
                      checked={!settings.usePredictiveTrigger}
                      onChange={() => updateSettings({ usePredictiveTrigger: false })}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>
                      📏 Fixed Distance
                    </span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 30px' }}>
                    Always triggers drivecards when you're within a set distance
                  </p>
                  
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="triggerMethod"
                      checked={settings.usePredictiveTrigger}
                      onChange={() => updateSettings({ usePredictiveTrigger: true })}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>
                      🚗 Predictive Timing
                    </span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 15px 30px' }}>
                    Calculates your speed and triggers content ahead of time for perfect timing
                  </p>
                </div>

                {/* Fixed Distance Settings */}
                {!settings.usePredictiveTrigger && (
                  <div style={{ 
                    padding: '15px',
                    backgroundColor: '#e8f4fd',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      <label style={{ minWidth: '120px', fontSize: '14px' }}>
                        Trigger distance:
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={settings.triggerDistance}
                        onChange={(e) => updateSettings({ triggerDistance: parseFloat(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        minWidth: '80px',
                        textAlign: 'right'
                      }}>
                        {formatDistance(settings.triggerDistance)}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Triggers when you're within this fixed distance of a drivecard
                    </div>
                  </div>
                )}

                {/* Predictive Mode Settings */}
                {settings.usePredictiveTrigger && (
                  <div style={{ 
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      <label style={{ minWidth: '120px', fontSize: '14px' }}>
                        Lead time:
                      </label>
                      <input
                        type="range"
                        min="15"
                        max="60"
                        step="5"
                        value={settings.predictiveLeadTime}
                        onChange={(e) => updateSettings({ predictiveLeadTime: parseInt(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        minWidth: '60px',
                        textAlign: 'right'
                      }}>
                        {settings.predictiveLeadTime}s
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#856404', marginBottom: '8px' }}>
                      ⚡ Calculates your speed and triggers drivecards {settings.predictiveLeadTime} seconds before you reach them
                    </div>
                    
                    <div style={{ fontSize: '11px', color: '#6c757d', fontStyle: 'italic' }}>
                      Example: At 30 mph, triggers {((30 * settings.predictiveLeadTime / 3600).toFixed(2))} miles before location
                    </div>
                  </div>
                )}
              </div>

              {/* Category Filters */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#002B4D' }}>🏷️ Category Filters</h4>
                
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                  Select categories to exclude from Drive Mode playback
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '8px'
                }}>
                  {[
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
                    'Made for kids'
                  ].map(category => (
                    <label
                      key={category}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 10px',
                        backgroundColor: settings.excludedCategories?.includes(category) ? '#ffebee' : 'white',
                        border: `1px solid ${settings.excludedCategories?.includes(category) ? '#ffcdd2' : '#e0e0e0'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={settings.excludedCategories?.includes(category) || false}
                        onChange={(e) => {
                          const currentExcluded = settings.excludedCategories || [];
                          if (e.target.checked) {
                            updateSettings({ 
                              excludedCategories: [...currentExcluded, category] 
                            });
                          } else {
                            updateSettings({ 
                              excludedCategories: currentExcluded.filter((c: string) => c !== category) 
                            });
                          }
                        }}
                        style={{ transform: 'scale(0.9)' }}
                      />
                      <span style={{ 
                        color: settings.excludedCategories?.includes(category) ? '#d32f2f' : '#333',
                        fontWeight: settings.excludedCategories?.includes(category) ? '600' : '400'
                      }}>
                        {category}
                      </span>
                    </label>
                  ))}
                </div>
                
                <div style={{ 
                  fontSize: '11px', 
                  color: '#999', 
                  marginTop: '10px',
                  fontStyle: 'italic'
                }}>
                  Excluded categories: {settings.excludedCategories?.length || 0} of 12
                </div>
              </div>




            </div>
          )}

          {/* Status Section */}
          {activeSection === 'status' && (
            <div style={{ padding: '20px' }}>
              {/* Current Status */}
              <div style={{
                backgroundColor: isDriveModeEnabled ? '#4CAF50' : '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                color: isDriveModeEnabled ? 'white' : '#002B4D'
              }}>
                <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCar />
                  Current Status
                </h4>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  Drive Mode: {isDriveModeEnabled ? 'Active' : 'Inactive'}
                  <br />
                  Speed: {currentSpeed.toFixed(1)} mph
                  <br />
                  {isAutoEnabled ? 'Auto-enabled' : 'Manual control'}
                </div>
              </div>

              {/* Current Playback */}
              {currentPlayback && (
                <div style={{
                  backgroundColor: '#ff5722',
                  color: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaPlay />
                    Now Playing
                  </h4>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {currentPlayback.vostcard.title || 'Untitled'}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '15px' }}>
                    {currentPlayback.triggeredByLocation ? 'Auto-triggered by location' : 'Manual playback'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={isPlaying ? pausePlayback : resumePlayback}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      {isPlaying ? <FaPause /> : <FaPlay />}
                      {isPlaying ? 'Pause' : 'Resume'}
                    </button>
                    
                    <button
                      onClick={skipToNext}
                      disabled={playbackQueue.length === 0}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: playbackQueue.length > 0 ? 'white' : 'rgba(255,255,255,0.5)',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        cursor: playbackQueue.length > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <FaFastForward />
                      Skip
                    </button>
                    
                    <button
                      onClick={stopPlayback}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}

              {/* Queue */}
              {playbackQueue.length > 0 && (
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#002B4D' }}>
                    📋 Queue ({playbackQueue.length} items)
                  </h4>
                  {playbackQueue.slice(0, 3).map((vostcard, index) => (
                    <div key={vostcard.id} style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      padding: '5px 0',
                      borderBottom: index < 2 ? '1px solid #e0e0e0' : 'none'
                    }}>
                      {index + 1}. {vostcard.title || 'Untitled'}
                    </div>
                  ))}
                  {playbackQueue.length > 3 && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                      ... and {playbackQueue.length - 3} more
                    </div>
                  )}
                </div>
              )}

              {/* Statistics */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#002B4D' }}>📊 Statistics</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                      {stats.totalTriggered}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Triggered</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                      {formatTime(stats.totalPlayTime)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Play Time</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e67e22' }}>
                      {stats.averageSpeed.toFixed(0)} mph
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Average Speed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          {activeSection === 'info' && (
            <div style={{ padding: '20px' }}>
              {/* How It Works */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#002B4D' }}>🚗 How Drive Mode Works</h4>
                
                <ol style={{ paddingLeft: '20px', fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                  <li><strong>System Activation:</strong> Automatically turns on at your set speed threshold (default 25+ mph) and turns off after stopping</li>
                  <li><strong>Location Monitoring:</strong> Continuously tracks GPS location while Drive Mode is active</li>
                  <li><strong>Content Triggering:</strong> 
                    <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                      <li><strong>Fixed Distance:</strong> Plays drivecards when you're within a set radius</li>
                      <li><strong>Predictive Timing:</strong> Calculates your speed and starts content ahead of time for perfect timing</li>
                    </ul>
                  </li>
                  <li><strong>Category Filtering:</strong> Excludes unwanted content categories from playback</li>
                  <li><strong>Audio-only Playback:</strong> Extracts audio from video for safe hands-free driving</li>
                  <li><strong>Queue Management:</strong> Handles multiple nearby drivecards automatically</li>
                  <li><strong>Safety Features:</strong> Auto-disables when you stop driving for extended periods</li>
                </ol>
              </div>

              {/* Creating Content */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#002B4D' }}>🎵 Creating Drive Mode Content</h4>
                
                <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                  <p>To create content that works with Drive Mode:</p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>Use the Vostcard Studio to create audio-based Drivecards</li>
                    <li>Set specific locations where the content should trigger</li>
                    <li>Content will automatically play when drivers approach the location</li>
                    <li>Perfect for location-based tours, local information, or audio guides</li>
                  </ul>
                </div>
              </div>

              {/* Safety & Legal */}
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#856404' }}>⚠️ Safety & Legal Notice</h4>
                
                <div style={{ fontSize: '14px', color: '#856404', lineHeight: '1.6' }}>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>Always prioritize safety:</strong> Pull over if you need to interact with the app</li>
                    <li><strong>Hands-free use:</strong> Drive Mode is designed for audio-only, hands-free operation</li>
                    <li><strong>Follow local laws:</strong> Some jurisdictions may have restrictions on device use while driving</li>
                    <li><strong>Use responsibly:</strong> Don't let audio content distract from safe driving</li>
                    <li><strong>Location data:</strong> Drive Mode uses GPS for location-based triggers</li>
                  </ul>
                </div>
              </div>

              {/* Technical Features */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#002B4D' }}>⚡ Technical Features</h4>
                
                <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>🎵 Audio extraction from video files</li>
                    <li>📍 Real-time GPS tracking and speed calculation</li>
                    <li>🧠 Predictive triggering based on speed and customizable lead time</li>
                    <li>🔲 Efficient geofencing with Firebase queries</li>
                    <li>⚡ Background location services</li>
                    <li>🔊 Automatic volume adjustment for safety</li>
                    <li>📊 Statistics tracking (triggers, play time, average speed)</li>
                    <li>🔄 Queue management for multiple nearby content</li>
                    <li>💾 Offline capability for downloaded content</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriveModeSettingsView; 