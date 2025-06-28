import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Vostcard {
  id: string;
  state: 'private';
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
  setVideo: (video: Blob) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  saveLocalVostcard: () => void;
  loadLocalVostcard: (id: string) => void;
  clearVostcard: () => void;
}

const VostcardContext = createContext<VostcardContextProps | undefined>(undefined);

export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);

  // ✅ Create or update video
  const setVideo = (video: Blob) => {
    if (currentVostcard) {
      setCurrentVostcard({ ...currentVostcard, video, updatedAt: new Date().toISOString() });
    } else {
      const newVostcard = {
        id: uuidv4(),
        state: 'private' as const,
        video,
        title: '',
        description: '',
        photos: [],
        categories: [],
        geo: null,
        username: '', // You can load from auth context
        userId: '',   // You can load from auth context
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

  return (
    <VostcardContext.Provider
      value={{
        currentVostcard,
        setVideo,
        setGeo,
        updateVostcard,
        saveLocalVostcard,
        loadLocalVostcard,
        clearVostcard,
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