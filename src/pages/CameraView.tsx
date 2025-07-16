      
      if (permission.state === 'denied') {
        alert('Camera access is blocked. Please enable camera permissions in your browser settings.');
        return false;
      }
      
      return true;
    } catch (err) {
      console.warn('⚠️ Permission check failed:', err);
      return true; // Continue anyway
    }
  };

  // Add Samsung-specific detection and handling
  const isSamsungDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('samsung') || userAgent.includes('sm-');
  };

  // Separate video and audio initialization
  const startCamera = async () => {
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) return;

    try {
      console.log('📱 Starting video stream...');
      
      // Get video stream first
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        }
      });
      
      // Then try to add audio
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
      
      if (permission.state === 'denied') {
        alert('Camera access is blocked. Please enable camera permissions in your browser settings.');
        return false;
      }
      
      return true;
    } catch (err) {
      console.warn('⚠️ Permission check failed:', err);
      return true; // Continue anyway
    }
  };

  // Add debug overlay
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const startCamera = async () => {
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) return;

      try {
        console.log('📱 Starting camera with progressive constraints...');
        
        // Try ideal constraints first
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 720 },
              height: { ideal: 1280 },
              aspectRatio: 9 / 16,
                    borderRadius: '50%',
                    border: '6px solid white',
                    cursor: 'pointer',
                  }}
                />
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraView;
export default CameraView;
  );
};

export default CameraView;