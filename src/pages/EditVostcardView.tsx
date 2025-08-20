import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaTrash, FaUpload, FaSave } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { db, storage, auth } from '../firebase/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

type Nullable<T> = T | null;

const EditVostcardView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

      const {
    currentVostcard,
    setCurrentVostcard,
    saveVostcard,
    postVostcard,
  } = useVostcard();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

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
      'Pub',
      'Plaque',
      'Monument',
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
        // Try to fetch directly from Firebase
        const ref = doc(db, 'vostcards', id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const updatedVostcard = {
            id: snap.id,
            title: data.title || '',
            description: data.description || '',
            categories: Array.isArray(data.categories) ? data.categories : [],
            username: data.username || '',
            userID: data.userID || '',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            state: data.state || 'private',
            type: 'vostcard' as const,
            video: null,
            photos: [],
            geo: data.geo || { latitude: data.latitude, longitude: data.longitude } || null,
            hasVideo: data.hasVideo || false,
            hasPhotos: data.hasPhotos || false,
            _firebaseVideoURL: data.videoURL || null,
            _firebasePhotoURLs: Array.isArray(data.photoURLs) ? data.photoURLs : [],
            _isMetadataOnly: true
          };
          setCurrentVostcard(updatedVostcard);
          initializeFromVostcard(updatedVostcard);
        } else {
          throw new Error('Vostcard not found');
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
      setCategories(Array.isArray(v.categories) && v.categories.length > 0 ? v.categories : ['View']);

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
      } else if (Array.isArray(v._firebasePhotoURLs) && v._firebasePhotoURLs.length > 0) {
        v._firebasePhotoURLs.slice(0, 4).forEach((u: string, idx: number) => {
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
    } else if (Array.isArray((currentVostcard as any)._firebasePhotoURLs) && (currentVostcard as any)._firebasePhotoURLs.length > 0) {
      (currentVostcard as any)._firebasePhotoURLs.slice(0, 4).forEach((u: string, idx: number) => {
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

  // Listen for video updates from recording view and refresh thumbnail promptly
  useEffect(() => {
    const handler = () => {
      if (!currentVostcard) return;
      if (currentVostcard.video instanceof Blob) {
        try { setVideoUrl(URL.createObjectURL(currentVostcard.video)); } catch {}
      } else if ((currentVostcard as any).videoURL) {
        setVideoUrl((currentVostcard as any).videoURL);
      }
    };
    window.addEventListener('vostcard:video-updated', handler);
    return () => window.removeEventListener('vostcard:video-updated', handler);
  }, [currentVostcard]);

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
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      // Update the current vostcard with the edited data
      const photosBlobs = photoFiles.filter(Boolean) as Blob[];
      const existingPhotoUrls = photoUrls.filter(Boolean) as string[];
      
      const updatedVostcard = {
        ...currentVostcard!,
        title,
        description,
        categories,
        photos: photosBlobs, // New photos as Blobs for upload
        _firebasePhotoURLs: existingPhotoUrls, // Preserve existing photos
        video: videoFile || null,
        hasPhotos: photosBlobs.length > 0 || existingPhotoUrls.length > 0,
        hasVideo: !!videoFile,
        updatedAt: new Date().toISOString()
      };
      
      // Update the context
      setCurrentVostcard(updatedVostcard);
      
      // Use the context's save function
      await saveVostcard();
      
      alert('Saved!');
      navigate(-1);
    } catch (e) {
      console.error('❌ Save failed:', e);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
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
          <FaUpload style={{ marginRight: 4 }} /> Add Photo
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
      <div style={{ flex: 1, maxWidth: 390, width: '100%', margin: '0 auto', padding: '16px 16px 80px', boxSizing: 'border-box' }}>
        {/* Photos */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Photos</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 240, margin: '0 auto', justifyItems: 'center' }}>
            {[0,1,2,3].map(photoCell)}
          </div>
        </div>

        {/* Video */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, textAlign: 'left' }}>Video (optional)</div>
          {/* Match photo grid width (2 x 110 + 12 gap = 232; grid maxWidth is 240 for padding) */}
          <div style={{ width: '100%', maxWidth: 240, margin: '0 auto', borderRadius: 8, border: '2px solid #002B4D', overflow: 'hidden', background: '#111' }}>
            {videoUrl ? (
              <video
                src={videoUrl}
                style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                playsInline
                muted
                controls
              />
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                <div style={{ width: 96, height: 96, borderRadius: 12, border: '2px dashed #555', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 12 }}>
                  No video
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => {
                const scriptParam = (currentVostcard as any)?.script ? `&script=${encodeURIComponent((currentVostcard as any).script)}` : '';
                navigate(`/scrolling-camera?returnTo=${encodeURIComponent(`/edit/${id}`)}${scriptParam}`);
              }}
              style={{ background: '#007aff', color: 'white', border: 'none', borderRadius: 6, padding: '10px 12px', fontSize: 14, cursor: 'pointer' }}
            >
              Record 60s
            </button>
            <button
              onClick={() => navigate('/script-tool')}
              style={{ background: '#5755d9', color: 'white', border: 'none', borderRadius: 6, padding: '10px 12px', fontSize: 14, cursor: 'pointer' }}
            >
              Open Script Tool
            </button>
            {videoUrl && (
              <button onClick={handleRemoveVideo} style={{ background: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: 6, padding: '10px 12px', fontSize: 14, cursor: 'pointer' }}>
                <FaTrash style={{ marginRight: 4 }} /> Remove
              </button>
            )}
          </div>
        </div>

        {/* Text fields */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a title" style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description" style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
          <select value={categories[0] || 'None'} onChange={(e) => setCategories([e.target.value])} style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Footer actions */}
        {(() => {
          const photoCount = photoFiles.filter(Boolean).length + photoUrls.filter(Boolean).length;
          const ready = photoCount > 0 && title.trim().length > 0 && description.trim().length > 0 && categories.length > 0 && categories[0];
          
          // Debug logging
          console.log('🔍 Edit Button State Debug:', {
            photoCount,
            photoFiles: photoFiles.filter(Boolean).length,
            photoUrls: photoUrls.filter(Boolean).length,
            titleLength: title.trim().length,
            descriptionLength: description.trim().length,
            category: categories[0],
            ready
          });
          
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                style={{ 
                  background: isSaving ? '#6c757d' : '#002B4D', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '12px 16px', 
                  fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                <FaSave /> {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={async () => {
                  if (isPosting || !ready) return;
                  
                  setIsPosting(true);
                  try {
                    // Update the vostcard context with the current data
                    const photosBlobs = photoFiles.filter(Boolean) as Blob[];
                    const existingPhotoUrls = photoUrls.filter(Boolean) as string[];
                    
                    const updatedVostcard = {
                      ...currentVostcard!,
                      title,
                      description,
                      categories,
                      photos: photosBlobs, // New photos as Blobs for upload
                      _firebasePhotoURLs: existingPhotoUrls, // Preserve existing photos
                      video: videoFile || null,
                      state: 'posted' as const,
                      visibility: 'public' as const,
                      hasPhotos: photosBlobs.length > 0 || existingPhotoUrls.length > 0,
                      hasVideo: !!videoFile,
                      updatedAt: new Date().toISOString()
                    };
                    
                    setCurrentVostcard(updatedVostcard);
                    
                    // Post to map using the context function
                    await postVostcard();
                    alert('Posted to the map!');
                    navigate('/home');
                  } catch (e) {
                    console.error('Post error:', e);
                    alert('Failed to post. Please try again.');
                  } finally {
                    setIsPosting(false);
                  }
                }}
                disabled={!ready || isPosting}
                style={{ 
                  background: isPosting ? '#6c757d' : (ready ? '#0a8f54' : '#9bb7a9'), 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '12px 16px', 
                  fontWeight: 700, 
                  cursor: (!ready || isPosting) ? 'not-allowed' : 'pointer',
                  opacity: isPosting ? 0.7 : 1
                }}
              >
                {isPosting ? '🚀 Posting...' : 'Post to Map'}
              </button>
            </div>
          );
        })()}
      </div>

      {/* Hidden inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoInputChange} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoInputChange} />
    </div>
  );
};

export default EditVostcardView;


