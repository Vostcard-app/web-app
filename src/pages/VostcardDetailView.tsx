import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaStar, FaRegComment, FaShare, FaFlag, FaSyncAlt } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchVostcard = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'vostcards', id!);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVostcard(docSnap.data());
        } else {
          setError('Vostcard not found.');
        }
      } catch (err) {
        setError('Failed to load Vostcard.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchVostcard();
  }, [id]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;
  }
  if (!vostcard) {
    return <div style={{ padding: 40, textAlign: 'center' }}>No data.</div>;
  }

  // Fallbacks for missing data
  const avatarUrl = vostcard.avatarURL || 'https://randomuser.me/api/portraits/men/32.jpg';
  const photoUrls = vostcard.photoURLs || [];
  const videoUrl = vostcard.videoURL || '';
  const title = vostcard.title || 'Untitled';
  const username = vostcard.username || 'Unknown';
  const likes = vostcard.likes || 0;
  const avgRating = vostcard.avgRating || 0.0;
  const comments = vostcard.comments || 0;
  const description = vostcard.description || '';

  let createdAt = '';
  if (vostcard.createdAt) {
    if (typeof vostcard.createdAt.toDate === 'function') {
      createdAt = vostcard.createdAt.toDate().toLocaleString();
    } else if (vostcard.createdAt instanceof Date) {
      createdAt = vostcard.createdAt.toLocaleString();
    } else if (typeof vostcard.createdAt === 'string' || typeof vostcard.createdAt === 'number') {
      createdAt = new Date(vostcard.createdAt).toLocaleString();
    } else {
      createdAt = String(vostcard.createdAt);
    }
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Banner */}
      <div style={{ background: '#07345c', padding: '32px 0 24px 0', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, position: 'relative', textAlign: 'center' }}>
        <button style={{ position: 'absolute', left: 16, top: 36, background: 'rgba(0,0,0,0.10)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <FaArrowLeft color="#fff" size={28} />
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>Vōstcard</span>
      </div>

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 0 24px' }}>
        <img src={avatarUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginRight: 16 }} />
        <span style={{ fontWeight: 500, fontSize: 24 }}>{username}</span>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 32, margin: '16px 0 8px 0' }}>{title}</div>

      {/* Media Thumbnails */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '0 0 16px 0' }}>
        <div style={{ width: 180, height: 240, background: '#111', borderRadius: 16, overflow: 'hidden', cursor: videoUrl ? 'pointer' : 'default' }}>
          {videoUrl ? (
            <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>No Video</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {photoUrls.length > 0 ? (
            photoUrls.slice(0, 2).map((url: string, idx: number) => (
              <img
                key={idx}
                src={url}
                alt={`photo${idx+1}`}
                style={{ width: 120, height: 110, borderRadius: 16, objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setSelectedPhoto(url)}
              <img key={idx} src={url} alt={`photo${idx+1}`} style={{ width: 120, height: 110, borderRadius: 16, objectFit: 'cover', cursor: 'pointer' }} />
            ))
          ) : (
            <>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Photo</div>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Photo</div>
            </>
          )}
        </div>
      </div>

      {/* Action Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '16px 0 0 0' }}>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaHeart size={32} color="#222" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{likes}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaStar size={32} color="#ffc107" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{avgRating.toFixed(1)}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaRegComment size={32} color="#222" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{comments}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaShare size={32} color="#222" style={{ marginBottom: 4 }} />
        </div>
      </div>

      {/* Worth Seeing? 5-Star Widget */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0', fontSize: 18 }}>Worth Seeing?</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '4px 0 0 0' }}>
        {[1,2,3,4,5].map((star) => (
          <FaStar
            key={star}
            size={28}
            color={hoverRating >= star || rating >= star ? '#ffc107' : '#ddd'}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
          />
        ))}
      </div>

      {/* Description Link */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0' }}>
        <a href="#description" style={{ color: '#007aff', fontWeight: 700, fontSize: 24, textDecoration: 'underline', cursor: 'pointer' }}>Description</a>
      </div>
      <div id="description" style={{ margin: '16px 24px 0 24px', color: '#444', fontSize: 18, textAlign: 'center' }}>{description}</div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 }}>Posted: {createdAt}</div>

      {/* Bottom Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 24px 0 24px' }}>
        <FaFlag size={36} color="#e53935" style={{ cursor: 'pointer' }} />
        <FaSyncAlt size={36} color="#007aff" style={{ cursor: 'pointer' }} />
      </div>
    </div>
  );
};

export default VostcardDetailView;
