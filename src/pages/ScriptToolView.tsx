import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useScripts } from '../context/ScriptContext';
import { useVostcard } from '../context/VostcardContext';

export default function ScriptToolView() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSaveButton, setShowSaveButton] = useState(false);
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

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        overflow: "hidden"
      }}
    >
      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        paddingBottom: 180
      }}>
        <div style={{
          width: "100%",
          maxWidth: 500,
          margin: "0 auto",
          padding: 24,
          boxSizing: "border-box"
        }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16
        }}>
          <button onClick={() => window.history.back()} style={{
            background: "none",
            border: "none",
            color: "#007aff",
            fontSize: 20,
            marginRight: 8,
            cursor: "pointer"
          }}>{"< Back"}</button>
          <h2 style={{ margin: 0, flex: 1, textAlign: "center" }}>Script</h2>
        </div>

        {/* Script Library Button */}
        <button 
          onClick={() => navigate('/script-library')}
          style={{
            width: "100%",
            background: "#007aff",
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
            onClick={() => {
              console.log('Roll Camera clicked, script:', script);
              if (script.trim()) {
                navigate(`/scrolling-camera?script=${encodeURIComponent(script)}`);
              }
            }}
            style={{
              width: "100%",
              background: script.trim() ? "#007aff" : "#888",
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
    </div>
  );
} 