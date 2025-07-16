import React, { useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

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
    let animationFrameId: number;

    const loadResources = async () => {
      try {
        console.log('🎬 Loading video and images...');
        await video.play();

        for (const url of photoUrls.slice(0, 2)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = url;
          await img.decode();
          images.push(img);
        }
        console.log('✅ Video and images loaded');
        startRecording();
      } catch (err) {
        console.error('❌ Resource load failed:', err);
        onError('Failed to load video or images');
      }
    };

    const startRecording = () => {
      try {
        console.log('🎥 Starting MediaRecorder...');
        const stream = canvas.captureStream(fps);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          console.log('📹 Recording complete, converting to MP4...');
          const webmBlob = new Blob(chunks, { type: 'video/webm' });
          try {
            const mp4Blob = await convertWebMtoMP4(webmBlob);
            console.log('✅ MP4 conversion complete');
            onComplete(mp4Blob);
          } catch (err) {
            console.error('❌ MP4 conversion failed:', err);
            onError('Failed to convert WebM to MP4');
          }
        };

        mediaRecorder.start();
        draw();
      } catch (err) {
        console.error('❌ MediaRecorder error:', err);
        onError('Failed to start recording');
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw base video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Apply Ken Burns photo overlays
      const currentTime = frame / fps;
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
        animationFrameId = requestAnimationFrame(draw);
      } else {
        console.log('🎬 Animation complete, stopping recorder...');
        mediaRecorder?.stop();
      }
    };

    const drawPhoto = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, elapsed: number, duration: number) => {
      const progress = elapsed / duration;
      const scale = 1.0 + progress * 0.2; // Smooth zoom
      const opacity = progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      ctx.restore();
    };

    const convertWebMtoMP4 = async (webmBlob: Blob): Promise<Blob> => {
      const ffmpeg = new FFmpeg();
      try {
        console.log('🔧 Loading ffmpeg.wasm...');
        await ffmpeg.load();
        
        // Write input file
        await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
        
        // Execute conversion
        await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-crf', '23', '-preset', 'fast', 'output.mp4']);
        
        // Read output file
        const data = await ffmpeg.readFile('output.mp4');
        return new Blob([data], { type: 'video/mp4' });
      } catch (err) {
        console.error('❌ ffmpeg conversion error:', err);
        throw new Error('MP4 conversion failed');
      }
    };

    loadResources();

    return () => {
      if (mediaRecorder?.state !== 'inactive') {
        mediaRecorder.stop();
      }
      cancelAnimationFrame(animationFrameId);
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    };
  }, [isProcessing, videoUrl, photoUrls, onProgress, onComplete, onError]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
        <div style={{ textAlign: 'center', color: '#666', fontSize: '16px' }}>
          Ready to process Ken Burns effect
        </div>
      )}
    </div>
  );
};

export default KenBurnsCanvas;