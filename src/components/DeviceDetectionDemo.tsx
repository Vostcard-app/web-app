import React from 'react';
import { 
  useDeviceDetection, 
  useIsMobile, 
  useIsTablet, 
  useIsDesktop, 
  useBreakpoint,
  getDeviceStyles 
} from '../hooks/useDeviceDetection';
import { FaMobile, FaTabletAlt, FaDesktop, FaInfo } from 'react-icons/fa';

const DeviceDetectionDemo: React.FC = () => {
  const deviceInfo = useDeviceDetection();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const breakpoint = useBreakpoint();
  const deviceStyles = getDeviceStyles(deviceInfo);

  return (
    <div style={{
      padding: deviceStyles.padding,
      maxWidth: deviceStyles.maxWidth,
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '24px' 
      }}>
        {isMobile && <FaMobile size={24} color="#007aff" />}
        {isTablet && <FaTabletAlt size={24} color="#28a745" />}
        {isDesktop && <FaDesktop size={24} color="#6f42c1" />}
        
        <h2 style={{ 
          margin: 0, 
          fontSize: isMobile ? '20px' : '24px',
          color: '#333'
        }}>
          Device Detection Demo
        </h2>
      </div>

      {/* Device Type Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: isMobile ? '#007aff' : '#f8f9fa',
          color: isMobile ? 'white' : '#333',
          borderRadius: '8px',
          border: isMobile ? 'none' : '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <FaMobile size={20} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '14px', fontWeight: '600' }}>Mobile</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {isMobile ? 'Current' : 'Not detected'}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: isTablet ? '#28a745' : '#f8f9fa',
          color: isTablet ? 'white' : '#333',
          borderRadius: '8px',
          border: isTablet ? 'none' : '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <FaTabletAlt size={20} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '14px', fontWeight: '600' }}>Tablet</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {isTablet ? 'Current' : 'Not detected'}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: isDesktop ? '#6f42c1' : '#f8f9fa',
          color: isDesktop ? 'white' : '#333',
          borderRadius: '8px',
          border: isDesktop ? 'none' : '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <FaDesktop size={20} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '14px', fontWeight: '600' }}>Desktop</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {isDesktop ? 'Current' : 'Not detected'}
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaInfo size={16} />
          Device Information
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '16px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              Device Type
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
              {deviceInfo.deviceType.charAt(0).toUpperCase() + deviceInfo.deviceType.slice(1)}
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              Screen Size
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
              {deviceInfo.screenWidth} × {deviceInfo.screenHeight}
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              Orientation
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
              {deviceInfo.orientation.charAt(0).toUpperCase() + deviceInfo.orientation.slice(1)}
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              Touch Device
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
              {deviceInfo.isTouchDevice ? 'Yes' : 'No'}
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              Breakpoint
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
              {breakpoint.isXs && 'XS (< 576px)'}
              {breakpoint.isSm && 'SM (576-768px)'}
              {breakpoint.isMd && 'MD (768-992px)'}
              {breakpoint.isLg && 'LG (992-1200px)'}
              {breakpoint.isXl && 'XL (> 1200px)'}
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              Platform
            </h4>
            <p style={{ margin: '0', fontSize: '16px' }}>
              {deviceInfo.platform || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Responsive Behavior Demo */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: deviceInfo.isMobile ? '#e3f2fd' : deviceInfo.isTablet ? '#f3e5f5' : '#fff3e0',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
          Responsive Styling Example
        </h4>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
          This section changes color based on device type:
          <br />
          📱 <strong>Blue</strong> for mobile devices
          <br />
          📱 <strong>Purple</strong> for tablets
          <br />
          🖥️ <strong>Orange</strong> for desktop computers
        </p>
      </div>

      {/* Usage Instructions */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#d4edda',
        borderRadius: '8px',
        border: '1px solid #c3e6cb'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#155724' }}>
          How to Use Device Detection
        </h4>
        <div style={{ fontSize: '14px', color: '#155724', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Import the hooks:</strong>
          </p>
          <code style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            import {`{ useDeviceDetection, useIsMobile }`} from '../hooks/useDeviceDetection';
          </code>
          
          <p style={{ margin: '12px 0 8px 0' }}>
            <strong>Use in your components:</strong>
          </p>
          <code style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            const isMobile = useIsMobile();
          </code>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetectionDemo;
