import React, { createContext, useContext, useState, ReactNode } from "react";

interface ScriptLibraryContextType {
  scripts: Script[];
  currentScript: Script | null;
  setCurrentScript: (script: Script | null) => void;
  fetchScripts: () => Promise<void>;
}

const ScriptLibraryContext = createContext<ScriptLibraryContextType>({
  scripts: [],
  currentScript: null,
  setCurrentScript: () => {},
  fetchScripts: async () => {},
});

export const useScriptLibrary = () => useContext(ScriptLibraryContext);

export const ScriptLibraryProvider = ({ children }: { children: ReactNode }) => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);

  const fetchScripts = async () => {
    // Dummy fetch, replace with real logic
    setScripts([]);
  };

  return (
    <ScriptLibraryContext.Provider value={{ scripts, currentScript, setCurrentScript, fetchScripts }}>
      {children}
    </ScriptLibraryContext.Provider>
  );
};

export default ScriptLibraryProvider;