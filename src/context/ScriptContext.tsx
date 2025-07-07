import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type { Script } from '../types/ScriptModel';
import { ScriptService } from '../services/scriptService';

interface ScriptContextType {
  scripts: Script[];
  currentScript: Script | null;
  loading: boolean;
  error: string | null;
  loadScripts: () => Promise<void>;
  createScript: (title: string, content: string) => Promise<Script>;
  updateScript: (scriptId: string, title: string, content: string) => Promise<void>;
  deleteScript: (scriptId: string) => Promise<void>;
  setCurrentScript: (script: Script | null) => void;
  searchScripts: (searchTerm: string) => Promise<Script[]>;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export const useScripts = () => {
  const context = useContext(ScriptContext);
  if (context === undefined) {
    throw new Error('useScripts must be used within a ScriptProvider');
  }
  return context;
};

export const ScriptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userID } = useAuth();

  const loadScripts = useCallback(async () => {
    if (!userID) {
      console.log('No user ID, skipping script load');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('📜 Loading scripts for user:', userID);

      const userScripts = await ScriptService.getUserScripts(userID);
      setScripts(userScripts);
      console.log(`✅ Loaded ${userScripts.length} scripts`);
    } catch (err) {
      console.error('❌ Error loading scripts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scripts');
    } finally {
      setLoading(false);
    }
  }, [userID]);

  const createScript = useCallback(async (title: string, content: string): Promise<Script> => {
    if (!userID) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const newScript = await ScriptService.createScript(userID, title, content);
      setScripts(prev => [newScript, ...prev]);
      console.log('✅ Script created and added to state');
      return newScript;
    } catch (err) {
      console.error('❌ Error creating script:', err);
      setError(err instanceof Error ? err.message : 'Failed to create script');
      throw err;
    }
  }, [userID]);

  const updateScript = useCallback(async (scriptId: string, title: string, content: string): Promise<void> => {
    if (!userID) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      await ScriptService.updateScript(userID, scriptId, title, content);

      setScripts(prev => prev.map(script =>
        script.id === scriptId
          ? { ...script, title, content, updatedAt: new Date().toISOString() }
          : script
      ));

      if (currentScript?.id === scriptId) {
        setCurrentScript(prev => prev ? { ...prev, title, content, updatedAt: new Date().toISOString() } : null);
      }

      console.log('✅ Script updated in state');
    } catch (err) {
      console.error('❌ Error updating script:', err);
      setError(err instanceof Error ? err.message : 'Failed to update script');
      throw err;
    }
  }, [userID, currentScript]);

  const deleteScript = useCallback(async (scriptId: string): Promise<void> => {
    if (!userID) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      await ScriptService.deleteScript(userID, scriptId);

      setScripts(prev => prev.filter(script => script.id !== scriptId));

      if (currentScript?.id === scriptId) {
        setCurrentScript(null);
      }

      console.log('✅ Script deleted from state');
    } catch (err) {
      console.error('❌ Error deleting script:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete script');
      throw err;
    }
  }, [userID, currentScript]);

  const searchScripts = useCallback(async (searchTerm: string): Promise<Script[]> => {
    if (!userID) {
      return [];
    }

    try {
      return await ScriptService.searchScripts(userID, searchTerm);
    } catch (err) {
      console.error('❌ Error searching scripts:', err);
      setError(err instanceof Error ? err.message : 'Failed to search scripts');
      return [];
    }
  }, [userID]);

  useEffect(() => {
    if (userID) {
      loadScripts();
    } else {
      setScripts([]);
      setCurrentScript(null);
    }
  }, [userID, loadScripts]);

  const value: ScriptContextType = {
    scripts,
    currentScript,
    loading,
    error,
    loadScripts,
    createScript,
    updateScript,
    deleteScript,
    setCurrentScript,
    searchScripts
  };

  return (
    <ScriptContext.Provider value={value}>
      {children}
    </ScriptContext.Provider>
  );
};

export const useScriptContext = useScripts;