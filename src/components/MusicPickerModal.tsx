import React, { useEffect, useState, useRef } from 'react';
import { getMusicLibrary, type MusicTrack } from '../services/musicLibraryService';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (track: MusicTrack) => void;
};

const MusicPickerModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  
  // Upload functionality for temporary tracks
  const [uploading, setUploading] = useState(false);
  const [uploadedTrack, setUploadedTrack] = useState<MusicTrack | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getMusicLibrary();
        if (mounted) setTracks(list);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load music library');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      setPreviewSrc(null);
      setUploadedTrack(null); // Clear uploaded track when modal closes
    };
  }, [isOpen]);

  // Handle file upload (temporary, not persisted)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    setUploading(true);
    try {
      // Create a blob URL for temporary playback (no Firebase upload)
      const url = URL.createObjectURL(file);
      
      // Extract title from filename (remove extension)
      const title = file.name.replace(/\.[^/.]+$/, "");
      
      // Create temporary track object
      const tempTrack: MusicTrack = {
        id: `temp_${Date.now()}`,
        title,
        url,
        artist: 'Your Upload'
      };

      // Set as uploaded track (temporary)
      setUploadedTrack(tempTrack);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('❌ Error processing file:', error);
      alert('Failed to process music file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 16,
          width: '100%',
          maxWidth: 420,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {/* Add Your Own Music Button - Now at the top */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              flex: 1,
              border: '2px dashed #007aff',
              backgroundColor: uploading ? '#f5f5f5' : 'transparent',
              color: uploading ? '#666' : '#007aff',
              borderRadius: 8,
              padding: '12px 16px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            {uploading ? '⏳ Processing...' : '📁 Add Your Own Music'}
          </button>
          
          <button onClick={onClose} style={{ border: 'none', background: '#eee', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Close</button>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 24 }}>Loading music...</div>}
        {error && <div style={{ color: '#dc3545', padding: 12 }}>{error}</div>}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Show uploaded track first if it exists */}
            {uploadedTrack && (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#007aff', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                  📁 Your Uploaded Music
                </div>
                <div style={{ border: '2px solid #007aff', borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#f8f9ff' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadedTrack.title}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{uploadedTrack.artist}</div>
                  </div>
                  <button
                    onClick={() => setPreviewSrc(s => (s === uploadedTrack.url ? null : uploadedTrack.url))}
                    style={{ border: 'none', background: '#eee', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}
                  >
                    {previewSrc === uploadedTrack.url ? 'Stop' : 'Preview'}
                  </button>
                  <button
                    onClick={() => onSelect(uploadedTrack)}
                    style={{ border: 'none', background: '#007aff', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Select
                  </button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#666', marginTop: 16, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                  🎵 Music Library
                </div>
              </>
            )}
            
            {/* Show library tracks */}
            {tracks.length === 0 && !uploadedTrack && (
              <div style={{ textAlign: 'center', color: '#666', padding: 24 }}>No tracks found</div>
            )}
            {tracks.map((t) => (
              <div key={t.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{t.artist || 'Unknown artist'}</div>
                  {t.tags && t.tags.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {t.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: 10, background: '#f1f3f5', color: '#495057', borderRadius: 6, padding: '2px 6px' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPreviewSrc(s => (s === t.url ? null : t.url))}
                  style={{ border: 'none', background: '#eee', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}
                >
                  {previewSrc === t.url ? 'Stop' : 'Preview'}
                </button>
                <button
                  onClick={() => onSelect(t)}
                  style={{ border: 'none', background: '#007aff', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        )}



        {/* Audio preview element */}
        <audio src={previewSrc || undefined} autoPlay={!!previewSrc} controls style={{ width: '100%', marginTop: 10 }} onEnded={() => setPreviewSrc(null)} />
      </div>
    </div>
  );
};

export default MusicPickerModal;


