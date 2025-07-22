import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useScripts } from '../context/ScriptContext';
import { useVostcard } from '../context/VostcardContext';
import CameraPermissionModal from '../components/CameraPermissionModal';

export default function ScriptToolView() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { createScript } = useScripts();
  const { updateVostcard } = useVostcard();

  // Check for script parameter from URL (when returning from camera or script library)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const scriptParam = urlParams.get('script');
    const titleParam = urlParams.get('title');
    
    if (scriptParam) {
      const decodedScript = decodeURIComponent(scriptParam);
      console.log('Loading script from URL:', decodedScript);
      setScript(decodedScript);
      setShowSaveButton(true);
    }
    
    if (titleParam) {
      const decodedTitle = decodeURIComponent(titleParam);
      console.log('Loading title from URL:', decodedTitle);
      setTopic(decodedTitle);
    }
  }, [location.search]);

  // Debug effect to log script changes
  useEffect(() => {
    console.log('Script state changed:', { script, scriptLength: script.length, hasContent: !!script.trim() });
  }, [script]);



  const handleSaveAndContinue = async () => {
    if (!script.trim()) {
      setError("Please enter a script to save");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Save script to library
      const savedScript = await createScript(topic || "Untitled Script", script);
      
      // Update the current vostcard with the script and script ID
      updateVostcard({ 
        script: script,
        scriptId: savedScript.id 
      });
      
      // Navigate to step 2 (create vostcard step 2)
      navigate('/create-step2');
    } catch (err) {
      setError("Failed to save script. Please try again.");
      console.error("Script saving error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to check camera permission before navigating
  const checkCameraAndNavigate = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permission.state === 'denied') {
        setShowPermissionModal(true);
        return;
      }
      
      // If permission is granted or prompt, proceed with navigation
      if (script.trim()) {
        navigate(`/scrolling-camera?script=${encodeURIComponent(script)}`);
      }
    } catch (err) {
      // If permission check fails, try to navigate anyway
      console.warn('Permission check failed:', err);
      if (script.trim()) {
        navigate(`/scrolling-camera?script=${encodeURIComponent(script)}`);
      }
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#f5f5f5' }}>
      {/* 🔵 Header with Home Icon */}
      <div style={{
        backgroundColor: '#07345c',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '16px',
        color: 'white',
        position: 'relative',
        padding: '15px 0 24px 20px'
      }}>
        <h1 style={{ fontSize: '30px', margin: 0 }}>Script</h1>
        
        {/* Home Button */}
        <FaHome
          size={40}
          style={{
            cursor: 'pointer',
            position: 'absolute',
            right: 44,
            top: 15,
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* Content Area */}
      <div style={{
        padding: '20px',
        height: 'calc(100vh - 120px)',
        overflowY: 'auto',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'auto'
      }}>
        <div style={{
          width: "100%",
          maxWidth: 500,
          margin: "0 auto",
          boxSizing: "border-box"
        }}>

          {/* Script Library Button */}
          <button 
            onClick={() => navigate('/script-library')}
            style={{
              width: "100%",
              background: "#07345c",
              color: "white",
              padding: 12,
              borderRadius: 8,
              fontSize: 20,
              marginBottom: 16,
              border: "none",
              cursor: "pointer"
            }}
          >
            Script Library
          </button>



        {/* Script Textarea */}
        <textarea
          value={script}
          onChange={e => setScript(e.target.value)}
          style={{
            width: "100%",
            minHeight: 100,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            border: "1px solid #ccc",
            marginBottom: 16
          }}
        />

        {/* Error message */}
        {error && (
          <div style={{
            color: "red",
            marginBottom: 16,
            padding: 8,
            background: "#ffe6e6",
            borderRadius: 4
          }}>
            {error}
          </div>
        )}



        </div>
      </div>
      
      {/* Fixed button area at bottom */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px 16px 66px 16px",
        background: "#fff",
        borderTop: "1px solid #eee",
        boxSizing: "border-box",
        zIndex: 1000
      }}>
        <div style={{
          width: "100%",
          maxWidth: 500,
          margin: "0 auto"
        }}>
          {/* Save and Continue Button (shown after recording) */}
          {showSaveButton && (
            <button
              onClick={handleSaveAndContinue}
              disabled={loading || !script.trim()}
              style={{
                width: "100%",
                background: loading ? "#ccc" : "#28a745",
                color: "white",
                padding: 16,
                borderRadius: 8,
                fontSize: 20,
                border: "none",
                fontWeight: 600,
                marginBottom: 16,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Saving..." : "Save & Continue"}
            </button>
          )}
          
          {/* Roll Camera Button - always visible at bottom */}
          <button
            disabled={!script.trim()}
            onClick={checkCameraAndNavigate}
            style={{
              width: "100%",
              background: script.trim() ? "#07345c" : "#888",
              color: "white",
              padding: 16,
              borderRadius: 8,
              fontSize: 20,
              border: "none",
              fontWeight: 600,
              opacity: script.trim() ? 1 : 0.7,
              cursor: script.trim() ? "pointer" : "not-allowed"
            }}
          >
            Roll Camera! {script.trim() ? '(Enabled)' : '(Disabled)'} - Script length: {script.length}
          </button>
        </div>
      </div>

      {/* Camera Permission Modal */}
      <CameraPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRetry={() => {
          setShowPermissionModal(false);
          checkCameraAndNavigate();
        }}
      />
    </div>
  );
} 