import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import AIScriptTool from '../components/AIScriptTool';

const CreateVostcardStep1: React.FC = () => {
  const navigate = useNavigate();
  const { currentVostcard, setVideo, saveLocalVostcard, clearVostcard } = useVostcard();
  const [video, setVideoState] = useState<Blob | null>(null);
  const [videoURL, setVideoURL] = useState<string>('');
  const [showAIScriptTool, setShowAIScriptTool] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');

  useEffect(() => {
    if (currentVostcard?.video) {
      setVideoState(currentVostcard.video);
      const url = URL.createObjectURL(currentVostcard.video);
      setVideoURL(url);
      console.log('Generated Blob URL:', url);
    }
  }, [currentVostcard?.video]);

  const handleRecord = () => {
    navigate('/scrolling-camera');
  };

  const handleAIScriptSave = (scriptText: string) => {
    setGeneratedScript(scriptText);
    console.log('AI Script saved:', scriptText);
    // You can also save this to the Vostcard context if needed
  };

  const handleSaveAndContinue = async () => {
    try {
      console.log('💾 Step 1: Starting save process...');
      console.log('💾 Current Vostcard state:', {
        id: currentVostcard?.id,
        hasVideo: !!currentVostcard?.video,
        videoSize: currentVostcard?.video?.size,
        hasGeo: !!currentVostcard?.geo,
        username: currentVostcard?.username,
        userID: currentVostcard?.userID,
        generatedScript: generatedScript
      });
      
      if (!currentVostcard) {
        console.error('❌ No currentVostcard to save');
        alert('No Vostcard to save. Please record a video first.');
        return;
      }
      
      if (!currentVostcard.video) {
        console.error('❌ No video in currentVostcard');
        alert('No video to save. Please record a video first.');
        return;
      }
      
      await saveLocalVostcard();
      console.log('✅ Vostcard saved successfully, navigating to step 2');
      navigate('/create-step2');
    } catch (error) {
      console.error('❌ Failed to save Vostcard:', error);
      alert(`Failed to save Vostcard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ background: "white", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#002B4D",
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px"
      }}>
        <div style={{ color: "white", fontSize: 32, fontWeight: "bold" }}>Vōstcard</div>
        <button
          style={{
            background: "none",
            border: "none",
            borderRadius: "50%",
            padding: 8,
            marginRight: 4,
            cursor: "pointer"
          }}
          onClick={() => navigate("/")}
        >
          <FaHome size={36} color="white" />
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {/* Record Button */}
        <div
          onClick={handleRecord}
          style={{
            backgroundColor: "white",
            border: "none",
            outline: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <div style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "10px solid #ff3b30",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#ff3b30"
            }} />
          </div>
          <div style={{
            fontSize: 22,
            color: "#222",
            marginTop: 8,
            fontWeight: 500
          }}>
            Record a 30 Second Video
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div style={{
        width: "100%",
        padding: "0 16px 32px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }}>
        <button
          disabled={!video}
          onClick={handleSaveAndContinue}
          style={{
            width: "100%",
            backgroundColor: "#888",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "18px 0",
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 0,
            opacity: video ? 1 : 0.6,
            cursor: video ? "pointer" : "not-allowed"
          }}
        >
          Save
        </button>
        <button
          onClick={() => navigate("/script-tool")}
          style={{
            width: "100%",
            backgroundColor: "#ff9900",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "18px 0",
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 0,
            cursor: "pointer"
          }}
        >
          Use Script Tool
        </button>
      </div>
    </div>
  );
};

export default CreateVostcardStep1;