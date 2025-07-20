// Central export for all contexts - New Focused Architecture

// Core contexts
export { AuthProvider, useAuth } from './AuthContext';

// Focused Vostcard contexts (replacing the massive VostcardContext)
export { VostcardStorageProvider, useVostcardStorage } from './VostcardStorageContext';
export { VostcardEditProvider, useVostcardEdit } from './VostcardEditContext';

// Existing specialized contexts
export { ScriptProvider, useScripts } from './ScriptContext';
export { ScriptLibraryProvider, useScriptLibrary } from './ScriptLibraryContext';
export { FollowingProvider, useFollowing } from './FollowingContext';

// Legacy context (to be gradually replaced)
export { VostcardProvider, useVostcard } from './VostcardContext'; 