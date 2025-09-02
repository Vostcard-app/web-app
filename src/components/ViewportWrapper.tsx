import React from 'react';
import { useViewportMode, getMobileFrameStyles } from '../hooks/useViewportMode';
import { MobileFrameDecorations } from './MobileFrameDecorations';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

interface ViewportWrapperProps {
  children: React.ReactNode;
}

const ViewportWrapper: React.FC<ViewportWrapperProps> = ({ children }) => {
  const config = useViewportMode();
  const deviceInfo = useDeviceDetection();
  const styles = getMobileFrameStyles(config);

  // On actual mobile devices, don't show the artificial frame
  if (deviceInfo.isMobile || deviceInfo.isTablet) {
    return (
      <div style={{ width: '100%', minHeight: '100vh' }}>
        {children}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Mobile Frame Decorations (notch, home indicator) */}
        <MobileFrameDecorations />
        
        {/* Page Content */}
        <div style={{
          width: '100%',
          minHeight: config.showMobileFrame ? 'calc(100vh - 80px)' : '100vh',
          paddingTop: config.showMobileFrame ? '32px' : '0',
          paddingBottom: config.showMobileFrame ? '16px' : '0',
          overflow: 'auto'
        }}>
          {children}
        </div>
      </div>
      
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          {config.mode} | {deviceInfo.deviceType}
        </div>
      )}
    </div>
  );
};

export default ViewportWrapper;
