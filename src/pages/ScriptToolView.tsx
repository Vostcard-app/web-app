import React, { useState } from "react";

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

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: "0 auto" }}>
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
      <div style={{ marginBottom: 24 }}>
        {scriptStyles.map((s, index) => (
          <label key={index}>
            <input
              type="radio"
              value={s}
              checked={style === s}
              onChange={() => setStyle(s)}
            />
            {s}
          </label>
        ))}
      </div>

      {/* Script Input */}
      <textarea
        placeholder="Enter your script here"
        value={script}
        onChange={e => setScript(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 16,
          border: "1px solid #ccc"
        }}
      />

      {/* Save Button */}
      <button style={{
        width: "100%",
        background: "#007aff",
        color: "white",
        padding: 12,
        borderRadius: 8,
        fontSize: 20,
        border: "none"
      }}>
        Save
      </button>
    </div>
  );
} 