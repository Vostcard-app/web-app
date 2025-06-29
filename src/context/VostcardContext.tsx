import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth } from '../firebaseConfig.ts';

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
        userID: user?.uid || '',
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

  // Post Vostcard to Firestore and Storage - Updated to match iOS app structure
  const postVostcard = async () => {
    if (!currentVostcard) {
      console.error('No current Vostcard found');
      alert('No Vostcard data found. Please start over.');
      return;
    }

    // Debug all fields
    console.log('Posting Vostcard - Current data:', {
      video: !!currentVostcard.video,
      photosCount: currentVostcard.photos.length,
      title: currentVostcard.title,
      description: currentVostcard.description,
      categoriesCount: currentVostcard.categories.length,
      geo: currentVostcard.geo,
      latitude: currentVostcard.geo?.latitude,
      longitude: currentVostcard.geo?.longitude
    });

    // Check each field individually and provide specific feedback
    if (!currentVostcard.video) {
      console.error('Missing video');
      alert('Video is required. Please record a video first.');
      return;
    }

    if (currentVostcard.photos.length < 2) {
      console.error('Missing photos - need at least 2, have:', currentVostcard.photos.length);
      alert('At least 2 photos are required. Please add more photos.');
      return;
    }

    if (!currentVostcard.title || currentVostcard.title.trim() === '') {
      console.error('Missing title');
      alert('Title is required. Please enter a title.');
      return;
    }

    if (!currentVostcard.description || currentVostcard.description.trim() === '') {
      console.error('Missing description');
      alert('Description is required. Please enter a description.');
      return;
    }

    if (currentVostcard.categories.length === 0) {
      console.error('Missing categories');
      alert('At least one category is required. Please select categories.');
      return;
    }

    if (!currentVostcard.geo) {
      console.error('Missing geolocation');
      alert('Location is required. Please ensure location services are enabled and try recording again.');
      return;
    }

    if (!currentVostcard.geo.latitude || !currentVostcard.geo.longitude) {
      console.error('Invalid geolocation coordinates:', currentVostcard.geo);
      alert('Invalid location coordinates. Please try recording again.');
      return;
    }

    console.log('All validation passed - proceeding with posting');

    const user = auth.currentUser;
    if (!user) {
      alert('User not authenticated');
      return;
    }

    try {
      const vostcardId = currentVostcard.id;
      const userID = user.uid;
      
      // Upload video to Firebase Storage with iOS app path structure
      const videoRef = ref(getStorage(), `vostcards/${userID}/${vostcardId}/video.mov`);
      const videoSnap = await uploadBytes(videoRef, currentVostcard.video);
      const videoURL = await getDownloadURL(videoSnap.ref);

      // Upload photos to Firebase Storage with iOS app path structure
      const photoURLs = [];
      for (let i = 0; i < currentVostcard.photos.length; i++) {
        const photoBlob = currentVostcard.photos[i];
        const photoRef = ref(getStorage(), `vostcards/${userID}/${vostcardId}/photo_${i}.jpg`);
        const photoSnap = await uploadBytes(photoRef, photoBlob);
        const photoURL = await getDownloadURL(photoSnap.ref);
        photoURLs.push(photoURL);
      }

      const username = user.displayName || user.email?.split('@')[0] || 'Unknown';

      // Create Firestore document matching iOS app structure exactly
      const docRef = doc(getFirestore(), 'vostcards', vostcardId);
      await setDoc(docRef, {
        id: vostcardId,
        title: currentVostcard.title,
        description: currentVostcard.description,
        categories: currentVostcard.categories,
        username: username,
        userID: userID, // Use userID to match iOS app
        videoURL: videoURL,
        photoURLs: photoURLs,
        latitude: currentVostcard.geo.latitude, // Direct latitude field
        longitude: currentVostcard.geo.longitude, // Direct longitude field
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now(), // Use Firestore Timestamp
        likeCount: 0,
        likedByUsers: [],
        ratings: {},
        averageRating: 0.0,
        state: "posted" // Critical for map display - matches iOS app
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
        postVostcard,
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