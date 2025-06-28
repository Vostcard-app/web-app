import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

export interface Vostcard {
  id: string;
  state: 'private' | 'posted';
  video: Blob | null;
  title: string;
  description: string;
  photos: string[];
  categories: string[];
  geo: { latitude: number; longitude: number } | null;
  username: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface VostcardContextProps {
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  setVideo: (video: Blob) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  saveLocalVostcard: () => void;
  loadLocalVostcard: (id: string) => void;
  clearVostcard: () => void;
  postVostcard: () => Promise<void>;
}

const VostcardContext = createContext<VostcardContextProps | undefined>(undefined);

export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);

  // ✅ Create or update video
  const setVideo = (video: Blob) => {
    if (currentVostcard) {
      setCurrentVostcard({ ...currentVostcard, video, updatedAt: new Date().toISOString() });
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
        userId: user?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentVostcard(newVostcard);
    }
  };

  // ✅ Update geolocation
  const setGeo = (geo: { latitude: number; longitude: number }) => {
    if (currentVostcard) {
      setCurrentVostcard({ ...currentVostcard, geo, updatedAt: new Date().toISOString() });
    }
  };

  // ✅ General updates (title, description, categories, etc.)
  const updateVostcard = (updates: Partial<Vostcard>) => {
    if (currentVostcard) {
      setCurrentVostcard({
        ...currentVostcard,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // ✅ Save to localStorage
  const saveLocalVostcard = () => {
    if (!currentVostcard) return;
    const existing = JSON.parse(localStorage.getItem('localVostcards') || '[]');
    const updated = [
      ...existing.filter((v: Vostcard) => v.id !== currentVostcard.id),
      currentVostcard,
    ];
    localStorage.setItem('localVostcards', JSON.stringify(updated));
  };

  // ✅ Load from localStorage
  const loadLocalVostcard = (id: string) => {
    const existing: Vostcard[] = JSON.parse(localStorage.getItem('localVostcards') || '[]');
    const found = existing.find((v) => v.id === id);
    if (found) {
      setCurrentVostcard(found);
    }
  };

  // ✅ Clear current Vostcard
  const clearVostcard = () => {
    setCurrentVostcard(null);
  };

  // Post Vostcard to Firestore and Storage
  const postVostcard = async () => {
    if (!currentVostcard) return;

    if (
      !currentVostcard.video ||
      currentVostcard.photos.length < 2 ||
      !currentVostcard.title ||
      !currentVostcard.description ||
      currentVostcard.categories.length === 0 ||
      !currentVostcard.geo
    ) {
      alert('All fields are required to post.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('User not authenticated');
      return;
    }

    try {
      const vostcardId = currentVostcard.id;
      const videoRef = ref(getStorage(), `vostcards/${vostcardId}/video.webm`);
      const videoSnap = await uploadBytes(videoRef, currentVostcard.video);
      const videoURL = await getDownloadURL(videoSnap.ref);

      const photoURLs = [];
      for (let i = 0; i < currentVostcard.photos.length; i++) {
        const photoBlob = currentVostcard.photos[i];
        const photoRef = ref(getStorage(), `vostcards/${vostcardId}/photo_${i}.jpg`);
        const photoSnap = await uploadBytes(photoRef, photoBlob);
        const photoURL = await getDownloadURL(photoSnap.ref);
        photoURLs.push(photoURL);
      }

      const username = user.displayName || user.email?.split('@')[0] || 'Unknown';

      const docRef = doc(getFirestore(), 'vostcards', vostcardId);
      await setDoc(docRef, {
        id: vostcardId,
        userId: user.uid,
        username,
        title: currentVostcard.title,
        description: currentVostcard.description,
        categories: currentVostcard.categories,
        videoURL,
        photoURLs,
        geo: currentVostcard.geo,
        createdAt: currentVostcard.createdAt,
        updatedAt: new Date().toISOString(),
        state: 'posted',
      });

      alert('Vōstcard posted successfully!');
    } catch (error) {
      console.error('Failed to post Vostcard:', error);
      alert('Failed to post Vostcard.');
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
        saveLocalVostcard,
        loadLocalVostcard,
        clearVostcard,
        postVostcard, // ← added
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