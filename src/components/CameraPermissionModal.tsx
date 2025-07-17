import React from 'react';
import { FaTimes, FaCamera, FaDesktop, FaMobile, FaChrome, FaFirefox, FaSafari, FaEdge } from 'react-icons/fa';

interface CameraPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

const CameraPermissionModal: React.FC<CameraPermissionModalProps> = ({ 
  isOpen, 
  onClose, 
  onRetry 
}) => {
  if (!isOpen) return null;

  // Detect browser
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return { name: 'Chrome', icon: FaChrome };
    if (userAgent.includes('firefox')) return { name: 'Firefox', icon: FaFirefox };
    if (userAgent.includes('safari')) return { name: 'Safari', icon: FaSafari };
    if (userAgent.includes('edge')) return { name: 'Edge', icon: FaEdge };
    return { name: 'Browser', icon: FaDesktop };
  };

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const browser = getBrowserInfo();

  const getInstructions = () => {
    if (isMobile) {
      return {
        title: "Enable Camera Access on Mobile",
        icon: FaMobile,
        steps: [
          {
            browser: 'All Mobile Browsers',
            steps: [
              'Tap the camera icon in your browser\'s address bar',
              'Select "Allow" or "Grant Permission"',
              'If blocked, tap "Settings" → "Site Settings" → "Camera"',
              'Toggle camera permission to "Allow"',
              'Return to this page and try again'
            ]
          },
          {
            browser: 'iPhone/iPad (Safari)',
            steps: [
              'Go to iPhone Settings → Safari → Camera',
              'Select "Allow"',
              'Or go to Settings → Privacy & Security → Camera',
              'Find Safari and toggle it ON',
              'Return to this page and refresh'
            ]
          },
          {
            browser: 'Android',
            steps: [
              'Go to Phone Settings → Apps → Browser',
              'Tap "Permissions" → "Camera"',
              'Select "Allow"',
              'Or in browser: Menu → Settings → Site Settings → Camera',
              'Choose "Allow" and return to this page'
            ]
          }
        ]
      };
    } else {
      return {
        title: "Enable Camera Access on Desktop",
        icon: FaDesktop,
        steps: [
          {
            browser: 'Chrome',
            steps: [
              'Click the camera icon in the address bar',
              'Select "Always allow" and click "Done"',
              'Or go to Settings → Privacy & Security → Site Settings → Camera',
              'Add this site to "Allowed to use your camera"',
              'Refresh the page and try again'
            ]
          },
          {
            browser: 'Firefox',
            steps: [
              'Click the camera icon in the address bar',
              'Select "Allow" and check "Remember this decision"',
              'Or go to Settings → Privacy & Security → Permissions → Camera',
              'Click "Settings" next to Camera and allow this site',
              'Refresh the page and try again'
            ]
          },
          {
            browser: 'Safari',
            steps: [
              'Go to Safari menu → Settings for This Website',
              'Set Camera to "Allow"',
              'Or go to Safari → Preferences → Websites → Camera',
              'Set this website to "Allow"',
              'Refresh the page and try again'
            ]
          },
          {
            browser: 'Edge',
            steps: [
              'Click the camera icon in the address bar',
              'Select "Always allow on this site"',
              'Or go to Settings → Site Permissions → Camera',
              'Add this site to allowed sites',
              'Refresh the page and try again'
            ]
          }
        ]
      };
    }
  };

  const instructions = getInstructions();
  const BrowserIcon = browser.icon;
  const DeviceIcon = instructions.icon;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: '5px'
          }}
        >
          <FaTimes />
        </button>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <FaCamera size={40} color="#07345c" />
            <DeviceIcon size={30} color="#07345c" />
            <BrowserIcon size={30} color="#07345c" />
          </div>
          <h2 style={{
            color: '#07345c',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            Camera Permission Required
          </h2>
          <p style={{
            color: '#666',
            fontSize: '16px',
            margin: '0',
            lineHeight: '1.5'
          }}>
            Vōstcard needs access to your camera to record videos. Please follow the instructions below to enable camera permissions.
          </p>
        </div>

        {/* Instructions */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            color: '#07345c',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <DeviceIcon size={20} />
            {instructions.title}
          </h3>

          {instructions.steps.map((instruction, index) => (
            <div key={index} style={{
              marginBottom: '25px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{
                color: '#07345c',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <BrowserIcon size={16} />
                {instruction.browser}
              </h4>
              <ol style={{
                margin: '0',
                paddingLeft: '20px',
                color: '#333'
              }}>
                {instruction.steps.map((step, stepIndex) => (
                  <li key={stepIndex} style={{
                    marginBottom: '8px',
                    lineHeight: '1.5'
                  }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Additional Help */}
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '30px'
        }}>
          <h4 style={{
            color: '#856404',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>
            💡 Still having trouble?
          </h4>
          <ul style={{
            margin: '0',
            paddingLeft: '20px',
            color: '#856404'
          }}>
            <li>Make sure your device has a camera</li>
            <li>Check if other apps can access your camera</li>
            <li>Try refreshing the page after changing permissions</li>
            <li>Restart your browser if needed</li>
            <li>Make sure you're on a secure connection (HTTPS)</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onRetry}
            style={{
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '15px 25px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaCamera size={16} />
            Try Again
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '15px 25px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraPermissionModal; 