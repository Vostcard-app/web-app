// src/context/VostcardContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VostcardContextType {
  video: string | null;
  setVideo: (video: string) => void;

  photo1: string | null;
  setPhoto1: (photo: string) => void;

  photo2: string | null;
  setPhoto2: (photo: string) => void;

  activePhotoSlot: 'photo1' | 'photo2' | null;
  setActivePhotoSlot: (slot: 'photo1' | 'photo2' | null) => void;

  setPhoto: (photo: string) => void;
}

const VostcardContext = createContext<VostcardContextType | undefined>(undefined);

export const VostcardProvider = ({ children }: { children: ReactNode }) => {
  const [video, setVideo] = useState<string | null>(null);
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [activePhotoSlot, setActivePhotoSlot] = useState<'photo1' | 'photo2' | null>(null);

  const setPhoto = (photo: string) => {
    if (activePhotoSlot === 'photo1') setPhoto1(photo);
    else if (activePhotoSlot === 'photo2') setPhoto2(photo);
  };

  return (
    <VostcardContext.Provider value={{
      video, setVideo,
      photo1, setPhoto1,
      photo2, setPhoto2,
      activePhotoSlot, setActivePhotoSlot,
      setPhoto
    }}>
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