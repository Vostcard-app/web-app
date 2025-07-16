import React, { useRef, useEffect, useState } from 'react';
import { KenBurnsProcessor } from './KenBurnsProcessor';
import type { KenBurnsConfig } from './KenBurnsProcessor';

interface KenBurnsCanvasProps {
  videoUrl: string;
  photoUrls: string[];
  isProcessing: boolean;
  onProgress: (progress: number) => void;
  onComplete: (blob: Blob) => void;
  onError: (error: string) => void;
}

const KenBurnsCanvas: React.FC<KenBurnsCanvasProps> = ({
  videoUrl,
  photoUrls,
  isProcessing,
  onProgress,
  onComplete,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);
  const [loadedVideo, setLoadedVideo] = useState<HTMLVideoElement | null>(null);

  // Load images and video when component mounts
  useEffect(() => {
    const loadMedia = async () => {
      try {
        // Load images
        const imagePromises = photoUrls.slice(0, 2).map((url) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
          });
        });

        const images = await Promise.all(imagePromises);
        setLoadedImages(images);

        // Load video
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = false; // Keep audio
        video.volume = 1.0;
        
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('Failed to load video'));
          video.src = videoUrl;
        });

        setLoadedVideo(video);
        setIsReady(true);
        console.log('✅ Media loaded successfully');
      } catch (error) {
        console.error('❌ Error loading media:', error);
        onError(error instanceof Error ? error.message : 'Failed to load media');
      }
    };

    loadMedia();
  }, [videoUrl, photoUrls, onError]);

  // Process Ken Burns effect when processing starts
  useEffect(() => {
    if (isProcessing && isReady && canvasRef.current && loadedVideo && loadedImages.length > 0) {
      processKenBurnsEffect();
    }
  }, [isProcessing, isReady, loadedVideo, loadedImages]);

  const processKenBurnsEffect = async () => {
    if (!canvasRef.current || !loadedVideo || loadedImages.length === 0) {
      onError('Canvas, video, or images not ready');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onError('Unable to get canvas context');
      return;
    }

    // Set canvas size
    canvas.width = 1080;
    canvas.height = 1920; // Portrait orientation

    try {
      console.log('🎬 Starting Ken Burns effect processing...');
      
      // Setup MediaRecorder for capturing canvas stream
      const stream = canvas.captureStream(30); // 30 FPS
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log('✅ Ken Burns processing complete:', {
          blob,
          size: blob.size,
          type: blob.type
        });
        onComplete(blob);
      };

      mediaRecorderRef.current.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error);
        onError('Recording failed');
      };

      // Start recording
      mediaRecorderRef.current.start();

      // Animate for 30 seconds (Ken Burns effect)
      const duration = 30; // seconds
      const fps = 30;
      const totalFrames = duration * fps;
      
      let currentFrame = 0;
      const animate = () => {
        if (currentFrame >= totalFrames) {
          // Stop recording
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          return;
        }

        const progress = currentFrame / totalFrames;
        const time = currentFrame / fps;
        
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        if (loadedVideo && time < loadedVideo.duration) {
          loadedVideo.currentTime = time;
          ctx.drawImage(loadedVideo, 0, 0, canvas.width, canvas.height);
        }

        // Draw photos with Ken Burns effect
        drawKenBurnsPhotos(ctx, time, canvas.width, canvas.height);

        // Update progress
        onProgress((progress * 100));

        currentFrame++;
        requestAnimationFrame(animate);
      };

      animate();

    } catch (error) {
      console.error('❌ Ken Burns processing error:', error);
      onError(error instanceof Error ? error.message : 'Processing failed');
    }
  };

  const drawKenBurnsPhotos = (ctx: CanvasRenderingContext2D, time: number, canvasWidth: number, canvasHeight: number) => {
    // Configuration for Ken Burns effect
    const photo1Start = 5; // seconds
    const photo2Start = 20; // seconds
    const photoDisplayDuration = 5; // seconds
    const fadeInDuration = 0.5; // seconds
    const fadeOutDuration = 0.5; // seconds

    loadedImages.forEach((img, index) => {
      const photoStart = index === 0 ? photo1Start : photo2Start;
      const photoEnd = photoStart + photoDisplayDuration;

      if (time >= photoStart && time <= photoEnd) {
        const progress = (time - photoStart) / photoDisplayDuration;
        const opacity = calculateOpacity(time, photoStart, photoEnd, fadeInDuration, fadeOutDuration);

        if (opacity > 0) {
          ctx.save();
          ctx.globalAlpha = opacity;

          // Ken Burns effect: zoom and pan
          const scale = 1.0 + (0.5 * progress); // Zoom from 1.0 to 1.5
          const panX = (Math.random() - 0.5) * 100 * (1 - progress); // Pan movement
          const panY = (Math.random() - 0.5) * 100 * (1 - progress);

          // Center the transformation
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;

          ctx.translate(centerX + panX, centerY + panY);
          ctx.scale(scale, scale);

          // Draw image centered
          ctx.drawImage(
            img,
            -canvasWidth / 2,
            -canvasHeight / 2,
            canvasWidth,
            canvasHeight
          );

          ctx.restore();
        }
      }
    });
  };

  const calculateOpacity = (time: number, start: number, end: number, fadeInDuration: number, fadeOutDuration: number): number => {
    const fadeInEnd = start + fadeInDuration;
    const fadeOutStart = end - fadeOutDuration;

    if (time < fadeInEnd) {
      return (time - start) / fadeInDuration;
    } else if (time > fadeOutStart) {
      return (end - time) / fadeOutDuration;
    }

    return 1.0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Revoke object URLs
      if (loadedVideo) {
        URL.revokeObjectURL(loadedVideo.src);
      }
    };
  }, [loadedVideo]);

  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          border: '1px solid #ccc',
          borderRadius: '8px',
          display: isProcessing ? 'block' : 'none'
        }}
      />
      {!isProcessing && (
        <div style={{
          textAlign: 'center',
          color: '#666',
          fontSize: '16px'
        }}>
          {isReady ? 'Ready to process Ken Burns effect' : 'Loading media...'}
        </div>
      )}
    </div>
  );
};

export default KenBurnsCanvas;