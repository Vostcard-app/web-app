import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  fullscreen?: boolean; // For views that need full screen (maps, camera, etc.)
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  fullscreen = false 
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const location = useLocation();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define routes that should be fullscreen even on desktop
  const fullscreenRoutes = [
    '/home',           // Map view
    '/browse-area',    // Map view
    '/camera',         // Camera view
    '/scrolling-camera', // Camera view
    '/create-step1',   // Camera creation
    '/pin-placer'      // Map tools
  ];

  // Check if current route should be fullscreen
  const shouldBeFullscreen = fullscreen || fullscreenRoutes.includes(location.pathname);

  // If it's mobile or should be fullscreen, render normally
  if (!isDesktop || shouldBeFullscreen) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh',
        overflow: 'hidden' 
      }}>
        {children}
      </div>
    );
  }

  // Desktop responsive container with 9:16 aspect ratio
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0', // Light gray background
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center', // Center vertically
      padding: '20px' // Padding around the container
    }}>
      {/* Mobile-style container */}
      <div style={{
        width: '390px', // iPhone 12 Pro width
        height: '844px', // iPhone 12 Pro height (9:16 aspect ratio)
        backgroundColor: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', // Enhanced shadow
        borderRadius: '24px', // More rounded for modern look
        overflow: 'hidden', // Ensure content doesn't escape rounded corners
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Content container with proper scrolling */}
        <div style={{
          flex: 1,
          overflow: 'auto', // Enable scrolling within the container
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on webkit
          position: 'relative'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveContainer; 