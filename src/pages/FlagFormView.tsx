import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const FlagFormView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { vostcardId, vostcardTitle, username } = location.state || {};

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
        vostcardID: vostcardId || "",
        vostcardTitle: vostcardTitle || "Untitled",
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
        navigate(-1);
      }, 2000);
    } catch (err: any) {
      console.error("❌ Error submitting flag:", err);
      setError("Failed to submit flag. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header Bar */}
      <div style={{
        background: '#07345c',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 70,
        position: 'relative',
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: 18,
            top: 0,
            height: '100%',
            background: 'none',
            border: 'none',
            color: '#4da6ff',
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0
          }}
        >
          Cancel
        </button>
        <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: 0.5 }}>Flag Vōstcard</span>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px 0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 8, marginTop: 8 }}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>What's Up?</div>
          <div style={{ color: '#888', fontSize: 18, marginBottom: 18 }}>
            Help us understand what's wrong with this Vōstcard
          </div>
        </div>
        <div style={{
          background: '#f4f4f4',
          borderRadius: 14,
          padding: '16px 18px',
          marginBottom: 18,
          fontSize: 20,
          fontWeight: 500,
          textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 2 }}>
            Vōstcard: {vostcardTitle || 'Untitled'}
          </div>
          <div style={{ color: '#666', fontSize: 16 }}>
            by {username || 'Unknown'}
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Please describe the issue:</div>
          <textarea
            value={flagText}
            onChange={e => setFlagText(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1.5px solid #e0e0e0',
              padding: 14,
              fontSize: 18,
              marginBottom: 18,
              background: '#fafbfc',
              resize: 'vertical',
              minHeight: 120
            }}
            placeholder="Describe the problem..."
          />
          {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginBottom: 10 }}>✅ Flag submitted successfully!</div>}
          <button
            type="submit"
            disabled={isSubmitting || !flagText.trim()}
            style={{
              width: '100%',
              background: flagText.trim() ? '#888' : '#ccc',
              color: 'white',
              padding: '18px 0',
              border: 'none',
              borderRadius: 14,
              fontSize: 24,
              fontWeight: 700,
              cursor: flagText.trim() ? 'pointer' : 'not-allowed',
              marginTop: 8,
              marginBottom: 24,
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Flag'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FlagFormView;
