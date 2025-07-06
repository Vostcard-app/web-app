// src/context/ScriptLibraryContext.ts

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Script } from "../types/ScriptModel";

// Define the context type
interface ScriptLibraryContextType {
  scripts: Script[];
  addScript: (script: Script) => void;
  removeScript: (id: string) => void;
}

// Create the context with default values
const ScriptLibraryContext = createContext<ScriptLibraryContextType>({
  scripts: [],
  addScript: () => {},
  removeScript: () => {},
});

// Provider component
export const ScriptLibraryProvider = ({ children }: { children: ReactNode }) => {
  const [scripts, setScripts] = useState<Script[]>([
    // Example initial script
    // { id: "1", title: "Welcome", content: "Hello, this is your script!" }
  ]);

  const addScript = (script: Script) => setScripts((prev) => [...prev, script]);
  const removeScript = (id: string) =>
    setScripts((prev) => prev.filter((s) => s.id !== id));

  return (
    <ScriptLibraryContext.Provider value={{ scripts, addScript, removeScript }}>
      {children}
    </ScriptLibraryContext.Provider>
  );
};

// Custom hook for easy usage
export const useScriptLibrary = () => useContext(ScriptLibraryContext);