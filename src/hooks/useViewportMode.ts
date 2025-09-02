import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDeviceDetection } from './useDeviceDetection';

export type ViewportMode = 'mobile-frame' | 'full-screen';

export interface ViewportConfig {
  mode: ViewportMode;
  maxWidth?: string;
  backgroundColor?: string;
  showMobileFrame?: boolean;
}

// Configuration for which pages should use full screen vs mobile frame
const FULL_SCREEN_PAGES = [
  // Admin and management pages
  '/admin',
  '/admin/*',
  '/advertiser-portal',
  '/business-profile/*',
  '/booking-management',
  
  // Detailed content pages
  '/guided-tour/*',
  '/tour-detail/*',
  '/device-detection-demo',
  
  // Creation and editing pages
  '/create-guided-tour',
  '/edit-store-profile',
  '/create-offer',
  
  // Settings and configuration
  '/account-settings',
  '/settings',
  
  // Map and location-based views
  '/tour-map/*',
  '/tours-near-me',
  
  // Any page with query parameter ?fullscreen=true
];

// Pages that should always use mobile frame (even on desktop)
const MOBILE_FRAME_PAGES = [
  '/home',
  '/vostcard/*',
  '/user-profile/*',
  '/tours-view',
  '/quickcards',
  '/following',
  '/notifications',
  '/messages',
  '/camera',
  '/post-creation',
];

export const useViewportMode = (): ViewportConfig => {
  const location = useLocation();
  const deviceInfo = useDeviceDetection();
  const [viewportConfig, setViewportConfig] = useState<ViewportConfig>(() => 
    getViewportConfig(location.pathname, location.search, deviceInfo.isDesktop)
  );

  useEffect(() => {
    const config = getViewportConfig(location.pathname, location.search, deviceInfo.isDesktop);
    setViewportConfig(config);
  }, [location.pathname, location.search, deviceInfo.isDesktop]);

  return viewportConfig;
};

// Helper function to determine viewport configuration
const getViewportConfig = (pathname: string, search: string, isDesktop: boolean): ViewportConfig => {
  // Check for fullscreen query parameter
  const urlParams = new URLSearchParams(search);
  const forceFullscreen = urlParams.get('fullscreen') === 'true';
  const forceMobileFrame = urlParams.get('mobile-frame') === 'true';

  // If on mobile device, always use full screen (no artificial frame)
  if (!isDesktop) {
    return {
      mode: 'full-screen',
      maxWidth: '100%',
      backgroundColor: 'transparent',
      showMobileFrame: false
    };
  }

  // Force modes via query parameters
  if (forceFullscreen) {
    return {
      mode: 'full-screen',
      maxWidth: '100%',
      backgroundColor: '#f8f9fa',
      showMobileFrame: false
    };
  }

  if (forceMobileFrame) {
    return {
      mode: 'mobile-frame',
      maxWidth: '414px', // iPhone Pro Max width
      backgroundColor: '#f0f0f0',
      showMobileFrame: true
    };
  }

  // Check if current path matches full-screen pages
  const isFullScreenPage = FULL_SCREEN_PAGES.some(pattern => {
    if (pattern.endsWith('/*')) {
      const basePath = pattern.slice(0, -2);
      return pathname.startsWith(basePath);
    }
    return pathname === pattern;
  });

  // Check if current path matches mobile-frame pages
  const isMobileFramePage = MOBILE_FRAME_PAGES.some(pattern => {
    if (pattern.endsWith('/*')) {
      const basePath = pattern.slice(0, -2);
      return pathname.startsWith(basePath);
    }
    return pathname === pattern;
  });

  // Explicit mobile frame pages
  if (isMobileFramePage) {
    return {
      mode: 'mobile-frame',
      maxWidth: '414px',
      backgroundColor: '#f0f0f0',
      showMobileFrame: true
    };
  }

  // Explicit full screen pages
  if (isFullScreenPage) {
    return {
      mode: 'full-screen',
      maxWidth: '100%',
      backgroundColor: '#f8f9fa',
      showMobileFrame: false
    };
  }

  // Default: mobile frame for main app pages
  return {
    mode: 'mobile-frame',
    maxWidth: '414px',
    backgroundColor: '#f0f0f0',
    showMobileFrame: true
  };
};

// Hook to check if current page should use full screen
export const useIsFullScreen = (): boolean => {
  const { mode } = useViewportMode();
  return mode === 'full-screen';
};

// Hook to check if current page should show mobile frame
export const useShowMobileFrame = (): boolean => {
  const { showMobileFrame } = useViewportMode();
  return showMobileFrame || false;
};

// Utility function to get mobile frame styles
export const getMobileFrameStyles = (config: ViewportConfig) => {
  if (config.mode === 'full-screen') {
    return {
      container: {
        width: '100%',
        height: '100vh',
        backgroundColor: config.backgroundColor,
        overflow: 'auto'
      },
      content: {
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'white'
      }
    };
  }

  // Mobile frame styles
  return {
    container: {
      width: '100%',
      minHeight: '100vh',
      backgroundColor: config.backgroundColor,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '20px 0'
    },
    content: {
      width: '100%',
      maxWidth: config.maxWidth,
      minHeight: 'calc(100vh - 40px)',
      backgroundColor: 'white',
      borderRadius: config.showMobileFrame ? '24px' : '0',
      boxShadow: config.showMobileFrame ? '0 8px 32px rgba(0, 0, 0, 0.12)' : 'none',
      border: config.showMobileFrame ? '8px solid #333' : 'none',
      overflow: 'hidden',
      position: 'relative'
    }
  };
};

// Note: MobileFrameDecorations component moved to ../components/MobileFrameDecorations.tsx
// to avoid JSX in .ts files
