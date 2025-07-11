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
      // Load video and photos
      await this.loadVideo(videoUrl);
      await this.loadPhotos(photoUrls);
      
      // Setup canvas
      this.setupCanvas();
      
      // Process frames
      const frames = await this.generateFrames(onProgress);
      
      // Export as video
      return await this.exportVideo(frames);
      
    } finally {
      this.isProcessing = false;
    }
  }

  private async loadVideo(videoUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.video = document.createElement('video');
      this.video.crossOrigin = 'anonymous';
      this.video.muted = true;
      
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
    // Random starting position (corner)
    const corners = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ];
    
    const startCorner = corners[Math.floor(Math.random() * corners.length)];
    const endCorner = corners[Math.floor(Math.random() * corners.length)];
    
    photo.panX = startCorner.x;
    photo.panY = startCorner.y;
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
    
    const panX = photo.panX * (1 - progress);
    const panY = photo.panY * (1 - progress);
    
    // Apply transformations
    this.ctx.translate(
      this.canvas.width * panX * 0.2,
      this.canvas.height * panY * 0.2
    );
    this.ctx.scale(scale, scale);
    
    // Draw photo using the preloaded image
    this.ctx.drawImage(
      photo.image,
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );
    
    this.ctx.restore();
  }

  private async exportVideo(frames: ImageData[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const stream = this.canvas.captureStream(this.config.frameRate);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = (event) => {
        reject(new Error('MediaRecorder error'));
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Play back all frames
      this.playbackFrames(frames).then(() => {
        mediaRecorder.stop();
      }).catch(reject);
    });
  }
  
  private async playbackFrames(frames: ImageData[]): Promise<void> {
    const frameInterval = 1000 / this.config.frameRate;
    
    for (let i = 0; i < frames.length; i++) {
      // Draw frame to canvas
      this.ctx.putImageData(frames[i], 0, 0);
      
      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, frameInterval));
    }
  }

  public stop(): void {
    this.isProcessing = false;
  }
} 