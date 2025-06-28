import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <div className="header">
        <h1>Vōstcard</h1>
        <button className="home-button">
          <i className="fas fa-home"></i>
        </button>
      </div>

      <h2 className="welcome">Welcome</h2>

      <input
        type="text"
        placeholder="Username or Email"
        className="input-field"
      />

      <div className="password-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          className="input-field"
        />
        <button
          className="eye-button"
          onClick={() => setShowPassword(!showPassword)}
        >
          <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
        </button>
      </div>

      <button className="main-button">Log In</button>

      <p className="register-prompt">
        If you don't have an account tap here
      </p>

      <button className="main-button" onClick={() => navigate("/register")}>
        Register
      </button>
    </div>
  );
}