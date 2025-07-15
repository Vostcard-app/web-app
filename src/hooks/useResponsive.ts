import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useResponsive = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      setIsMobile(!desktop);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define routes that should be fullscreen even on desktop
  const fullscreenRoutes = [
    '/home',
    '/browse-area',
    '/camera',
    '/scrolling-camera',
    '/create-step1',
    '/pin-placer'
  ];

  const isFullscreen = fullscreenRoutes.includes(location.pathname);
  const isContainerized = isDesktop && !isFullscreen;

  return {
    isDesktop,
    isMobile,
    isFullscreen,
    isContainerized,
    containerWidth: isContainerized ? 390 : '100%',
    containerHeight: isContainerized ? 844 : '100vh'
  };
}; 