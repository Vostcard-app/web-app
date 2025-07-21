// VostcardEditContext - Manages the current vostcard being edited
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { useVostcardStorage } from './VostcardStorageContext';
import type { Vostcard } from '../types/VostcardTypes';
import { getSafeUsername } from '../utils/vostcardUtils';

interface VostcardEditContextProps {
  // Current vostcard state
  currentVostcard: Vostcard | null;
  
  // Core editing operations
  createNewVostcard: () => void;
  loadVostcard: (id: string) => Promise<void>;
  saveVostcard: () => Promise<void>;
  clearVostcard: () => void;
  
  // Content updates
  setVideo: (video: Blob, geoOverride?: { latitude: number; longitude: number }) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  addPhoto: (photo: Blob) => void;
  updateContent: (updates: Partial<Vostcard>) => void;
  
  // Quickcard operations
  createQuickcard: (photo: Blob, geo: { latitude: number; longitude: number }) => void;
  loadQuickcard: (quickcard: Vostcard) => void;
  
  // Publishing
  publishVostcard: () => Promise<void>;
  
  // State
  isDirty: boolean; // Has unsaved changes
  isValid: boolean; // Ready for publishing
}

const VostcardEditContext = createContext<VostcardEditContextProps | undefined>(undefined);

export const VostcardEditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, username } = useAuth();
  const storage = useVostcardStorage();
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Helper to get safe username
  const getUsernameForVostcard = useCallback(() => {
    return getSafeUsername(username, user?.displayName, user?.email);
  }, [username, user]);

  // Create a new vostcard
  const createNewVostcard = useCallback(() => {
    if (!user) {
      console.warn('Cannot create vostcard: no user authenticated');
      return;
    }

    const newVostcard: Vostcard = {
      id: uuidv4(),
      state: 'private',
      video: null,
      title: '',
      description: '',
      photos: [],
      categories: [],
      geo: null,
      username: getUsernameForVostcard(),
      userID: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentVostcard(newVostcard);
    setIsDirty(true);
    console.log('✅ Created new vostcard:', newVostcard.id);
  }, [user, getUsernameForVostcard]);

  // Load an existing vostcard for editing
  const loadVostcard = useCallback(async (id: string) => {
    try {
      // Try IndexedDB first (has full content)
      let vostcard = await storage.loadFromIndexedDB(id);
      
      // Fallback to Firebase (metadata only)
      if (!vostcard) {
        vostcard = await storage.loadFromFirebase(id);
      }

      if (vostcard) {
        setCurrentVostcard(vostcard);
        setIsDirty(false);
        console.log('✅ Loaded vostcard for editing:', id);
      } else {
        throw new Error(`Vostcard ${id} not found`);
      }
    } catch (err) {
      console.error('❌ Failed to load vostcard:', err);
      throw err;
    }
  }, [storage]);

  // Save current vostcard
  const saveVostcard = useCallback(async () => {
    if (!currentVostcard) {
      throw new Error('No vostcard to save');
    }

    try {
      // Save to both IndexedDB and Firebase
      await Promise.all([
        storage.saveToIndexedDB(currentVostcard),
        storage.saveToFirebase(currentVostcard)
      ]);

      setIsDirty(false);
      console.log('✅ Vostcard saved:', currentVostcard.id);
    } catch (err) {
      console.error('❌ Failed to save vostcard:', err);
      throw err;
    }
  }, [currentVostcard, storage]);

  // Clear current vostcard
  const clearVostcard = useCallback(() => {
    setCurrentVostcard(null);
    setIsDirty(false);
    console.log('✅ Cleared current vostcard');
  }, []);

  // Set video and optionally override geo
  const setVideo = useCallback((video: Blob, geoOverride?: { latitude: number; longitude: number }) => {
    if (currentVostcard) {
      const updatedVostcard = {
        ...currentVostcard,
        video,
        geo: geoOverride || currentVostcard.geo,
        updatedAt: new Date().toISOString(),
      };
      setCurrentVostcard(updatedVostcard);
      setIsDirty(true);
    } else {
      // Create new vostcard if none exists
      if (user) {
        const newVostcard: Vostcard = {
          id: uuidv4(),
          state: 'private',
          video,
          title: '',
          description: '',
          photos: [],
          categories: [],
          geo: geoOverride || null,
          username: getUsernameForVostcard(),
          userID: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCurrentVostcard(newVostcard);
        setIsDirty(true);
      }
    }
  }, [currentVostcard, user, getUsernameForVostcard]);

  // Set geolocation
  const setGeo = useCallback((geo: { latitude: number; longitude: number }) => {
    if (currentVostcard) {
      const updatedVostcard = {
        ...currentVostcard,
        geo,
        username: getUsernameForVostcard(), // Always ensure correct username
        updatedAt: new Date().toISOString(),
      };
      setCurrentVostcard(updatedVostcard);
      setIsDirty(true);
    }
  }, [currentVostcard, getUsernameForVostcard]);

  // Add a photo
  const addPhoto = useCallback((photo: Blob) => {
    if (currentVostcard) {
      const updatedPhotos = [...currentVostcard.photos, photo];
      const updatedVostcard = {
        ...currentVostcard,
        photos: updatedPhotos,
        username: getUsernameForVostcard(), // Always ensure correct username
        updatedAt: new Date().toISOString(),
      };
      setCurrentVostcard(updatedVostcard);
      setIsDirty(true);
      console.log('✅ Added photo. Total photos:', updatedPhotos.length);
    }
  }, [currentVostcard, getUsernameForVostcard]);

  // Update content (title, description, categories, etc.)
  const updateContent = useCallback((updates: Partial<Vostcard>) => {
    if (currentVostcard) {
      const updatedVostcard = {
        ...currentVostcard,
        ...updates,
        username: getUsernameForVostcard(), // Always ensure correct username
        updatedAt: new Date().toISOString(),
      };
      setCurrentVostcard(updatedVostcard);
      setIsDirty(true);
    }
  }, [currentVostcard, getUsernameForVostcard]);

  // Create quickcard (photo + location)
  const createQuickcard = useCallback((photo: Blob, geo: { latitude: number; longitude: number }) => {
    if (!user) {
      console.warn('Cannot create quickcard: no user authenticated');
      return;
    }

    const quickcard: Vostcard = {
      id: uuidv4(),
      state: 'private',
      video: null, // Quickcards don't have videos
      title: '',
      description: '',
      photos: [photo],
      categories: [],
      geo,
      username: getUsernameForVostcard(),
      userID: user.uid,
      isQuickcard: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentVostcard(quickcard);
    setIsDirty(true);
    console.log('✅ Created quickcard:', quickcard.id);
  }, [user, getUsernameForVostcard]);

  // Load existing quickcard for editing
  const loadQuickcard = useCallback((quickcard: Vostcard) => {
    if (!quickcard.isQuickcard) {
      console.warn('Attempted to load non-quickcard as quickcard');
      return;
    }

    // Create a copy for editing to avoid mutating original
    const quickcardForEditing: Vostcard = {
      ...quickcard,
      state: 'private', // Reset to private when loading for editing
      updatedAt: new Date().toISOString(),
    };

    setCurrentVostcard(quickcardForEditing);
    setIsDirty(false);
    console.log('✅ Loaded quickcard for editing:', quickcard.id, quickcard.title);
  }, []);

  // Publish vostcard to public map
  const publishVostcard = useCallback(async () => {
    if (!currentVostcard) {
      throw new Error('No vostcard to publish');
    }

    // Validate before publishing
    if (!isValid) {
      throw new Error('Vostcard is not ready for publishing');
    }

    try {
      // Update to posted state
      const publishedVostcard = {
        ...currentVostcard,
        state: 'posted' as const,
        updatedAt: new Date().toISOString(),
      };

      // Save with posted state
      await storage.saveToFirebase(publishedVostcard);

      // Update local state
      setCurrentVostcard(publishedVostcard);
      setIsDirty(false);

      console.log('✅ Vostcard published:', currentVostcard.id);
    } catch (err) {
      console.error('❌ Failed to publish vostcard:', err);
      throw err;
    }
  }, [currentVostcard, storage]);

  // Check if vostcard is valid for publishing
  const isValid = useMemo(() => {
    if (!currentVostcard) return false;
    
    return !!currentVostcard.title?.trim() &&
      !!currentVostcard.description?.trim() &&
      (currentVostcard.categories?.length || 0) > 0 &&
      !!currentVostcard.geo &&
      (
        // Regular vostcard needs video + 2 photos
        (!currentVostcard.isQuickcard && !!currentVostcard.video && (currentVostcard.photos?.length || 0) >= 2) ||
        // Quickcard needs 1 photo (no video)
        (currentVostcard.isQuickcard && (currentVostcard.photos?.length || 0) >= 1)
      );
  }, [currentVostcard]);

  const value = {
    // Current vostcard state
    currentVostcard,
    
    // Core editing operations
    createNewVostcard,
    loadVostcard,
    saveVostcard,
    clearVostcard,
    
    // Content updates
    setVideo,
    setGeo,
    addPhoto,
    updateContent,
    
    // Quickcard operations
    createQuickcard,
    loadQuickcard,
    
    // Publishing
    publishVostcard,
    
    // State
    isDirty,
    isValid: isValid as boolean,
  };

  return (
    <VostcardEditContext.Provider value={value}>
      {children}
    </VostcardEditContext.Provider>
  );
};

export const useVostcardEdit = () => {
  const context = useContext(VostcardEditContext);
  if (!context) {
    throw new Error('useVostcardEdit must be used within a VostcardEditProvider');
  }
  return context;
}; 