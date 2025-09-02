import React from 'react';
import { useViewportMode } from '../hooks/useViewportMode';

// Component to add mobile frame visual elements
export const MobileFrameDecorations: React.FC = () => {
  const config = useViewportMode();
  
  if (!config.showMobileFrame) return null;

  return (
    <>
      {/* Notch */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '150px',
        height: '28px',
        backgroundColor: '#333',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px',
        zIndex: 1000
      }} />
      
      {/* Home Indicator */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '134px',
        height: '5px',
        backgroundColor: '#333',
        borderRadius: '3px',
        zIndex: 1000
      }} />
    </>
  );
};
