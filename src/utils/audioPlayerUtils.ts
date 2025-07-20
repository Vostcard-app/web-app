// Audio Player Utils - Extract and play audio from video vostcards for Drive Mode
import type { Vostcard } from '../types/VostcardTypes';

export interface AudioPlaybackOptions {
  volume?: number; // 0.0 to 1.0, default 0.8 for driving safety
  autoplay?: boolean; // Default true for Drive Mode triggers
  preload?: 'none' | 'metadata' | 'auto'; // Default 'metadata'
  loop?: boolean; // Default false
  crossOrigin?: 'anonymous' | 'use-credentials'; // For Firebase URLs
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  buffered: number; // Percentage buffered (0-1)
}

export interface AudioPlaybackEvents {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onVolumeChange?: (volume: number) => void;
  onProgress?: (bufferedPercentage: number) => void;
}

export class AudioPlayerUtils {
  private static activeAudioElements: Map<string, HTMLAudioElement> = new Map();
  private static globalVolume: number = 0.8; // Default volume for driving safety

  /**
   * Extract and play audio from a vostcard
   */
  static async playVostcardAudio(
    vostcard: Vostcard,
    options: AudioPlaybackOptions = {},
    events: AudioPlaybackEvents = {}
  ): Promise<HTMLAudioElement> {
    try {
      // Get audio source from vostcard
      const audioSrc = await this.extractAudioSource(vostcard);
      if (!audioSrc) {
        throw new Error('No audio source available for playback');
      }

      // Stop any existing audio for this vostcard
      await this.stopVostcardAudio(vostcard.id);

      // Create and configure audio element
      const audioElement = new Audio();
      this.configureAudioElement(audioElement, audioSrc, options, events);

      // Store reference for management
      this.activeAudioElements.set(vostcard.id, audioElement);

      // Attempt to play
      await audioElement.play();

      console.log(`🔊 Started audio playback for vostcard: "${vostcard.title}"`);
      return audioElement;

    } catch (error) {
      console.error('Failed to play vostcard audio:', error);
      throw error;
    }
  }

  /**
   * Extract audio source URL from vostcard
   */
  private static async extractAudioSource(vostcard: Vostcard): Promise<string | null> {
    // Priority 1: Firebase video URL (for public vostcards)
    if (vostcard._firebaseVideoURL) {
      console.log('🔊 Using Firebase video URL for audio extraction');
      return vostcard._firebaseVideoURL;
    }

    // Priority 2: Local video blob (for private vostcards)
    if (vostcard.video && vostcard.video instanceof Blob) {
      console.log('🔊 Creating object URL from local video blob');
      return URL.createObjectURL(vostcard.video);
    }

    // Priority 3: Base64 video data (from IndexedDB)
    if (vostcard._videoBase64) {
      console.log('🔊 Converting base64 video to blob for audio');
      const videoBlob = this.base64ToBlob(vostcard._videoBase64);
      return URL.createObjectURL(videoBlob);
    }

    return null;
  }

  /**
   * Configure audio element with options and event listeners
   */
  private static configureAudioElement(
    audioElement: HTMLAudioElement,
    src: string,
    options: AudioPlaybackOptions,
    events: AudioPlaybackEvents
  ): void {
    // Set audio source
    audioElement.src = src;

    // Apply options
    audioElement.volume = options.volume ?? this.globalVolume;
    audioElement.preload = options.preload ?? 'metadata';
    audioElement.loop = options.loop ?? false;
    
    if (options.crossOrigin) {
      audioElement.crossOrigin = options.crossOrigin;
    }

    // Add event listeners
    if (events.onPlay) audioElement.addEventListener('play', events.onPlay);
    if (events.onPause) audioElement.addEventListener('pause', events.onPause);
    if (events.onEnded) audioElement.addEventListener('ended', events.onEnded);
    if (events.onLoadStart) audioElement.addEventListener('loadstart', events.onLoadStart);
    if (events.onCanPlay) audioElement.addEventListener('canplay', events.onCanPlay);

    if (events.onError) {
      audioElement.addEventListener('error', () => {
        const error = new Error(`Audio playback error: ${audioElement.error?.message || 'Unknown error'}`);
        events.onError!(error);
      });
    }

    if (events.onTimeUpdate) {
      audioElement.addEventListener('timeupdate', () => {
        events.onTimeUpdate!(audioElement.currentTime, audioElement.duration || 0);
      });
    }

    if (events.onVolumeChange) {
      audioElement.addEventListener('volumechange', () => {
        events.onVolumeChange!(audioElement.volume);
      });
    }

    if (events.onProgress) {
      audioElement.addEventListener('progress', () => {
        if (audioElement.buffered.length > 0) {
          const bufferedPercentage = audioElement.buffered.end(0) / (audioElement.duration || 1);
          events.onProgress!(bufferedPercentage);
        }
      });
    }

    // Drive Mode specific optimizations
    audioElement.controls = false; // Hide browser controls
    audioElement.muted = false;
    
    console.log('🔊 Audio element configured for Drive Mode playback');
  }

  /**
   * Stop audio playback for a specific vostcard
   */
  static async stopVostcardAudio(vostcardId: string): Promise<void> {
    const audioElement = this.activeAudioElements.get(vostcardId);
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;

      // Clean up object URL if it was created
      if (audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioElement.src);
      }

      // Remove event listeners
      this.removeAllEventListeners(audioElement);

      this.activeAudioElements.delete(vostcardId);
      console.log(`🔊 Stopped audio for vostcard: ${vostcardId}`);
    }
  }

  /**
   * Stop all active audio playback
   */
  static async stopAllAudio(): Promise<void> {
    const promises = Array.from(this.activeAudioElements.keys()).map(id => this.stopVostcardAudio(id));
    await Promise.all(promises);
    console.log('🔊 Stopped all audio playback');
  }

  /**
   * Pause audio for a specific vostcard
   */
  static pauseVostcardAudio(vostcardId: string): void {
    const audioElement = this.activeAudioElements.get(vostcardId);
    if (audioElement) {
      audioElement.pause();
      console.log(`🔊 Paused audio for vostcard: ${vostcardId}`);
    }
  }

  /**
   * Resume audio for a specific vostcard
   */
  static async resumeVostcardAudio(vostcardId: string): Promise<void> {
    const audioElement = this.activeAudioElements.get(vostcardId);
    if (audioElement) {
      await audioElement.play();
      console.log(`🔊 Resumed audio for vostcard: ${vostcardId}`);
    }
  }

  /**
   * Set volume for a specific vostcard
   */
  static setVostcardVolume(vostcardId: string, volume: number): void {
    const audioElement = this.activeAudioElements.get(vostcardId);
    if (audioElement) {
      audioElement.volume = Math.max(0, Math.min(1, volume));
      console.log(`🔊 Set volume to ${volume} for vostcard: ${vostcardId}`);
    }
  }

  /**
   * Set global volume for all audio (Drive Mode default)
   */
  static setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    
    // Update all active audio elements
    this.activeAudioElements.forEach((audioElement, vostcardId) => {
      audioElement.volume = this.globalVolume;
    });
    
    console.log(`🔊 Set global audio volume to ${volume}`);
  }

  /**
   * Get playback state for a vostcard
   */
  static getPlaybackState(vostcardId: string): AudioPlaybackState | null {
    const audioElement = this.activeAudioElements.get(vostcardId);
    if (!audioElement) return null;

    const bufferedPercentage = audioElement.buffered.length > 0 
      ? audioElement.buffered.end(0) / (audioElement.duration || 1)
      : 0;

    return {
      isPlaying: !audioElement.paused && !audioElement.ended,
      isPaused: audioElement.paused,
      currentTime: audioElement.currentTime,
      duration: audioElement.duration || 0,
      volume: audioElement.volume,
      playbackRate: audioElement.playbackRate,
      buffered: bufferedPercentage
    };
  }

  /**
   * Get all active audio vostcard IDs
   */
  static getActiveAudioIds(): string[] {
    return Array.from(this.activeAudioElements.keys());
  }

  /**
   * Check if any audio is currently playing
   */
  static isAnyAudioPlaying(): boolean {
    for (const audioElement of this.activeAudioElements.values()) {
      if (!audioElement.paused && !audioElement.ended) {
        return true;
      }
    }
    return false;
  }

  /**
   * Seek to specific time in audio
   */
  static seekToTime(vostcardId: string, timeInSeconds: number): void {
    const audioElement = this.activeAudioElements.get(vostcardId);
    if (audioElement && audioElement.duration) {
      audioElement.currentTime = Math.max(0, Math.min(timeInSeconds, audioElement.duration));
      console.log(`🔊 Seeked to ${timeInSeconds}s for vostcard: ${vostcardId}`);
    }
  }

  /**
   * Set playback rate (speed) for audio
   */
  static setPlaybackRate(vostcardId: string, rate: number): void {
    const audioElement = this.activeAudioElements.get(vostcardId);
    if (audioElement) {
      // Reasonable range for drive mode: 0.75x to 1.25x
      audioElement.playbackRate = Math.max(0.5, Math.min(2.0, rate));
      console.log(`🔊 Set playback rate to ${rate}x for vostcard: ${vostcardId}`);
    }
  }

  /**
   * Preload audio for faster playback
   */
  static async preloadVostcardAudio(vostcard: Vostcard): Promise<HTMLAudioElement | null> {
    try {
      const audioSrc = await this.extractAudioSource(vostcard);
      if (!audioSrc) return null;

      const audioElement = new Audio();
      audioElement.src = audioSrc;
      audioElement.preload = 'metadata';
      audioElement.volume = 0; // Silent preload

      // Wait for metadata to load
      return new Promise((resolve, reject) => {
        audioElement.addEventListener('loadedmetadata', () => {
          resolve(audioElement);
        });
        
        audioElement.addEventListener('error', () => {
          reject(new Error('Failed to preload audio'));
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Audio preload timeout'));
        }, 10000);
      });

    } catch (error) {
      console.error('Failed to preload vostcard audio:', error);
      return null;
    }
  }

  /**
   * Get audio duration without playing
   */
  static async getAudioDuration(vostcard: Vostcard): Promise<number | null> {
    try {
      const preloadedAudio = await this.preloadVostcardAudio(vostcard);
      const duration = preloadedAudio?.duration || null;
      
      // Clean up preloaded audio
      if (preloadedAudio?.src.startsWith('blob:')) {
        URL.revokeObjectURL(preloadedAudio.src);
      }
      
      return duration;
    } catch (error) {
      console.error('Failed to get audio duration:', error);
      return null;
    }
  }

  /**
   * Remove all event listeners from audio element
   */
  private static removeAllEventListeners(audioElement: HTMLAudioElement): void {
    const events = ['play', 'pause', 'ended', 'error', 'loadstart', 'canplay', 'timeupdate', 'volumechange', 'progress'];
    events.forEach(event => {
      audioElement.removeEventListener(event, () => {});
    });
  }

  /**
   * Convert base64 to blob
   */
  private static base64ToBlob(base64: string, mimeType: string = 'video/mp4'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Validate audio playback capability
   */
  static checkAudioPlaybackSupport(): boolean {
    const audio = new Audio();
    return !!(audio.canPlayType && (
      audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') ||
      audio.canPlayType('audio/mpeg') ||
      audio.canPlayType('audio/ogg; codecs="vorbis"')
    ));
  }

  /**
   * Get global volume setting
   */
  static getGlobalVolume(): number {
    return this.globalVolume;
  }
} 