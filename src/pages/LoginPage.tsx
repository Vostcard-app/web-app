import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

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

      navigate("/home");
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
    <div className="login-container">
      <div className="header">
        <h1>Vōstcard</h1>
        <button className="home-button" onClick={() => navigate("/")}>
          <i className="fas fa-home"></i>
        </button>
      </div>

      <h2 className="welcome">Log In</h2>

      <input
        type="email"
        placeholder="Email"
        className="input-field"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="password-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="eye-button"
          onClick={() => setShowPassword(!showPassword)}
        >
          <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button className="main-button" onClick={handleLogin}>
        Log In
      </button>

      <p className="register-prompt">Don't have an account?</p>

      <button className="main-button" onClick={() => navigate("/register")}>
        Register
      </button>
    </div>
  );
}