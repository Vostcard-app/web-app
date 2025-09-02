import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  userAgent: string;
  platform: string;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    // Initial detection (runs once on mount)
    if (typeof window === 'undefined') {
      // Server-side rendering fallback
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        screenWidth: 1920,
        screenHeight: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        userAgent: '',
        platform: ''
      };
    }

    return detectDevice();
  });

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(detectDevice());
    };

    const handleOrientationChange = () => {
      // Small delay to ensure screen dimensions are updated
      setTimeout(() => {
        setDeviceInfo(detectDevice());
      }, 100);
    };

    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    // Listen for orientation changes (mobile devices)
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen for screen orientation API if available
    if (screen && screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      if (screen && screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  return deviceInfo;
};

// Helper function to detect device characteristics
const detectDevice = (): DeviceInfo => {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // Check for touch capability
  const isTouchDevice = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0
  );

  // User Agent based detection
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletRegex = /iPad|Android(?=.*Tablet)|Tablet/i;
  const iPhoneRegex = /iPhone/i;
  const iPadRegex = /iPad/i;
  const androidRegex = /Android/i;

  // Screen size based detection (more reliable for responsive design)
  const isMobileByScreen = screenWidth <= 768;
  const isTabletByScreen = screenWidth > 768 && screenWidth <= 1024;
  const isDesktopByScreen = screenWidth > 1024;

  // Combined detection (user agent + screen size)
  const isMobileUA = mobileRegex.test(userAgent) && !tabletRegex.test(userAgent);
  const isTabletUA = tabletRegex.test(userAgent);
  
  // Final determination
  const isMobile = isMobileUA || (isMobileByScreen && isTouchDevice);
  const isTablet = isTabletUA || (isTabletByScreen && isTouchDevice && !isMobile);
  const isDesktop = !isMobile && !isTablet;

  // Determine device type
  let deviceType: 'mobile' | 'tablet' | 'desktop';
  if (isMobile) {
    deviceType = 'mobile';
  } else if (isTablet) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }

  // Determine orientation
  const orientation: 'portrait' | 'landscape' = screenWidth < screenHeight ? 'portrait' : 'landscape';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenWidth,
    screenHeight,
    deviceType,
    orientation,
    userAgent,
    platform
  };
};

// Additional utility functions for specific device checks
export const useIsMobile = (): boolean => {
  const { isMobile } = useDeviceDetection();
  return isMobile;
};

export const useIsTablet = (): boolean => {
  const { isTablet } = useDeviceDetection();
  return isTablet;
};

export const useIsDesktop = (): boolean => {
  const { isDesktop } = useDeviceDetection();
  return isDesktop;
};

export const useIsTouchDevice = (): boolean => {
  const { isTouchDevice } = useDeviceDetection();
  return isTouchDevice;
};

// Breakpoint-based hooks for responsive design
export const useBreakpoint = () => {
  const { screenWidth } = useDeviceDetection();
  
  return {
    isXs: screenWidth < 576,      // Extra small devices
    isSm: screenWidth >= 576 && screenWidth < 768,  // Small devices
    isMd: screenWidth >= 768 && screenWidth < 992,  // Medium devices
    isLg: screenWidth >= 992 && screenWidth < 1200, // Large devices
    isXl: screenWidth >= 1200,   // Extra large devices
    screenWidth
  };
};

// Device-specific styling helper
export const getDeviceStyles = (deviceInfo: DeviceInfo) => {
  const baseStyles = {
    mobile: {
      padding: '12px',
      fontSize: '14px',
      maxWidth: '100%'
    },
    tablet: {
      padding: '16px',
      fontSize: '16px',
      maxWidth: '768px'
    },
    desktop: {
      padding: '24px',
      fontSize: '16px',
      maxWidth: '1200px'
    }
  };

  return baseStyles[deviceInfo.deviceType];
};
