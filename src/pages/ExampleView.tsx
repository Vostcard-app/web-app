import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

const ExampleView: React.FC = () => {
  const { isContainerized, containerWidth } = useResponsive();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      // Remove any existing desktop-specific styling since ResponsiveContainer handles it
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', // Use sticky instead of fixed for better container behavior
        top: 0,
        zIndex: 10,
        backgroundColor: '#fff',
        padding: '16px',
        borderBottom: '1px solid #eee'
      }}>
        <h1>Example View</h1>
      </div>

      {/* Content */}
      <div style={{ 
        padding: '20px',
        flex: 1
      }}>
        <h2>This is an example view</h2>
        <p>Container width: {containerWidth}</p>
        <p>Is containerized: {isContainerized ? 'Yes' : 'No'}</p>
        
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <p>This example shows how ResponsiveContainer works:</p>
          <ul>
            <li>On desktop: Shows in a mobile-sized container</li>
            <li>On mobile: Uses full screen</li>
            <li>Responsive behavior handled automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExampleView; 