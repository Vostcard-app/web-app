import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { VostcardProvider } from './context/VostcardContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VostcardProvider>
      <App />
    </VostcardProvider>
  </StrictMode>
);