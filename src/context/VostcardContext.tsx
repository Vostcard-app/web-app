import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// ✅ Types
export interface VostcardContextType {
  video: string | null;
  setVideo: (url: string | null) => void;
  photo1: string | null;
  setPhoto1: (url: string | null) => void;
  photo2: string | null;
  setPhoto2: (url: string | null) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  categories: string[];
  setCategories: (c: string[]) => void;
  activePhoto: 'photo1' | 'photo2' | null;
  setActivePhoto: (which: 'photo1' | 'photo2' | null) => void;
}

// ✅ Create Context
const VostcardContext = createContext<VostcardContextType | undefined>(undefined);

// ✅ Provider
export const VostcardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [video, setVideo] = useState<string | null>(null);
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState<'photo1' | 'photo2' | null>(null);

  // ✅ Optional: Persist state to IndexedDB/localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vostcard');
    if (saved) {
      const data = JSON.parse(saved);
      setVideo(data.video || null);
      setPhoto1(data.photo1 || null);
      setPhoto2(data.photo2 || null);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setCategories(data.categories || []);
    }
  }, []);

  useEffect(() => {
    const data = {
      video,
      photo1,
      photo2,
      title,
      description,
      categories,
    };
    localStorage.setItem('vostcard', JSON.stringify(data));
  }, [video, photo1, photo2, title, description, categories]);

  return (
    <VostcardContext.Provider
      value={{
        video,
        setVideo,
        photo1,
        setPhoto1,
        photo2,
        setPhoto2,
        title,
        setTitle,
        description,
        setDescription,
        categories,
        setCategories,
        activePhoto,
        setActivePhoto,
      }}
    >
      {children}
    </VostcardContext.Provider>
  );
};

// ✅ Hook for easy use
export const useVostcard = (): VostcardContextType => {
  const context = useContext(VostcardContext);
  if (!context) {
    throw new Error('useVostcard must be used within a VostcardProvider');
  }
  return context;
};