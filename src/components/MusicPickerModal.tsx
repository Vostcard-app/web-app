import React, { useEffect, useMemo, useState, useRef } from 'react';
import { getMusicLibrary, addMusicTrack, type MusicTrack } from '../services/musicLibraryService';
import { storage } from '../firebase/firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (track: MusicTrack) => void;
};

const MusicPickerModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  
  // Upload functionality
  const [uploading, setUploading] = useState(false);
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
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(q))
    );
  }, [tracks, query]);

  // Handle file upload
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
      // Clean filename for Firebase storage
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `library/music/user_uploads/${Date.now()}_${cleanName}`;
      const fileRef = storageRef(storage, path);
      
      // Upload file to Firebase storage
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Extract title from filename (remove extension)
      const title = file.name.replace(/\.[^/.]+$/, "");
      
      // Add to music library
      const trackId = await addMusicTrack({ 
        title, 
        url, 
        artist: 'User Upload'
      });

      // Create the new track object
      const newTrack: MusicTrack = {
        id: trackId,
        title,
        url,
        artist: 'User Upload'
      };

      // Add to local tracks list
      setTracks(prev => [newTrack, ...prev]);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      alert('✅ Music uploaded successfully!');
    } catch (error) {
      console.error('❌ Error uploading music:', error);
      alert('Failed to upload music. Please try again.');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks (title, artist, tag)"
            style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' }}
          />
          <button onClick={onClose} style={{ border: 'none', background: '#eee', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Close</button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 24 }}>Loading music...</div>}
        {error && <div style={{ color: '#dc3545', padding: 12 }}>{error}</div>}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', padding: 24 }}>No tracks found</div>
            )}
            {filtered.map((t) => (
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

        {/* Add Your Own Button */}
        {!loading && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%',
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
              {uploading ? '⏳ Uploading...' : '📁 Add Your Own Music'}
            </button>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* Audio preview element */}
        <audio src={previewSrc || undefined} autoPlay={!!previewSrc} controls style={{ width: '100%', marginTop: 10 }} onEnded={() => setPreviewSrc(null)} />
      </div>
    </div>
  );
};

export default MusicPickerModal;


