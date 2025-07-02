import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorage } from "firebase/storage";
import { FaUser, FaEnvelope, FaLock, FaCamera } from "react-icons/fa";
import { auth, db } from "../firebase/firebaseConfig";
import "./RegistrationPage.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState("User");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !username || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Username already taken.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name: name,
        username: username.toLowerCase(),
        email: email,
        userRole: accountType,
        avatarURL: "",
        message: "",
        acceptedTerms: true,
        termsAcceptanceDate: new Date().toISOString(),
        privacyPolicyAcceptanceDate: new Date().toISOString(),
      });

      navigate("/home");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
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
        placeholder="Name"
        className="input-field"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

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

      {error && <div className="error-message">{error}</div>}

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