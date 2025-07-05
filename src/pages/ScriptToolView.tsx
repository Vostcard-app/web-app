import React, { useState } from "react";
import { generateScript } from "../utils/openaiHelper";

const scriptStyles = [
  "Bullet Points",
  "Travel Log",
  "Historical",
  "Funny"
];

export default function ScriptToolView() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState(scriptStyles[0]);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const generatedScript = await generateScript(topic, style);
      setScript(generatedScript);
    } catch (err) {
      setError("Failed to generate script. Please try again.");
      console.error("Script generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePolishScript = async () => {
    if (!script.trim()) {
      setError("Please enter a script to polish");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const polishedScript = await generateScript(`Polish this script: ${script}`, "Professional");
      setScript(polishedScript);
    } catch (err) {
      setError("Failed to polish script. Please try again.");
      console.error("Script polishing error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "16.66vh", // 1/6 of viewport height
        boxSizing: "border-box",
        background: "#fff"
      }}
    >
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
        <button style={{
          width: "100%",
          background: "#007aff",
          color: "white",
          padding: 12,
          borderRadius: 8,
          fontSize: 20,
          marginBottom: 16,
          border: "none"
        }}>
          Script Library
        </button>

        {/* Topic Input */}
        <input
          type="text"
          placeholder="Enter a topic (e.g. travel, baking, motivation)"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 16,
            border: "1px solid #ccc"
          }}
        />

        {/* Script Style Radio Buttons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Choose Script Style:</div>
          {scriptStyles.map(opt => (
            <div key={opt} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 18 }}>
                <input
                  type="radio"
                  checked={style === opt}
                  onChange={() => setStyle(opt)}
                  style={{ marginRight: 8 }}
                />
                {opt}
              </label>
            </div>
          ))}
        </div>

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

        {/* AI Buttons (side by side) */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button 
            onClick={handleGenerateScript}
            disabled={loading || !topic.trim()}
            style={{
              flex: 1,
              background: loading ? "#ccc" : "orange",
              color: "white",
              padding: 14,
              borderRadius: 8,
              fontSize: 16,
              border: "none",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Generating..." : "Generate Script with AI"}
          </button>
          <button 
            onClick={handlePolishScript}
            disabled={loading || !script.trim()}
            style={{
              flex: 1,
              background: loading ? "#ccc" : "purple",
              color: "white",
              padding: 14,
              borderRadius: 8,
              fontSize: 16,
              border: "none",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Polishing..." : "Polish My Script"}
          </button>
        </div>

        {/* Roll Cameras Button */}
        <button
          disabled={!script.trim()}
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
          Roll Cameras!
        </button>
      </div>
    </div>
  );
} 