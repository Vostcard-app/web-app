import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewportMode, useIsFullScreen, useShowMobileFrame } from '../hooks/useViewportMode';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { FaMobile, FaDesktop, FaExpand, FaCompress, FaArrowLeft } from 'react-icons/fa';

const ViewportModeDemo: React.FC = () => {
  const navigate = useNavigate();
  const config = useViewportMode();
  const isFullScreen = useIsFullScreen();
  const showMobileFrame = useShowMobileFrame();
  const deviceInfo = useDeviceDetection();

  const demoPages = [
    {
      category: '📱 Mobile Frame Pages',
      description: 'These pages maintain a mobile device frame on desktop browsers',
      pages: [
        { path: '/home', name: 'Home Feed', description: 'Main social feed' },
        { path: '/user-profile/demo', name: 'User Profile', description: 'Profile pages' },
        { path: '/notifications', name: 'Notifications', description: 'Notification center' },
        { path: '/messages', name: 'Messages', description: 'Chat interface' },
        { path: '/camera', name: 'Camera', description: 'Photo capture' },
      ]
    },
    {
      category: '🖥️ Full Screen Pages',
      description: 'These pages use the full browser width on desktop',
      pages: [
        { path: '/guided-tour/demo', name: 'Tour Details', description: 'Detailed tour information' },
        { path: '/booking-management', name: 'Booking Management', description: 'Guide dashboard' },
        { path: '/create-guided-tour', name: 'Create Tour', description: 'Tour creation form' },
        { path: '/device-detection-demo', name: 'Device Detection', description: 'Technical demo' },
        { path: '/advertiser-portal', name: 'Advertiser Portal', description: 'Business dashboard' },
        { path: '/account-settings', name: 'Account Settings', description: 'Settings panel' },
      ]
    }
  ];

  return (
    <div style={{
      padding: deviceInfo.isMobile ? '16px' : '32px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '32px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <FaArrowLeft size={14} />
          Back
        </button>
        
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold' }}>
            Viewport Mode System
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>
            Control which pages use mobile frames vs full screen on desktop browsers
          </p>
        </div>
      </div>

      {/* Current Status */}
      <div style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
          Current Page Status
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: deviceInfo.isMobile ? '1fr' : '1fr 1fr 1fr',
          gap: '16px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: isFullScreen ? '#e3f2fd' : '#fff3e0',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            {isFullScreen ? <FaExpand size={24} color="#1976d2" /> : <FaCompress size={24} color="#f57c00" />}
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px' }}>
              {isFullScreen ? 'Full Screen' : 'Mobile Frame'}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Current Mode
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: deviceInfo.isDesktop ? '#e8f5e8' : '#fce4ec',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            {deviceInfo.isDesktop ? <FaDesktop size={24} color="#388e3c" /> : <FaMobile size={24} color="#c2185b" />}
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px' }}>
              {deviceInfo.deviceType.charAt(0).toUpperCase() + deviceInfo.deviceType.slice(1)}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Device Type
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: showMobileFrame ? '#f3e5f5' : '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
              {showMobileFrame ? '📱' : '🖥️'}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {showMobileFrame ? 'Frame Visible' : 'No Frame'}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Visual Style
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Info */}
      <div style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
          Configuration Details
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: deviceInfo.isMobile ? '1fr' : '1fr 1fr',
          gap: '20px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
              Viewport Mode
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
              <strong>{config.mode}</strong>
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
              Max Width
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
              {config.maxWidth}
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
              Background Color
            </h4>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
              {config.backgroundColor}
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
              Screen Size
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
              {deviceInfo.screenWidth} × {deviceInfo.screenHeight}
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
              Orientation
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
              {deviceInfo.orientation}
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
              Touch Device
            </h4>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
              {deviceInfo.isTouchDevice ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Demo Pages */}
      {demoPages.map((category, categoryIndex) => (
        <div
          key={categoryIndex}
          style={{
            padding: '24px',
            backgroundColor: 'white',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
            {category.category}
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666' }}>
            {category.description}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: deviceInfo.isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {category.pages.map((page, pageIndex) => (
              <div
                key={pageIndex}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => navigate(page.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                  e.currentTarget.style.borderColor = '#1976d2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                  {page.name}
                </h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                  {page.description}
                </p>
                <div style={{ fontSize: '12px', color: '#1976d2', fontWeight: '500' }}>
                  {page.path}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Query Parameter Controls */}
      <div style={{
        padding: '24px',
        backgroundColor: '#e8f5e8',
        borderRadius: '12px',
        border: '1px solid #c8e6c9'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#2e7d32' }}>
          Manual Override
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#2e7d32' }}>
          You can force viewport modes using query parameters:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => navigate(window.location.pathname + '?fullscreen=true')}
            style={{
              padding: '12px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Force Full Screen (?fullscreen=true)
          </button>

          <button
            onClick={() => navigate(window.location.pathname + '?mobile-frame=true')}
            style={{
              padding: '12px 16px',
              backgroundColor: '#f57c00',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Force Mobile Frame (?mobile-frame=true)
          </button>

          <button
            onClick={() => navigate(window.location.pathname)}
            style={{
              padding: '12px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewportModeDemo;
