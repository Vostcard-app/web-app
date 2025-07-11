export interface KenBurnsConfig {
  videoDuration: number;
  photo1Start: number;
  photo2Start: number;
  photoDisplayDuration: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  scaleRange: { min: number; max: number };
  frameRate: number;
}

export interface KenBurnsPhoto {
  src: string;
  width: number;
  height: number;
  scale: number;
  panX: number;
  panY: number;
  image: HTMLImageElement;
}

export class KenBurnsProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: KenBurnsConfig;
  private photos: KenBurnsPhoto[] = [];
  private video: HTMLVideoElement | null = null;
  private isProcessing = false;

  constructor(canvas: HTMLCanvasElement, config: KenBurnsConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
  }

  async processKenBurns(
    videoUrl: string,
    photoUrls: string[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    this.isProcessing = true;
    
    try {
      console.log('🎬 Starting Ken Burns processing...');
      console.log('📹 Video URL:', videoUrl);
      console.log('🖼️ Photo URLs:', photoUrls);
      
      // Load video and photos
      await this.loadVideo(videoUrl);
      console.log('✅ Video loaded');
      
      await this.loadPhotos(photoUrls);
      console.log('✅ Photos loaded:', this.photos.length);
      
      // Setup canvas
      this.setupCanvas();
      console.log('✅ Canvas setup complete');
      
      // Export as video with real-time rendering
      return await this.exportVideoRealTime(onProgress);
      
    } finally {
      this.isProcessing = false;
    }
  }

  private async loadVideo(videoUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.video = document.createElement('video');
      this.video.crossOrigin = 'anonymous';
      this.video.muted = false; // Keep audio enabled
      this.video.volume = 1.0;
      
      this.video.onloadedmetadata = () => {
        if (this.video!.duration < this.config.videoDuration - 1 || 
            this.video!.duration > this.config.videoDuration + 1) {
          reject(new Error('Video must be 29-31 seconds long'));
        }
        resolve();
      };
      
      this.video.onerror = () => reject(new Error('Failed to load video'));
      this.video.src = videoUrl;
    });
  }

  private async loadPhotos(photoUrls: string[]): Promise<void> {
    const loadPromises = photoUrls.slice(0, 2).map(async (url, index) => {
      return new Promise<KenBurnsPhoto>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const photo: KenBurnsPhoto = {
            src: url,
            width: img.width,
            height: img.height,
            scale: 1.0,
            panX: 0,
            panY: 0,
            image: img
          };
          
          // Calculate Ken Burns parameters
          this.calculateKenBurnsParams(photo);
          resolve(photo);
        };
        
        img.onerror = () => reject(new Error(`Failed to load photo ${index + 1}`));
        img.src = url;
      });
    });

    this.photos = await Promise.all(loadPromises);
  }

  private calculateKenBurnsParams(photo: KenBurnsPhoto): void {
    // Random pan direction (-1 to 1)
    photo.panX = (Math.random() - 0.5) * 2;
    photo.panY = (Math.random() - 0.5) * 2;
    photo.scale = this.config.scaleRange.min;
  }

  private setupCanvas(): void {
    this.canvas.width = 1080;
    this.canvas.height = 1920; // Portrait orientation
  }

  private async generateFrames(onProgress?: (progress: number) => void): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const totalFrames = this.config.videoDuration * this.config.frameRate;
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const time = frameIndex / this.config.frameRate;
      
      // Render frame
      await this.renderFrame(time);
      
      // Capture frame
      const frameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      frames.push(frameData);
      
      // Update progress
      if (onProgress) {
        onProgress((frameIndex / totalFrames) * 100);
      }
    }
    
    return frames;
  }

  private async renderFrame(time: number): Promise<void> {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render video frame
    if (this.video && time < this.video.duration) {
      this.video.currentTime = time;
      await this.waitForVideoSeek();
      
      this.ctx.drawImage(
        this.video,
        0, 0, this.canvas.width, this.canvas.height
      );
    }
    
    // Render photos with Ken Burns effect
    this.renderPhotos(time);
  }

  private async waitForVideoSeek(): Promise<void> {
    return new Promise((resolve) => {
      const checkSeek = () => {
        if (!this.video!.seeking) {
          resolve();
        } else {
          requestAnimationFrame(checkSeek);
        }
      };
      checkSeek();
    });
  }

  private renderPhotos(time: number): void {
    this.photos.forEach((photo, index) => {
      const photoStart = index === 0 ? this.config.photo1Start : this.config.photo2Start;
      const photoEnd = photoStart + this.config.photoDisplayDuration;
      
      if (time >= photoStart && time <= photoEnd) {
        const progress = (time - photoStart) / this.config.photoDisplayDuration;
        const opacity = this.calculateOpacity(time, photoStart, photoEnd);
        
        console.log(`🎬 Rendering photo ${index + 1} at time ${time.toFixed(2)}s, opacity: ${opacity.toFixed(2)}, progress: ${progress.toFixed(2)}`);
        
        if (opacity > 0) {
          this.renderPhotoWithKenBurns(photo, progress, opacity);
        }
      }
    });
  }

  private calculateOpacity(time: number, start: number, end: number): number {
    const fadeInEnd = start + this.config.fadeInDuration / 1000;
    const fadeOutStart = end - this.config.fadeOutDuration / 1000;
    
    if (time < fadeInEnd) {
      return (time - start) / (this.config.fadeInDuration / 1000);
    } else if (time > fadeOutStart) {
      return (end - time) / (this.config.fadeOutDuration / 1000);
    }
    
    return 1.0;
  }

  private renderPhotoWithKenBurns(photo: KenBurnsPhoto, progress: number, opacity: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    // Calculate Ken Burns animation
    const scale = this.config.scaleRange.min + 
      (this.config.scaleRange.max - this.config.scaleRange.min) * progress;
    
    // Calculate center position
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Calculate pan offset (much smaller values for subtle movement)
    const panOffsetX = photo.panX * 50 * (1 - progress); // Max 50px movement
    const panOffsetY = photo.panY * 50 * (1 - progress); // Max 50px movement
    
    // Move to center + pan offset
    this.ctx.translate(centerX + panOffsetX, centerY + panOffsetY);
    this.ctx.scale(scale, scale);
    
    // Draw photo centered at origin
    this.ctx.drawImage(
      photo.image,
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );
    
    this.ctx.restore();
  }

  private async exportVideoRealTime(onProgress?: (progress: number) => void): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🎬 Starting video export...');
        
        // For now, just return the original video to test the flow
        // TODO: Implement proper Ken Burns rendering
        if (this.video) {
          // Convert video element to blob
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = this.video.videoWidth || 1080;
          canvas.height = this.video.videoHeight || 1920;
          
          // Draw a test frame with photo overlay
          ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
          
          // Draw first photo as overlay for testing
          if (this.photos.length > 0) {
            ctx.globalAlpha = 0.7;
            ctx.drawImage(
              this.photos[0].image,
              100, 100, 
              canvas.width - 200, 
              canvas.height - 200
            );
          }
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              console.log('✅ Test video created with photo overlay');
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', 0.9);
        } else {
          reject(new Error('No video loaded'));
        }
        
      } catch (error) {
        console.error('❌ Export error:', error);
        reject(error);
      }
    });
  }
  
  private async renderFramesForRecording(): Promise<void> {
    const totalFrames = this.config.videoDuration * this.config.frameRate;
    const frameInterval = 1000 / this.config.frameRate;
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const time = frameIndex / this.config.frameRate;
      
      // Render frame directly to canvas
      await this.renderFrame(time);
      
      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, frameInterval));
    }
  }

  public stop(): void {
    this.isProcessing = false;
  }
} 