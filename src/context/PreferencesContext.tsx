import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserPreferences {
  contactAccessEnabled: boolean;
  allowContactImport: boolean;
  allowGoogleContacts: boolean;
  allowNativeContacts: boolean;
  // Map Filter Preferences
  persistentFilters: {
    enabled: boolean;
    selectedCategories: string[];
    selectedTypes: string[];
    showFriendsOnly: boolean;
    showCreatorsIFollow: boolean;
    showGuidesOnly: boolean;
  };
}

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  updateFilterPreference: <K extends keyof UserPreferences['persistentFilters']>(
    key: K, 
    value: UserPreferences['persistentFilters'][K]
  ) => void;
  saveCurrentFiltersAsDefaults: (filters: {
    selectedCategories: string[];
    selectedTypes: string[];
    showFriendsOnly: boolean;
    showCreatorsIFollow: boolean;
    showGuidesOnly: boolean;
  }) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  contactAccessEnabled: false, // Default to disabled to prevent iOS notification
  allowContactImport: false,
  allowGoogleContacts: false,
  allowNativeContacts: false,
  persistentFilters: {
    enabled: false, // Default to disabled so users opt-in
    selectedCategories: [],
    selectedTypes: [],
    showFriendsOnly: false,
    showCreatorsIFollow: false,
    showGuidesOnly: true, // This was the existing default
  },
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vostcard_user_preferences');
      if (stored) {
        const parsedPreferences = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsedPreferences });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('vostcard_user_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }, [preferences]);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateFilterPreference = <K extends keyof UserPreferences['persistentFilters']>(
    key: K,
    value: UserPreferences['persistentFilters'][K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      persistentFilters: {
        ...prev.persistentFilters,
        [key]: value
      }
    }));
  };

  const saveCurrentFiltersAsDefaults = (filters: {
    selectedCategories: string[];
    selectedTypes: string[];
    showFriendsOnly: boolean;
    showCreatorsIFollow: boolean;
    showGuidesOnly: boolean;
  }) => {
    setPreferences(prev => ({
      ...prev,
      persistentFilters: {
        ...prev.persistentFilters,
        ...filters
      }
    }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreference,
        updateFilterPreference,
        saveCurrentFiltersAsDefaults,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};
