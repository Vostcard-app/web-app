import React from 'react';
import { createPortal } from 'react-dom';

interface GlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const GlobalModal: React.FC<GlobalModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  // Render modal outside the responsive container using portal
  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999 // Higher than responsive container
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default GlobalModal; 