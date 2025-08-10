import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';
import type { MusicTrack } from '../services/musicLibraryService';

const MusicLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load music library
  useEffect(() => {
    loadMusicLibrary();
  }, []);

  const loadMusicLibrary = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'musicLibrary'));
      const tracks = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as Omit<MusicTrack, 'id'>) 
      }));
      setMusicTracks(tracks);
    } catch (error) {
      console.error('❌ Error loading music library:', error);
      alert('Failed to load music library');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    setUploading(true);
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `music/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Get the file name without extension as title
      const title = file.name.replace(/\.[^/.]+$/, "");

      // Add to Firestore
      await addDoc(collection(db, 'musicLibrary'), {
        title: title,
        url: downloadURL,
        artist: 'Unknown',
        tags: [],
        license: 'Custom Upload'
      });

      // Reload the library
      await loadMusicLibrary();
      
      // Clear the file input
      event.target.value = '';
      
      alert('✅ Music uploaded successfully!');
    } catch (error) {
      console.error('❌ Error uploading music:', error);
      alert('Failed to upload music. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTrackSelection = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
  };

  const handleDeleteChecked = async () => {
    if (selectedTracks.size === 0) {
      alert('No songs selected for deletion');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedTracks.size} selected song(s)? This cannot be undone.`
    );
    
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      // Delete each selected track from Firestore
      const deletePromises = Array.from(selectedTracks).map(trackId => 
        deleteDoc(doc(db, 'musicLibrary', trackId))
      );
      
      await Promise.all(deletePromises);
      
      // Clear selections and reload
      setSelectedTracks(new Set());
      await loadMusicLibrary();
      
      alert('✅ Selected songs deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting songs:', error);
      alert('Failed to delete songs. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '2px solid #002B4D'
      }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            marginRight: '15px',
            color: '#002B4D'
          }}
        >
          ←
        </button>
        <h1 style={{
          margin: 0,
          color: '#002B4D',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          Music Library (Adin)
        </h1>
      </div>

      {/* Upload Section */}
      <div style={{ marginBottom: '40px' }}>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          style={{
            marginBottom: '15px',
            fontSize: '16px'
          }}
        />
        <br />
        <button
          disabled={uploading}
          style={{
            backgroundColor: '#002B4D',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1
          }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Songs List */}
      <div style={{ marginBottom: '30px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
          </div>
        ) : musicTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No songs yet.
          </div>
        ) : (
          <div>
            {musicTracks.map((track) => (
              <div key={track.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  checked={selectedTracks.has(track.id)}
                  onChange={() => handleTrackSelection(track.id)}
                  style={{
                    marginRight: '15px',
                    width: '18px',
                    height: '18px'
                  }}
                />
                <span style={{ fontSize: '16px' }}>
                  {track.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Section */}
      {musicTracks.length > 0 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}>
            Delete Checked Songs
          </div>
          <button
            onClick={handleDeleteChecked}
            disabled={selectedTracks.size === 0 || deleting}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: selectedTracks.size === 0 || deleting ? 'not-allowed' : 'pointer',
              opacity: selectedTracks.size === 0 || deleting ? 0.6 : 1
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicLibraryView;
