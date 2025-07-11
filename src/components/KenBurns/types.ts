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
}

export interface KenBurnsResult {
  blob: Blob;
  duration: number;
  size: number;
  format: string;
}

export interface KenBurnsError {
  code: string;
  message: string;
  details?: any;
}

export type KenBurnsStatus = 'idle' | 'processing' | 'completed' | 'error'; 