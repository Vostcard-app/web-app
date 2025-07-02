import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

export default function RegistrationPage() {
  const [formType, setFormType] = useState<"user" | "advertiser">("user");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper to check if username is unique
  const isUsernameUnique = async (username: string) => {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (!name || !email || !password || (formType === "user" && !username) || (formType === "advertiser" && !businessName)) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }
    if (!agreed) {
      setError("You must agree to the terms and privacy policy.");
      setLoading(false);
      return;
    }

    try {
      // For user, check username uniqueness
      if (formType === "user") {
        const unique = await isUsernameUnique(username);
        if (!unique) {
          setError("Username is already taken.");
          setLoading(false);
          return;
        }
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save extra info to Firestore
      if (formType === "user") {
        await setDoc(doc(db, "users", user.uid), {
          name,
          username,
          email,
          role: "user",
          createdAt: new Date(),
        });
        navigate("/profile");
      } else {
        await setDoc(doc(db, "advertisers", user.uid), {
          name,
          businessName,
          email,
          role: "advertiser",
          createdAt: new Date(),
        });
        navigate("/advertiser-portal");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 0,
        overflowY: 'auto', // Enable vertical scrolling
      }}
    >
      {/* Header */}
      <div style={{
        background: '#07345c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '32px 24px 24px 24px',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}>
        <h1 style={{
          color: 'white',
          fontWeight: 700,
          fontSize: '2.5rem',
          margin: 0,
        }}>Vōstcard</h1>
        <button
          onClick={() => navigate("/")}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-home" style={{ color: 'white', fontSize: 28 }}></i>
        </button>
      </div>

      {/* Large Account Type Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '40px 0 24px 0',
        width: '95%',
        maxWidth: 500,
      }}>
        <button
          onClick={() => setFormType("user")}
          style={{
            flex: 1,
            padding: '24px 0',
            background: formType === "user" ? "#07345c" : "#eee",
            color: formType === "user" ? "#fff" : "#07345c",
            border: 'none',
            borderRadius: '32px 0 0 32px',
            fontWeight: 700,
            fontSize: 28,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            boxShadow: formType === "user" ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
          }}
        >
          User
        </button>
        <button
          onClick={() => setFormType("advertiser")}
          style={{
            flex: 1,
            padding: '24px 0',
            background: formType === "advertiser" ? "#07345c" : "#eee",
            color: formType === "advertiser" ? "#fff" : "#07345c",
            border: 'none',
            borderRadius: '0 32px 32px 0',
            fontWeight: 700,
            fontSize: 28,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            boxShadow: formType === "advertiser" ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
          }}
        >
          Advertiser
        </button>
      </div>

      {/* Scrollable content wrapper */}
      <div style={{
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        paddingBottom: 32,
      }}>
        {/* Form */}
        <form style={{ width: '90%', maxWidth: 400 }} onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
          {formType === "user" && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={inputStyle}
            />
          )}
          {formType === "advertiser" && (
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 26, color: '#888' }}></i>
            </button>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <a href="/terms" style={linkStyle}>Terms & Conditions</a>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <a href="/privacy" style={linkStyle}>Privacy Policy</a>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ width: 28, height: 28, marginRight: 12 }}
              id="agree"
            />
            <label htmlFor="agree" style={{ color: '#b0b0b0', fontSize: 20 }}>
              I have Read and Agree to the above
            </label>
          </div>
          {error && <div style={{ color: "#ff3b30", textAlign: "center", marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={!agreed || loading}
            style={{
              width: '100%',
              background: agreed ? "#07345c" : "#b0b0b0",
              color: 'white',
              border: 'none',
              borderRadius: 16,
              fontSize: 32,
              fontWeight: 600,
              padding: '20px 0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              cursor: agreed && !loading ? 'pointer' : 'not-allowed',
              letterSpacing: '0.01em',
            }}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  marginBottom: 20,
  fontSize: 28,
  padding: '20px 14px',
  borderRadius: 12,
  border: '1px solid #eee',
  background: '#f8f8f8',
  color: '#222',
  boxSizing: 'border-box' as const,
};

const linkStyle = {
  color: '#07345c',
  fontWeight: 600,
  fontSize: 22,
  textDecoration: 'underline',
  cursor: 'pointer',
};