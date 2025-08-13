import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaTrash, FaUpload, FaSave } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

type Nullable<T> = T | null;

const EditVostcardView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    currentVostcard,
    setCurrentVostcard,
    downloadVostcardContent,
    loadLocalVostcard,
    updateVostcard,
    saveLocalVostcard,
  } = useVostcard();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local edit state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<Array<Nullable<Blob>>>([null, null, null, null]);
  const [photoUrls, setPhotoUrls] = useState<Array<Nullable<string>>>([null, null, null, null]);
  const [videoFile, setVideoFile] = useState<Nullable<Blob>>(null);
  const [videoUrl, setVideoUrl] = useState<Nullable<string>>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoIndexRef = useRef<number | null>(null);

  const availableCategories = useMemo(
    () => [
      'None',
      'View',
      'Landmark',
      'Fun Fact',
      'Macabre',
      'Architecture',
      'Historical',
      'Museum',
      'Gallery',
      'Restaurant',
      'Nature',
      'Park',
      'Drive Mode Event',
      'Wish you were here',
      'Made for kids',
    ],
    []
  );

  useEffect(() => {
    const hydrate = async () => {
      if (!id) {
        setError('Missing Vōstcard ID');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        // Always ensure hydrated like detail view
        await downloadVostcardContent(id);
        await loadLocalVostcard(id);
        // Use freshly loaded currentVostcard from context
        const v = (currentVostcard && currentVostcard.id === id) ? currentVostcard : undefined;
        const base = v || currentVostcard;
        if (!base) {
          // If not immediately available, give the event loop a tick
          setTimeout(() => {
            initializeFromContext();
          }, 0);
        } else {
          initializeFromVostcard(base);
        }
      } catch (e: any) {
        console.error('❌ Edit hydrate failed:', e);
        setError('Failed to load this Vōstcard for editing.');
      } finally {
        setIsLoading(false);
      }
    };

    const initializeFromContext = () => {
      if (!currentVostcard) return;
      initializeFromVostcard(currentVostcard);
    };

    const initializeFromVostcard = (v: any) => {
      setTitle(v.title || '');
      setDescription(v.description || '');
      setCategories(Array.isArray(v.categories) ? v.categories : []);

      // Photos: prefer Blob files; otherwise use URLs
      const localPhotos: Array<Nullable<Blob>> = [null, null, null, null];
      const localUrls: Array<Nullable<string>> = [null, null, null, null];
      if (Array.isArray(v.photos) && v.photos.length > 0) {
        v.photos.slice(0, 4).forEach((p: any, idx: number) => {
          if (p instanceof Blob) {
            localPhotos[idx] = p;
            try { localUrls[idx] = URL.createObjectURL(p); } catch {}
          }
        });
      } else if (Array.isArray(v.photoURLs) && v.photoURLs.length > 0) {
        v.photoURLs.slice(0, 4).forEach((u: string, idx: number) => {
          localUrls[idx] = u;
        });
      }
      setPhotoFiles(localPhotos);
      setPhotoUrls(prev => {
        prev.forEach(u => { if (u && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch {} } });
        return localUrls;
      });

      // Video
      if (v.video instanceof Blob) {
        setVideoFile(v.video);
        try { setVideoUrl(URL.createObjectURL(v.video)); } catch { setVideoUrl(null); }
      } else if (typeof v.videoURL === 'string' && v.videoURL) {
        setVideoUrl(v.videoURL);
        setVideoFile(null);
      } else {
        setVideoFile(null);
        setVideoUrl(null);
      }
    };

    hydrate();

    return () => {
      // Cleanup blob urls
      photoUrls.forEach(u => { if (u && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch {} } });
      if (videoUrl && videoUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(videoUrl); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Re-hydrate from context when currentVostcard updates (mirrors detail view readiness)
  useEffect(() => {
    if (!id || !currentVostcard) return;
    if (currentVostcard.id !== id) return;

    // Populate fields from the freshly loaded context item
    setTitle(currentVostcard.title || '');
    setDescription(currentVostcard.description || '');
    setCategories(Array.isArray(currentVostcard.categories) ? currentVostcard.categories : []);

    const nextFiles: Array<Nullable<Blob>> = [null, null, null, null];
    const nextUrls: Array<Nullable<string>> = [null, null, null, null];
    if (Array.isArray((currentVostcard as any).photos) && (currentVostcard as any).photos.length > 0) {
      (currentVostcard as any).photos.slice(0, 4).forEach((p: any, idx: number) => {
        if (p instanceof Blob) {
          nextFiles[idx] = p;
          try { nextUrls[idx] = URL.createObjectURL(p); } catch {}
        }
      });
    } else if (Array.isArray((currentVostcard as any).photoURLs) && (currentVostcard as any).photoURLs.length > 0) {
      (currentVostcard as any).photoURLs.slice(0, 4).forEach((u: string, idx: number) => {
        nextUrls[idx] = u;
      });
    }
    // Revoke only blob: URLs before swapping
    setPhotoUrls(prev => {
      prev.forEach(u => { if (u && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch {} } });
      return nextUrls;
    });
    setPhotoFiles(nextFiles);

    // Video
    if ((currentVostcard as any).video instanceof Blob) {
      setVideoFile((currentVostcard as any).video);
      try { setVideoUrl(URL.createObjectURL((currentVostcard as any).video)); } catch { setVideoUrl(null); }
    } else if (typeof (currentVostcard as any).videoURL === 'string' && (currentVostcard as any).videoURL) {
      setVideoUrl((currentVostcard as any).videoURL);
      setVideoFile(null);
    } else {
      setVideoFile(null);
      setVideoUrl(null);
    }
  }, [id, currentVostcard]);

  const handlePickPhoto = (index: number) => {
    pendingPhotoIndexRef.current = index;
    photoInputRef.current?.click();
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = pendingPhotoIndexRef.current;
    if (!file || idx === null) return;
    const nextFiles = [...photoFiles];
    const nextUrls = [...photoUrls];
    nextFiles[idx] = file;
    if (nextUrls[idx] && nextUrls[idx]!.startsWith('blob:')) {
      try { URL.revokeObjectURL(nextUrls[idx]!); } catch {}
    }
    try { nextUrls[idx] = URL.createObjectURL(file); } catch { nextUrls[idx] = null; }
    setPhotoFiles(nextFiles);
    setPhotoUrls(nextUrls);
    pendingPhotoIndexRef.current = null;
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const nextFiles = [...photoFiles];
    const nextUrls = [...photoUrls];
    nextFiles[index] = null;
    if (nextUrls[index] && nextUrls[index]!.startsWith('blob:')) {
      try { URL.revokeObjectURL(nextUrls[index]!); } catch {}
    }
    nextUrls[index] = null;
    setPhotoFiles(nextFiles);
    setPhotoUrls(nextUrls);
  };

  const handlePickVideo = () => {
    videoInputRef.current?.click();
  };

  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl && videoUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoUrl); } catch {}
    }
    setVideoFile(file);
    try { setVideoUrl(URL.createObjectURL(file)); } catch { setVideoUrl(null); }
    e.target.value = '';
  };

  const handleRemoveVideo = () => {
    if (videoUrl && videoUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoUrl); } catch {}
    }
    setVideoFile(null);
    setVideoUrl(null);
  };

  const handleSave = async () => {
    try {
      // Push edited fields into context, then save
      const photosBlobs = photoFiles.filter(Boolean) as Blob[];
      updateVostcard({
        title,
        description,
        categories,
        photos: photosBlobs,
        video: videoFile || null,
      });
      await saveLocalVostcard();
      // After save, ensure current is set for any further navigation
      if (currentVostcard) setCurrentVostcard({ ...currentVostcard, title, description, categories });
      alert('Saved!');
      navigate(-1);
    } catch (e) {
      console.error('❌ Save failed:', e);
      alert('Failed to save changes.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>{error}</div>
    );
  }

  const photoCell = (idx: number) => (
    <div key={idx} style={{ width: 110, height: 110, borderRadius: 8, overflow: 'hidden', border: '2px solid #002B4D', position: 'relative', background: '#f8f9fa' }}>
      {photoUrls[idx] ? (
        <img src={photoUrls[idx]!} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 12 }}>Empty</div>
      )}
      <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', gap: 6 }}>
        <button onClick={() => handlePickPhoto(idx)} style={{ background: '#002B4D', color: 'white', border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}>
          <FaUpload style={{ marginRight: 4 }} /> Replace
        </button>
        {photoUrls[idx] && (
          <button onClick={() => handleRemovePhoto(idx)} style={{ background: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}>
            <FaTrash style={{ marginRight: 4 }} /> Remove
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#07345c', color: 'white', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <FaArrowLeft />
        </button>
        <div style={{ fontWeight: 700, fontSize: 22 }}>Edit Vōstcard</div>
        <div style={{ width: 44 }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 420, width: '100%', margin: '0 auto', padding: 16 }}>
        {/* Photos */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Photos</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[0,1,2,3].map(photoCell)}
          </div>
        </div>

        {/* Video */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Video (optional)</div>
          <div style={{ width: '100%', height: 180, borderRadius: 8, border: '2px solid #002B4D', position: 'relative', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
            {videoUrl ? 'Video attached' : 'No video'}
            <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 8 }}>
              <button onClick={handlePickVideo} style={{ background: '#002B4D', color: 'white', border: 'none', borderRadius: 6, padding: '8px 10px', fontSize: 12, cursor: 'pointer' }}>
                <FaUpload style={{ marginRight: 4 }} /> {videoUrl ? 'Replace' : 'Add'} Video
              </button>
              {videoUrl && (
                <button onClick={handleRemoveVideo} style={{ background: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: 6, padding: '8px 10px', fontSize: 12, cursor: 'pointer' }}>
                  <FaTrash style={{ marginRight: 4 }} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Text fields */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a title" style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description" style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, minHeight: 80, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
          <select value={categories[0] || 'None'} onChange={(e) => setCategories([e.target.value])} style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6 }}>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button onClick={handleSave} style={{ background: '#002B4D', color: 'white', border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 700, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <FaSave /> Save Changes
        </button>
      </div>

      {/* Hidden inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoInputChange} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoInputChange} />
    </div>
  );
};

export default EditVostcardView;


