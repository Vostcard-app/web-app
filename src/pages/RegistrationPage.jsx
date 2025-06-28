import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RegistrationPage.css";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState("User");
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    console.log({
      username,
      email,
      password,
      accountType,
    });

    // 🔥 Add Firebase Auth + Firestore registration logic here

    navigate("/login"); // Redirect after registration
  };

  return (
    <div className="register-container">
      <div className="header">
        <h1>Vōstcard</h1>
        <button className="home-button" onClick={() => navigate("/")}>
          <i className="fas fa-home"></i>
        </button>
      </div>

      <h2 className="welcome">Register</h2>

      <input
        type="text"
        placeholder="Username"
        className="input-field"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

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

      <label className="account-type-label">Account Type</label>
      <select
        className="input-field"
        value={accountType}
        onChange={(e) => setAccountType(e.target.value)}
      >
        <option value="User">User</option>
        <option value="Advertiser">Advertiser</option>
      </select>

      <button className="main-button" onClick={handleRegister}>
        Register
      </button>

      <p className="register-prompt">Already have an account?</p>

      <button className="main-button" onClick={() => navigate("/login")}>
        Log In
      </button>
    </div>
  );
}