import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // ✅ Import the AuthProvider
import { PreferencesProvider } from './context/PreferencesContext';

const DB_VERSION = 2;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider> {/* ✅ Wrap the app in AuthProvider */}
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </AuthProvider>
  </StrictMode>
);