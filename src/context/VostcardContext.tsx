import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, storage } from '../firebaseConfig.ts';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, limit, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export interface Vostcard {
  id: string;
  state: 'private' | 'posted';
  video: Blob | null;
  title: string;
  description: string;
  photos: Blob[];
  categories: string[];
  geo: { latitude: number; longitude: number } | null;
  username: string;
  userID: string;
  createdAt: string;
  updatedAt: string;
  videoURL?: string;
  photoURLs?: string[];
}

interface VostcardContextProps {
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  setVideo: (video: Blob) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  saveVostcard: () => Promise<void>;
  loadVostcard: (id: string) => Promise<void>;
  clearVostcard: () => void;
  postVostcard: () => Promise<void>;
  privateVostcards: Vostcard[];
  loadPrivateVostcards: () => Promise<void>;
}

const VostcardContext = createContext<VostcardContextProps | undefined>(undefined);

export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [privateVostcards, setPrivateVostcards] = useState<Vostcard[]>([]);

  // Load private Vostcards from Firebase
  const loadPrivateVostcards = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('🔐 No user authenticated, cannot load private Vostcards');
        setPrivateVostcards([]);
        return;
      }

      console.log('🔍 Loading private Vostcards from Firebase for user:', user.uid);
      
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('state', '==', 'private'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const vostcards: Vostcard[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        vostcards.push({
          id: data.id,
          state: data.state,
          video: null, // We'll load blobs on demand
          title: data.title || '',
          description: data.description || '',
          photos: [], // We'll load blobs on demand
          categories: data.categories || [],
          geo: data.latitude && data.longitude ? {
            latitude: data.latitude,
            longitude: data.longitude
          } : null,
          username: data.username || '',
          userID: data.userID || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || '',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || '',
          videoURL: data.videoURL,
          photoURLs: data.photoURLs || []
        });
      });

      console.log('🔍 Loaded private Vostcards from Firebase:', vostcards.length);
      setPrivateVostcards(vostcards);
      
    } catch (error) {
      console.error('❌ Error loading private Vostcards from Firebase:', error);
      setPrivateVostcards([]);
    }
  };

  // Load on mount
  useEffect(() => {
    loadPrivateVostcards();
  }, []);

  // Debug currentVostcard changes
  useEffect(() => {
    console.log('🔄 currentVostcard state changed:', {
      id: currentVostcard?.id,
      hasVideo: !!currentVostcard?.video,
      hasGeo: !!currentVostcard?.geo,
      geo: currentVostcard?.geo,
      title: currentVostcard?.title,
      photosCount: currentVostcard?.photos?.length,
      categoriesCount: currentVostcard?.categories?.length
    });
  }, [currentVostcard]);

  // ✅ Create or update video
  const setVideo = (video: Blob) => {
    console.log('🎬 setVideo called with blob:', video);

    // Attempt to capture location when the user starts recording
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.log('📍 Location captured at setVideo:', geo);
        setGeo(geo);
      },
      (error) => {
        console.warn('❌ Failed to capture location at setVideo:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
    
    if (currentVostcard) {
      const updatedVostcard = { 
        ...currentVostcard, 
        video, 
        updatedAt: new Date().toISOString() 
      };
      setCurrentVostcard(updatedVostcard);
    } else {
      const user = auth.currentUser;
      const username = user?.displayName || user?.email?.split('@')[0] || 'Unknown';

      const newVostcard = {
        id: uuidv4(),
        state: 'private' as const,
        video,
        title: '',
        description: '',
        photos: [],
        categories: [],
        geo: null,
        username,
        userID: user?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('🎬 Creating new Vostcard with video:', newVostcard);
      setCurrentVostcard(newVostcard);
    }
  };

  // ✅ Update geolocation
  const setGeo = (geo: { latitude: number; longitude: number }) => {
    console.log('📍 setGeo called with:', geo);
    
    if (currentVostcard) {
      const updatedVostcard = { 
        ...currentVostcard, 
        geo, 
        updatedAt: new Date().toISOString() 
      };
      setCurrentVostcard(updatedVostcard);
    }
  };

  // ✅ General updates (title, description, categories, etc.)
  const updateVostcard = (updates: Partial<Vostcard>) => {
    console.log('🔄 updateVostcard called with:', updates);
    
    if (currentVostcard) {
      const updatedVostcard = {
        ...currentVostcard,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      setCurrentVostcard(updatedVostcard);
    }
  };

  // ✅ Save Vostcard to Firebase
  const saveVostcard = async () => {
    if (!currentVostcard || !currentVostcard.video) {
      alert('No video to save!');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert('Please log in to save Vostcards');
      return;
    }

    try {
      const vostcardId = currentVostcard.id || uuidv4();
      const userID = user.uid;

      // 1. Upload video to Firebase Storage
      const videoRef = ref(storage, `vostcards/${userID}/${vostcardId}/video.mov`);
      const videoSnap = await uploadBytes(videoRef, currentVostcard.video);
      const videoURL = await getDownloadURL(videoSnap.ref);

      // 2. Save metadata to Firestore
      const docRef = doc(db, 'vostcards', vostcardId);
      await setDoc(docRef, {
        id: vostcardId,
        userID,
        username: user.displayName || user.email?.split('@')[0] || 'Unknown',
        state: "private",
        videoURL,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // No photos, title, description, or categories yet
      });

      // 3. Update context state (optional)
      setCurrentVostcard({
        ...currentVostcard,
        id: vostcardId,
        video: currentVostcard.video,
        videoURL,
        state: "private",
        userID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 4. Optionally, refresh the private vostcards list
      await loadPrivateVostcards();

    } catch (error) {
      console.error('Error saving Vostcard:', error);
      alert('Failed to save Vostcard. Please try again.');
    }
  };

  // ✅ Load Vostcard from Firebase
  const loadVostcard = async (id: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('🔐 No user authenticated, cannot load Vostcard');
        return;
      }

      console.log('🔍 Loading Vostcard from Firebase:', id);
      
      const docRef = doc(db, 'vostcards', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Load video and photos from Firebase Storage
        let video = null;
        let photos: Blob[] = [];
        
        if (data.videoURL) {
          console.log('🔍 Loading video from Firebase Storage...');
          const videoResponse = await fetch(data.videoURL);
          video = await videoResponse.blob();
        }
        
        if (data.photoURLs && data.photoURLs.length > 0) {
          console.log('🔍 Loading photos from Firebase Storage...');
          for (const photoURL of data.photoURLs) {
            const photoResponse = await fetch(photoURL);
            const photoBlob = await photoResponse.blob();
            photos.push(photoBlob);
          }
        }
        
        const vostcard: Vostcard = {
          id: data.id,
          state: data.state,
          video,
          title: data.title || '',
          description: data.description || '',
          photos,
          categories: data.categories || [],
          geo: data.latitude && data.longitude ? {
            latitude: data.latitude,
            longitude: data.longitude
          } : null,
          username: data.username || '',
          userID: data.userID || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || '',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || '',
          videoURL: data.videoURL,
          photoURLs: data.photoURLs || []
        };
        
        console.log('✅ Vostcard loaded successfully');
        setCurrentVostcard(vostcard);
      } else {
        console.log('❌ Vostcard not found');
      }
      
    } catch (error) {
      console.error('❌ Error loading Vostcard:', error);
      alert('Failed to load Vostcard. Please try again.');
    }
  };

  // ✅ Clear current Vostcard
  const clearVostcard = () => {
    console.log('🗑️ Clearing current Vostcard');
    setCurrentVostcard(null);
  };

  // ✅ Post Vostcard (change state from private to posted)
  const postVostcard = async () => {
    if (!currentVostcard) {
      alert('No Vostcard to post');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('Please log in to post Vostcards');
      return;
    }

    try {
      console.log('📤 Posting Vostcard...');
      
      const docRef = doc(db, 'vostcards', currentVostcard.id);
      await updateDoc(docRef, {
        state: 'posted',
        updatedAt: Timestamp.now()
      });

      console.log('✅ Vostcard posted successfully');
      alert('Vōstcard posted successfully!');
      
      // Refresh the list
      await loadPrivateVostcards();
      
    } catch (error) {
      console.error('❌ Error posting Vostcard:', error);
      alert('Failed to post Vostcard. Please try again.');
    }
  };

  return (
    <VostcardContext.Provider
      value={{
        currentVostcard,
        setCurrentVostcard,
        setVideo,
        setGeo,
        updateVostcard,
        saveVostcard,
        loadVostcard,
        clearVostcard,
        postVostcard,
        privateVostcards,
        loadPrivateVostcards,
      }}
    >
      {children}
    </VostcardContext.Provider>
  );
};

export const useVostcard = () => {
  const context = useContext(VostcardContext);
  if (!context) {
    throw new Error('useVostcard must be used within a VostcardProvider');
  }
  return context;
};