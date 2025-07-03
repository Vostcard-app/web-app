import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.message || "");

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Redirect based on user role after successful login
  useEffect(() => {
    if (userRole) {
      if (userRole === 'Advertiser') {
        navigate('/advertiser-portal');
      } else {
        navigate('/home');
      }
    }
  }, [userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Logged in:", user);

      if (!user.emailVerified) {
        await auth.signOut();
        setError("Please verify your email before logging in. We've sent you another verification email.");
        try {
          await user.sendEmailVerification();
        } catch (verificationError) {
          console.error("Failed to send verification email:", verificationError);
        }
        return;
      }

      // The redirect will be handled by the useEffect above
      // based on the userRole from AuthContext
    } catch (err: any) {
      console.error("Login error:", err.code, err.message);

      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 0,
    }}>
      {successMessage && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: 12,
          padding: '12px 16px',
          margin: '16px auto',
          width: '90%',
          textAlign: 'center',
          fontWeight: 500,
          position: 'relative',
        }}>
          {successMessage}
          <button
            onClick={() => setSuccessMessage("")}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#155724',
            }}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
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

      {/* Welcome */}
      <h2 style={{
        textAlign: 'center',
        margin: '32px 0 24px 0',
        fontSize: '2rem',
        fontWeight: 500,
      }}>Welcome</h2>

      {/* Username/Email */}
      <input
        type="text"
        placeholder="Username or Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: '90%',
          margin: '0 auto 16px auto',
          display: 'block',
          fontSize: 22,
          padding: '16px 12px',
          borderRadius: 12,
          border: '1px solid #eee',
          background: '#f8f8f8',
          color: '#222',
        }}
      />

      {/* Password */}
      <div style={{
        width: '90%',
        margin: '0 auto 24px auto',
        position: 'relative',
      }}>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            fontSize: 22,
            padding: '16px 48px 16px 12px',
            borderRadius: 12,
            border: '1px solid #eee',
            background: '#f8f8f8',
            color: '#222',
          }}
        />
        <button
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 22, color: '#888' }}></i>
        </button>
      </div>

      {/* Error Message */}
      {error && <div style={{
        color: '#ff3b30',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: 500,
      }}>{error}</div>}

      {/* Log In Button */}
      <button
        onClick={handleLogin}
        style={{
          width: '90%',
          margin: '0 auto 32px auto',
          display: 'block',
          background: '#07345c',
          color: 'white',
          border: 'none',
          borderRadius: 16,
          fontSize: 28,
          fontWeight: 600,
          padding: '16px 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        Log In
      </button>

      {/* Register Prompt */}
      <p style={{
        color: '#b0b0b0',
        textAlign: 'center',
        fontSize: 20,
        marginBottom: 8,
      }}>
        If you don't have an account tap here
      </p>

      {/* Register Button */}
      <button
        onClick={() => navigate("/register")}
        style={{
          width: '90%',
          margin: '0 auto',
          display: 'block',
          background: '#07345c',
          color: 'white',
          border: 'none',
          borderRadius: 16,
          fontSize: 28,
          fontWeight: 600,
          padding: '16px 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        Register
      </button>
    </div>
  );
}