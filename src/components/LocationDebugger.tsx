import React, { useState, useEffect } from 'react';

const LocationDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateDebugInfo = async () => {
      const info = [
        `Protocol: ${window.location.protocol}`,
        `Host: ${window.location.hostname}`,
        `User Agent: ${navigator.userAgent}`,
        `Geolocation Support: ${!!navigator.geolocation}`,
        `HTTPS: ${window.location.protocol === 'https:'}`,
        `Permissions API: ${!!navigator.permissions}`,
        `Platform: ${navigator.platform}`,
        `Language: ${navigator.language}`,
        `Online: ${navigator.onLine}`,
        `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
        `Screen: ${screen.width}x${screen.height}`,
        `Viewport: ${window.innerWidth}x${window.innerHeight}`
      ];

      // Test geolocation permissions
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          info.push(`Geolocation Permission: ${permission.state}`);
        } catch (err) {
          info.push(`Geolocation Permission: Error checking - ${err.message}`);
        }
      }

      // Test geolocation availability
      if (navigator.geolocation) {
        info.push('Testing geolocation...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            info.push(`✅ Geolocation Success: ${position.coords.latitude}, ${position.coords.longitude}`);
            setDebugInfo(info.join('\n'));
          },
          (error) => {
            info.push(`❌ Geolocation Error: ${error.message} (Code: ${error.code})`);
            setDebugInfo(info.join('\n'));
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        info.push('❌ Geolocation not supported');
      }

      setDebugInfo(info.join('\n'));
    };

    updateDebugInfo();
  }, []);

  // Toggle visibility with triple-click on screen corner
  useEffect(() => {
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;

    const handleCornerClick = (e: MouseEvent) => {
      // Check if click is in top-left corner (within 50px of both edges)
      if (e.clientX < 50 && e.clientY < 50) {
        clickCount++;
        
        clearTimeout(clickTimer);
        
        if (clickCount === 3) {
          setIsVisible(prev => !prev);
          clickCount = 0;
        } else {
          clickTimer = setTimeout(() => {
            clickCount = 0;
          }, 500);
        }
      }
    };

    document.addEventListener('click', handleCornerClick);
    return () => {
      document.removeEventListener('click', handleCornerClick);
      clearTimeout(clickTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        right: '10px',
        maxHeight: '70vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10000,
        overflow: 'auto',
        whiteSpace: 'pre-wrap'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong>🔍 Location Debug Info</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>
      <div>{debugInfo}</div>
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#ccc' }}>
        💡 Triple-click top-left corner to toggle
      </div>
    </div>
  );
};

export default LocationDebugger;