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
  const processorRef = useRef<KenBurnsProcessor | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Default Ken Burns configuration
  const defaultConfig: KenBurnsConfig = {
    videoDuration: 30,
    photo1Start: 5,
    photo2Start: 20,
    photoDisplayDuration: 5,
    fadeInDuration: 500,
    fadeOutDuration: 500,
    scaleRange: { min: 1.0, max: 1.5 },
    frameRate: 30
  };

  useEffect(() => {
    if (canvasRef.current && !processorRef.current) {
      processorRef.current = new KenBurnsProcessor(canvasRef.current, defaultConfig);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (isProcessing && isReady && processorRef.current) {
      processKenBurns();
    }
  }, [isProcessing, isReady]);

  const processKenBurns = async () => {
    if (!processorRef.current) return;

    try {
      const result = await processorRef.current.processKenBurns(
        videoUrl,
        photoUrls,
        onProgress
      );
      onComplete(result);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

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
          Ready to process Ken Burns effect
        </div>
      )}
    </div>
  );
};

export default KenBurnsCanvas; 