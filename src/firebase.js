import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home"); // ✅ Go to HomeView after login
    } catch (error) {
      console.error("Login error:", error.message);
      alert(error.message);
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

      <h2 className="welcome">Welcome</h2>

      <input
        type="email"
        placeholder="Email"
        className="input-field"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="password-wrapper">
        <input
          type="password"
          placeholder="Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button className="main-button" onClick={handleLogin}>
        Log In
      </button>

      <p className="register-prompt">
        If you don't have an account tap here
      </p>

      <button className="main-button" onClick={() => navigate("/register")}>
        Register
      </button>
    </div>
  );
}
