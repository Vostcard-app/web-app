// Drive Mode Context - Manages auto-triggering of vostcards during driving
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import type { Vostcard } from '../types/VostcardTypes';

export interface DriveModeSettings {
  isEnabled: boolean;
  autoEnableSpeed: number; // mph - automatically enable drive mode at this speed
  triggerDistance: number; // miles - trigger vostcards within this distance
  autoDisableAfterStop: number; // minutes - disable after being stopped this long
  allowManualOverride: boolean;
  excludedCategories?: string[]; // categories to exclude from Drive Mode playback
  usePredictiveTrigger: boolean; // use speed-based predictive triggering instead of fixed distance
  predictiveLeadTime: number; // seconds - how many seconds before arrival to trigger
}

interface CurrentPlayback {
  vostcard: Vostcard;
  audioElement: HTMLAudioElement;
  startTime: Date;
  triggeredByLocation: boolean;
}

interface DriveModeContextProps {
  // Drive mode state
  isDriveModeEnabled: boolean;
  isAutoEnabled: boolean;
  currentSpeed: number; // mph
  settings: DriveModeSettings;
  
  // Playback state
  currentPlayback: CurrentPlayback | null;
  isPlaying: boolean;
  playbackQueue: Vostcard[];
  
  // Core controls
  enableDriveMode: (manual?: boolean) => void;
  disableDriveMode: () => void;
  updateSettings: (newSettings: Partial<DriveModeSettings>) => void;
  
  // Audio playback
  playVostcardAudio: (vostcard: Vostcard, triggeredByLocation?: boolean) => Promise<void>;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  skipToNext: () => void;
  
  // Location-based triggers
  checkNearbyVostcards: (userLocation: { latitude: number; longitude: number }) => Promise<Vostcard[]>;
  triggerNearbyVostcard: (vostcard: Vostcard) => void;
  
  // Speed monitoring
  updateSpeed: (speed: number) => void;
  
  // Statistics
  stats: {
    totalTriggered: number;
    totalPlayTime: number;
    averageSpeed: number;
  };
}

const DriveModeContext = createContext<DriveModeContextProps | undefined>(undefined);

// Default settings
const DEFAULT_SETTINGS: DriveModeSettings = {
  isEnabled: false,
  autoEnableSpeed: 25, // mph - enable when driving 25+ mph
  triggerDistance: 0.33, // 1/3 mile
  autoDisableAfterStop: 5, // minutes
  allowManualOverride: true,
  excludedCategories: [], // no categories excluded by default
  usePredictiveTrigger: false, // use fixed distance by default
  predictiveLeadTime: 30 // 30 seconds lead time when predictive mode is enabled
};

export const DriveModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // State management
  const [isDriveModeEnabled, setIsDriveModeEnabled] = useState(false);
  const [isAutoEnabled, setIsAutoEnabled] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [settings, setSettings] = useState<DriveModeSettings>(DEFAULT_SETTINGS);
  const [currentPlayback, setCurrentPlayback] = useState<CurrentPlayback | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<Vostcard[]>([]);
  const [stats, setStats] = useState({
    totalTriggered: 0,
    totalPlayTime: 0,
    averageSpeed: 0
  });
  
  // Refs for timers and tracking
  const stopTimer = useRef<NodeJS.Timeout | null>(null);
  const speedHistory = useRef<number[]>([]);
  const playbackStartTime = useRef<Date | null>(null);
  
  // Load user settings on mount
  useEffect(() => {
    if (user) {
      const savedSettings = localStorage.getItem(`driveMode_${user.uid}`);
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
    }
  }, [user]);
  
  // Save settings when they change
  const updateSettings = useCallback((newSettings: Partial<DriveModeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    if (user) {
      localStorage.setItem(`driveMode_${user.uid}`, JSON.stringify(updated));
    }
  }, [settings, user]);
  
  // Speed monitoring with auto-enable logic
  const updateSpeed = useCallback((speed: number) => {
    setCurrentSpeed(speed);
    
    // Track speed history for average calculation
    speedHistory.current.push(speed);
    if (speedHistory.current.length > 10) {
      speedHistory.current.shift();
    }
    
    // Auto-enable drive mode based on speed
    if (!isDriveModeEnabled && speed >= settings.autoEnableSpeed && settings.isEnabled) {
      console.log(`🚗 Auto-enabling Drive Mode at ${speed} mph (threshold: ${settings.autoEnableSpeed} mph)`);
      enableDriveMode(false);
    }
    
    // Auto-disable when stopped for too long
    if (isDriveModeEnabled && speed < 5) {
      if (!stopTimer.current) {
        stopTimer.current = setTimeout(() => {
          console.log(`🛑 Auto-disabling Drive Mode after ${settings.autoDisableAfterStop} minutes stopped`);
          disableDriveMode();
        }, settings.autoDisableAfterStop * 60 * 1000);
      }
    } else {
      // Clear stop timer if moving again
      if (stopTimer.current) {
        clearTimeout(stopTimer.current);
        stopTimer.current = null;
      }
    }
  }, [isDriveModeEnabled, settings]);
  
  // Enable drive mode
  const enableDriveMode = useCallback((manual: boolean = true) => {
    setIsDriveModeEnabled(true);
    setIsAutoEnabled(!manual);
    
    // Clear any pending disable timer
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    
    console.log(`🚗 Drive Mode ${manual ? 'manually' : 'automatically'} enabled`);
  }, []);
  
  // Disable drive mode
  const disableDriveMode = useCallback(() => {
    setIsDriveModeEnabled(false);
    setIsAutoEnabled(false);
    
    // Stop any current playback
    if (currentPlayback) {
      stopPlayback();
    }
    
    // Clear stop timer
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    
    console.log('🛑 Drive Mode disabled');
  }, [currentPlayback]);
  
  // Extract and play audio from video vostcard
  const playVostcardAudio = useCallback(async (vostcard: Vostcard, triggeredByLocation: boolean = false) => {
    if (!isDriveModeEnabled) return;
    
    try {
      // Stop any current playback
      if (currentPlayback) {
        stopPlayback();
      }
      
      let audioSrc = '';
      
      // Get audio source from video
      if (vostcard.video && vostcard.video instanceof Blob) {
        // Create object URL for local video
        audioSrc = URL.createObjectURL(vostcard.video);
      } else if (vostcard._firebaseVideoURL) {
        // Use Firebase video URL
        audioSrc = vostcard._firebaseVideoURL;
      } else {
        console.warn('No video source available for audio playback');
        return;
      }
      
      // Create audio element
      const audioElement = new Audio(audioSrc);
      audioElement.volume = 0.8; // Slightly lower volume for driving safety
      
      // Set up playback tracking
      const playback: CurrentPlayback = {
        vostcard,
        audioElement,
        startTime: new Date(),
        triggeredByLocation
      };
      
      setCurrentPlayback(playback);
      playbackStartTime.current = new Date();
      
      // Play audio
      await audioElement.play();
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalTriggered: prev.totalTriggered + 1
      }));
      
      // Handle playback end
      audioElement.onended = () => {
        const playTime = playbackStartTime.current 
          ? (new Date().getTime() - playbackStartTime.current.getTime()) / 1000 
          : 0;
        
        setStats(prev => ({
          ...prev,
          totalPlayTime: prev.totalPlayTime + playTime
        }));
        
        // Auto-play next in queue
        skipToNext();
      };
      
      console.log(`🔊 Playing ${triggeredByLocation ? 'auto-triggered' : 'manual'} vostcard: "${vostcard.title}"`);
      
    } catch (error) {
      console.error('Failed to play vostcard audio:', error);
    }
  }, [isDriveModeEnabled, currentPlayback]);
  
  // Playback controls
  const pausePlayback = useCallback(() => {
    if (currentPlayback?.audioElement) {
      currentPlayback.audioElement.pause();
    }
  }, [currentPlayback]);
  
  const resumePlayback = useCallback(() => {
    if (currentPlayback?.audioElement) {
      currentPlayback.audioElement.play();
    }
  }, [currentPlayback]);
  
  const stopPlayback = useCallback(() => {
    if (currentPlayback?.audioElement) {
      currentPlayback.audioElement.pause();
      currentPlayback.audioElement.currentTime = 0;
      
      // Clean up object URL if it was created
      if (currentPlayback.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentPlayback.audioElement.src);
      }
    }
    
    setCurrentPlayback(null);
    playbackStartTime.current = null;
  }, [currentPlayback]);
  
  const skipToNext = useCallback(() => {
    if (playbackQueue.length > 0) {
      const nextVostcard = playbackQueue[0];
      setPlaybackQueue(prev => prev.slice(1));
      playVostcardAudio(nextVostcard, false);
    } else {
      stopPlayback();
    }
  }, [playbackQueue, playVostcardAudio, stopPlayback]);
  
  // Check for nearby vostcards with Drive Mode category
  const checkNearbyVostcards = useCallback(async (userLocation: { latitude: number; longitude: number }): Promise<Vostcard[]> => {
    // This would typically query Firebase for nearby vostcards
    // For now, we'll return an empty array as placeholder
    // In real implementation, this would:
    // 1. Query Firebase for vostcards within 1/3 mile radius
    // 2. Filter for vostcards with "Drive Mode" category
    // 3. Exclude already-played vostcards in recent history
    
    console.log(`🔍 Checking for Drive Mode vostcards near ${userLocation.latitude}, ${userLocation.longitude}`);
    return [];
  }, []);
  
  // Trigger a nearby vostcard
  const triggerNearbyVostcard = useCallback((vostcard: Vostcard) => {
    // Add to queue if something is already playing
    if (currentPlayback) {
      setPlaybackQueue(prev => [...prev, vostcard]);
      console.log(`📋 Added "${vostcard.title}" to Drive Mode queue`);
    } else {
      playVostcardAudio(vostcard, true);
    }
  }, [currentPlayback, playVostcardAudio]);
  
  // Calculate average speed for stats
  const averageSpeed = speedHistory.current.length > 0 
    ? speedHistory.current.reduce((sum, speed) => sum + speed, 0) / speedHistory.current.length 
    : 0;
  
  // Update stats with current average speed
  useEffect(() => {
    setStats(prev => ({ ...prev, averageSpeed }));
  }, [averageSpeed]);
  
  const value = {
    // Drive mode state
    isDriveModeEnabled,
    isAutoEnabled,
    currentSpeed,
    settings,
    
    // Playback state
    currentPlayback,
    isPlaying: !!currentPlayback?.audioElement && !currentPlayback.audioElement.paused,
    playbackQueue,
    
    // Core controls
    enableDriveMode,
    disableDriveMode,
    updateSettings,
    
    // Audio playback
    playVostcardAudio,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    skipToNext,
    
    // Location-based triggers
    checkNearbyVostcards,
    triggerNearbyVostcard,
    
    // Speed monitoring
    updateSpeed,
    
    // Statistics
    stats
  };
  
  return (
    <DriveModeContext.Provider value={value}>
      {children}
    </DriveModeContext.Provider>
  );
};

export const useDriveMode = () => {
  const context = useContext(DriveModeContext);
  if (!context) {
    throw new Error('useDriveMode must be used within a DriveModeProvider');
  }
  return context;
}; 