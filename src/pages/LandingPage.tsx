import React, { useState, useEffect, useRef } from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const [tapCount, setTapCount] = useState(0);
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleImageTap = () => {
    console.log('🖱️ Image tapped, current count:', tapCount);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const newCount = tapCount + 1;
    setTapCount(newCount);
    console.log('🖱️ New tap count:', newCount);

    if (newCount >= 3) {
      console.log('✅ Triple tap detected, navigating to login');
      navigate("/login");
      setTapCount(0);
      return;
    }

    // Reset count after 2 seconds of no taps
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Tap timeout, resetting count');
      setTapCount(0);
    }, 2000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="landing-container">
      <img
        src="/underconstruction.jpg"
        alt="Vōstcard Landing"
        className="landing-image"
        onClick={handleImageTap}
        onTouchStart={handleImageTap} // Add touch event for mobile
        style={{
          cursor: 'pointer',
          width: '50%',         // Image is now half the width of its container
          maxWidth: 300,        // Optional: limit max width for mobile
          height: 'auto',       // Maintain aspect ratio
          display: 'block',
          margin: '40px auto 0 auto', // Center the image with top margin
        }}
        onError={(e) => {
          console.error('❌ Image failed to load:', e);
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.innerText = 'Image not found. Tap anywhere to continue.';
          fallback.style.color = '#002B4D';
          fallback.style.fontSize = '18px';
          fallback.style.textAlign = 'center';
          fallback.style.marginTop = '20px';
          fallback.onclick = handleImageTap; // Make fallback clickable too
          target.parentElement?.appendChild(fallback);
        }}
      />
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#002B4D',
          fontSize: '12px',
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: '5px 10px',
          borderRadius: '5px'
        }}>
          Tap count: {tapCount}/3
        </div>
      )}
    </div>
  );
}