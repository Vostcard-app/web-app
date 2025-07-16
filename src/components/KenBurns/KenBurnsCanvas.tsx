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
    if (isProcessing && isReady && can