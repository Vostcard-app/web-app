import React, { useEffect, useRef } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

interface KenBurnsCanvasProps {
  videoUrl: string;
  photoUrls: string[];
  isProcessing: boolean;
  onProgress: (progress: number) => void;
  onComplete: (blob: Blob) => void;
  onError: (message: string) => void;
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

  useEffect(() => {
    if (!isProcessing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      onError('Canvas not supported');
      return;
    }

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    const fps = 30;
    const duration = 30; // 30 seconds total
    const totalFrames = fps * duration;

    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    const images: HTMLImageElement[] = [];
    let frame = 0;

    const loadResources = async () => {
      try {
        console.log('🎬 Loading video and images for Ken Burns effect...');
        
        // Load video
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.currentTime = 0;
            resolve();
          };
          video.onerror = reject;
          video.load();
        });

        // Load images
        for (const url of photoUrls.slice(0, 2)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = url;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
          });
          images.push(img);
        }

        console.log('✅ Video and images loaded successfully');
        startRecording();
      } catch (err) {
        console.error('❌ Failed to load video or images:', err);
        onError('Failed to load video or images');
      }
    };

    const startRecording = () => {
      try {
        console.log('🎥 Starting canvas recording...');
        
        const stream = canvas.captureStream(fps);
        mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'video/webm;codecs=vp9,opus' 
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('📹 Recording stopped, creating WebM blob...');
          const webmBlob = new Blob(chunks, { type: 'video/webm' });
          
          try {
            console.log('🔄 Converting WebM to MP4...');
            const mp4Blob = await convertWebMtoMP4(webmBlob);
            console.log('✅ MP4 conversion complete');
            onComplete(mp4Blob);
          } catch (err) {
            console.error('❌ Failed to convert WebM to MP4:', err);
            onError('Failed to convert WebM to MP4');
          }
        };

        mediaRecorder.start();
        requestAnimationFrame(draw);
      } catch (err) {
        console.error('❌ Failed to start recording:', err);
        onError('Failed to start recording');
      }
    };

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate current time
      const currentTime = frame / fps;
      
      // Set video time and draw video frame
      video.currentTime = Math.min(currentTime, video.duration - 0.1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw photo overlays with Ken Burns effect
      if (currentTime >= 5 && currentTime < 10 && images[0]) {
        drawPhoto(ctx, images[0], currentTime - 5, 5);
      }
      if (currentTime >= 20 && currentTime < 25 && images[1]) {
        drawPhoto(ctx, images[1], currentTime - 20, 5);
      }

      // Update progress
      const progress = Math.min(100, (frame / totalFrames) * 100);
      onProgress(progress);
      
      frame++;

      if (frame < totalFrames) {
        requestAnimationFrame(draw);
      } else {
        console.log('🎬 Animation complete, stopping recorder...');
        mediaRecorder?.stop();
      }
    };

    const drawPhoto = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, elapsed: number, duration: number) => {
      const progress = elapsed / duration;
      
      // Ken Burns effect: scale from 1.0 to 1.2
      const scale = 1.0 + progress * 0.2;
      
      // Fade in/out effect
      let opacity: number;
      if (progress < 0.1) {
        opacity = progress * 10; // Fade in
      } else if (progress > 0.9) {
        opacity = (1 - progress) * 10; // Fade out
      } else {
        opacity = 1.0; // Full opacity
      }
      
      // Subtle panning effect
      const panX = Math.sin(progress * Math.PI) * 20; // Horizontal pan
      const panY = Math.cos(progress * Math.PI) * 15; // Vertical pan

      ctx.save();
      ctx.globalAlpha = opacity;
      
      // Apply transformations
      ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
      ctx.scale(scale, scale);
      
      // Draw image centered
      ctx.drawImage(
        img, 
        -canvas.width / 2, 
        -canvas.height / 2, 
        canvas.width, 
        canvas.height
      );
      
      ctx.restore();
    };

    const convertWebMtoMP4 = async (webmBlob: Blob): Promise<Blob> => {
      try {
        console.log('🔧 Initializing ffmpeg.wasm...');
        const ffmpeg = createFFmpeg({ 
          log: true,
          corePath: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/ffmpeg-core.js'
        });
        
        await ffmpeg.load();
        console.log('✅ ffmpeg.wasm loaded successfully');
        
        // Write input file
        console.log('📁 Writing WebM input file...');
        ffmpeg.FS('writeFile', 'input.webm', await fetchFile(webmBlob));
        
        // Convert WebM to MP4 with H.264 codec
        console.log('🔄 Converting to MP4...');
        await ffmpeg.run(
          '-i', 'input.webm',
          '-c:v', 'libx264',
          '-crf', '23',
          '-preset', 'fast',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          'output.mp4'
        );
        
        // Read output file
        console.log('📤 Reading MP4 output file...');
        const data = ffmpeg.FS('readFile', 'output.mp4');
        
        // Clean up
        ffmpeg.FS('unlink', 'input.webm');
        ffmpeg.FS('unlink', 'output.mp4');
        
        return new Blob([data.buffer], { type: 'video/mp4' });
      } catch (error) {
        console.error('❌ ffmpeg conversion error:', error);
        throw new Error(`MP4 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    loadResources();

    // Cleanup function
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      // Revoke object URLs
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    };
  }, [isProcessing, videoUrl, photoUrls, onProgress, onComplete, onError]);

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
        width={1080} 
        height={1920} 
        style={{ 
          background: 'black',
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
          Ready to process Ken Burns effect
        </div>
      )}
    </div>
  );
};

export default KenBurnsCanvas;