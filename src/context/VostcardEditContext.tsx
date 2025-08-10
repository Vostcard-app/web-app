// VostcardEditContext - Manages the current vostcard being edited
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Vostcard } from '../types/VostcardTypes';
import { useVostcardStorage } from './VostcardStorageContext';
import { useAuth } from './AuthContext';

interface VostcardEditContextProps {
  // Editing state
  currentVostcard: Vostcard | null;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  editHistory: Vostcard[];
  editIndex: number;
  
  // Core editing operations
  startEditing: (vostcard: Vostcard) => void;
  saveChanges: () => Promise<void>;
  cancelEditing: () => void;
  discardChanges: () => void;
  
  // Field editing
  updateField: <K extends keyof Vostcard>(field: K, value: Vostcard[K]) => void;
  updateTitle: (title: string) => void;
  updateDescription: (description: string) => void;
  updateCategories: (categories: string[]) => void;
  updateLocation: (latitude: number, longitude: number) => void;
  updateVisibility: (visibility: 'private' | 'public') => void;
  
  // Media editing
  addPhoto: (photo: Blob) => void;
  removePhoto: (index: number) => void;
  reorderPhotos: (fromIndex: number, toIndex: number) => void;
  replacePhoto: (index: number, newPhoto: Blob) => void;
  updateVideo: (video: Blob | null) => void;
  addAudioFile: (audio: Blob) => void;
  removeAudioFile: (index: number) => void;
  
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
  validateVostcard: () => boolean;
}

const VostcardEditContext = createContext<VostcardEditContextProps | undefined>(undefined);

const MAX_EDIT_HISTORY = 20;
const REQUIRED_FIELDS: (keyof Vostcard)[] = ['title', 'description'];

export const VostcardEditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { saveToIndexedDB, saveToFirebase } = useVostcardStorage();
  
  // Editing state
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editHistory, setEditHistory] = useState<Vostcard[]>([]);
  const [editIndex, setEditIndex] = useState(-1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Computed properties
  const canUndo = editIndex > 0;
  const canRedo = editIndex < editHistory.length - 1;
  const isValid = validationErrors.length === 0;

  // Validation
  const validateVostcard = useCallback((vostcard: Vostcard): boolean => {
    const errors: string[] = [];
    
    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      const value = vostcard[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${field} is required`);
      }
    });
    
    // Check title length
    if (vostcard.title && vostcard.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }
    
    // Check description length
    if (vostcard.description && vostcard.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }
    
    // Check categories
    if (vostcard.categories && vostcard.categories.length > 10) {
      errors.push('Maximum 10 categories allowed');
    }
    
    // Check photos
    if (vostcard.photos && vostcard.photos.length > 20) {
      errors.push('Maximum 20 photos allowed');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, []);

  // Core editing operations
  const startEditing = useCallback((vostcard: Vostcard) => {
    if (isEditing && hasUnsavedChanges) {
      // Ask user if they want to save changes
      if (!window.confirm('You have unsaved changes. Do you want to save them before editing a new vostcard?')) {
        discardChanges();
      } else {
        saveChanges();
      }
    }
    
    // Create a deep copy for editing
    const editableVostcard = JSON.parse(JSON.stringify(vostcard));
    
    setCurrentVostcard(editableVostcard);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setEditHistory([editableVostcard]);
    setEditIndex(0);
    setValidationErrors([]);
    
    console.log('✏️ Started editing vostcard:', editableVostcard.id);
  }, [isEditing, hasUnsavedChanges]);

  const saveChanges = useCallback(async () => {
    if (!currentVostcard || !user) return;
    
    try {
      // Validate before saving
      if (!validateVostcard(currentVostcard)) {
        console.error('❌ Validation failed:', validationErrors);
        return;
      }
      
      // Update timestamps
      const updatedVostcard = {
        ...currentVostcard,
        updatedAt: new Date().toISOString(),
        lastEditedAt: new Date().toISOString()
      };
      
      // Save to IndexedDB first
      await saveToIndexedDB(updatedVostcard);
      
      // If it's a posted vostcard, also save to Firebase
      if (updatedVostcard.state === 'posted') {
        await saveToFirebase(updatedVostcard);
      }
      
      // Update current vostcard
      setCurrentVostcard(updatedVostcard);
      setHasUnsavedChanges(false);
      
      // Add to history
      setEditHistory(prev => {
        const newHistory = [...prev, updatedVostcard];
        if (newHistory.length > MAX_EDIT_HISTORY) {
          newHistory.shift();
        }
        return newHistory;
      });
      setEditIndex(prev => prev + 1);
      
      console.log('✅ Changes saved successfully');
      
    } catch (error) {
      console.error('❌ Failed to save changes:', error);
      throw error;
    }
  }, [currentVostcard, user, validateVostcard, validationErrors, saveToIndexedDB, saveToFirebase]);

  const cancelEditing = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    
    setIsEditing(false);
    setCurrentVostcard(null);
    setHasUnsavedChanges(false);
    setEditHistory([]);
    setEditIndex(-1);
    setValidationErrors([]);
    
    console.log('❌ Editing cancelled');
  }, [hasUnsavedChanges]);

  const discardChanges = useCallback(() => {
    if (editHistory.length > 0) {
      // Restore to last saved state
      const lastSaved = editHistory[editIndex];
      setCurrentVostcard(lastSaved);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      console.log('🔄 Changes discarded, restored to last saved state');
    } else {
      cancelEditing();
    }
  }, [editHistory, editIndex, cancelEditing]);

  // Field editing
  const updateField = useCallback(<K extends keyof Vostcard>(field: K, value: Vostcard[K]) => {
    if (!currentVostcard) return;
    
    const updatedVostcard = {
      ...currentVostcard,
      [field]: value
    };
    
    setCurrentVostcard(updatedVostcard);
    setHasUnsavedChanges(true);
    
    // Validate after update
    validateVostcard(updatedVostcard);
    
    console.log(`✏️ Updated ${field}:`, value);
  }, [currentVostcard, validateVostcard]);

  const updateTitle = useCallback((title: string) => {
    updateField('title', title);
  }, [updateField]);

  const updateDescription = useCallback((description: string) => {
    updateField('description', description);
  }, [updateField]);

  const updateCategories = useCallback((categories: string[]) => {
    updateField('categories', categories);
  }, [updateField]);

  const updateLocation = useCallback((latitude: number, longitude: number) => {
    updateField('geo', { latitude, longitude });
  }, [updateField]);

  const updateVisibility = useCallback((visibility: 'private' | 'public') => {
    updateField('visibility', visibility);
    // Also update state if changing visibility
    if (visibility === 'public') {
      updateField('state', 'posted');
    } else {
      updateField('state', 'private');
    }
  }, [updateField]);

  // Media editing
  const addPhoto = useCallback((photo: Blob) => {
    if (!currentVostcard) return;
    
    const updatedPhotos = [...(currentVostcard.photos || []), photo];
    updateField('photos', updatedPhotos);
  }, [currentVostcard, updateField]);

  const removePhoto = useCallback((index: number) => {
    if (!currentVostcard || !currentVostcard.photos) return;
    
    const updatedPhotos = currentVostcard.photos.filter((_, i) => i !== index);
    updateField('photos', updatedPhotos);
  }, [currentVostcard, updateField]);

  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    if (!currentVostcard || !currentVostcard.photos) return;
    
    const updatedPhotos = [...currentVostcard.photos];
    const [movedPhoto] = updatedPhotos.splice(fromIndex, 1);
    updatedPhotos.splice(toIndex, 0, movedPhoto);
    
    updateField('photos', updatedPhotos);
  }, [currentVostcard, updateField]);

  const replacePhoto = useCallback((index: number, newPhoto: Blob) => {
    if (!currentVostcard || !currentVostcard.photos) return;
    
    const updatedPhotos = [...currentVostcard.photos];
    updatedPhotos[index] = newPhoto;
    updateField('photos', updatedPhotos);
  }, [currentVostcard, updateField]);

  const updateVideo = useCallback((video: Blob | null) => {
    updateField('video', video);
  }, [updateField]);

  const addAudioFile = useCallback((audio: Blob) => {
    if (!currentVostcard) return;
    
    const updatedAudioFiles = [...(currentVostcard.audioFiles || []), audio];
    updateField('audioFiles', updatedAudioFiles);
  }, [currentVostcard, updateField]);

  const removeAudioFile = useCallback((index: number) => {
    if (!currentVostcard || !currentVostcard.audioFiles) return;
    
    const updatedAudioFiles = currentVostcard.audioFiles.filter((_, i) => i !== index);
    updateField('audioFiles', updatedAudioFiles);
  }, [currentVostcard, updateField]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (!canUndo) return;
    
    const newIndex = editIndex - 1;
    const previousVostcard = editHistory[newIndex];
    
    setCurrentVostcard(previousVostcard);
    setEditIndex(newIndex);
    setHasUnsavedChanges(false);
    setValidationErrors([]);
    
    console.log('↶ Undone to previous state');
  }, [canUndo, editIndex, editHistory]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    
    const newIndex = editIndex + 1;
    const nextVostcard = editHistory[newIndex];
    
    setCurrentVostcard(nextVostcard);
    setEditIndex(newIndex);
    setHasUnsavedChanges(false);
    setValidationErrors([]);
    
    console.log('↷ Redone to next state');
  }, [canRedo, editIndex, editHistory]);

  const value: VostcardEditContextProps = {
    // Editing state
    currentVostcard,
    isEditing,
    hasUnsavedChanges,
    editHistory,
    editIndex,
    
    // Core editing operations
    startEditing,
    saveChanges,
    cancelEditing,
    discardChanges,
    
    // Field editing
    updateField,
    updateTitle,
    updateDescription,
    updateCategories,
    updateLocation,
    updateVisibility,
    
    // Media editing
    addPhoto,
    removePhoto,
    reorderPhotos,
    replacePhoto,
    updateVideo,
    addAudioFile,
    removeAudioFile,
    
    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,
    
    // Validation
    isValid,
    validationErrors,
    validateVostcard,
  };

  return (
    <VostcardEditContext.Provider value={value}>
      {children}
    </VostcardEditContext.Provider>
  );
};

export const useVostcardEdit = () => {
  const context = useContext(VostcardEditContext);
  if (context === undefined) {
    throw new Error('useVostcardEdit must be used within a VostcardEditProvider');
  }
  return context;
}; 