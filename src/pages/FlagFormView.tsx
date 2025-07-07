import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const FlagFormView: React.FC = () => {
  const navigate = useNavigate();
  const { vostcardID, title, username } = useParams<{ vostcardID: string; title: string; username: string }>();
  const { user } = useAuth();

  const [flagText, setFlagText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, "flags"), {
        vostcardID: vostcardID || "",
        vostcardTitle: title || "Untitled",
        vostcardUsername: username || "Unknown",
        flagText: flagText.trim(),
        flaggedBy: user?.uid || "anonymous",
        flaggedByUsername: user?.displayName || "Anonymous",
        flaggedByEmail: user?.email || "No email",
        timestamp: serverTimestamp(),
        status: "pending"
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(-1); // Go back to previous page
      }, 2000);
    } catch (err: any) {
      console.error("❌ Error submitting flag:", err);
      setError("Failed to submit flag. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px" }}>
      <h2>🚩 Flag Vōstcard</h2>
      <p>Help us understand what's wrong with this Vōstcard.</p>
      <div
        style={{
          background: "#f4f4f4",
          padding: "10px 15px",
          borderRadius: "8px",
          marginTop: "15px",
          marginBottom: "20px",
        }}
      >
        <strong>{title || "Untitled"}</strong> <br />
        <small>by {username}</small>
      </div>

      <form onSubmit={handleSubmit}>
        <label htmlFor="flagText" style={{ fontWeight: "bold" }}>
          Please describe the issue:
        </label>
        <textarea
          id="flagText"
          value={flagText}
          onChange={(e) => setFlagText(e.target.value)}
          rows={6}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            marginTop: "10px",
          }}
          placeholder="Describe the problem..."
        />

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        {success && <p style={{ color: "green", marginTop: "10px" }}>✅ Flag submitted successfully!</p>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: "#999",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              background: flagText.trim() ? "#e53e3e" : "#ccc",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              cursor: flagText.trim() ? "pointer" : "not-allowed",
            }}
            disabled={isSubmitting || !flagText.trim()}
          >
            {isSubmitting ? "Submitting..." : "Submit Flag"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FlagFormView;
