import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import "./LoginPage.css"; // RESTORE ORIGINAL CSS

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper function to check if input is an email
  const isEmail = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  // Helper function to get email from username
  const getEmailFromUsername = async (username: string): Promise<string | null> => {
    try {
      const trimmedUsername = username.trim();
      const exactQuery = query(collection(db, "users"), where("username", "==", trimmedUsername));
      let querySnapshot = await getDocs(exactQuery);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const email = userDoc.data().email;
        return email || null;
      }
      
      const allUsersQuery = query(collection(db, "users"));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      const lowerUsername = trimmedUsername.toLowerCase();
      for (const userDoc of allUsersSnapshot.docs) {
        const userData = userDoc.data();
        const storedUsername = userData.username;
        
        if (storedUsername && storedUsername.toLowerCase() === lowerUsername) {
          const email = userData.email;
          return email || null;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error looking up username:", error);
      return null;
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!usernameOrEmail || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const trimmedInput = usernameOrEmail.trim();
      let emailToUse = trimmedInput;
      
      if (!isEmail(trimmedInput)) {
        const foundEmail = await getEmailFromUsername(trimmedInput);
        
        if (!foundEmail) {
          setError("No account found with this username.");
          setLoading(false);
          return;
        }
        
        emailToUse = foundEmail;
      }

      await signInWithEmailAndPassword(auth, emailToUse, password);
    } catch (err: any) {
      let errorMessage = "Failed to log in. Please check your credentials.";
      
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email address or username.";
            break;
          case 'auth/wrong-password':
            errorMessage = "Incorrect password. Please try again.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address format.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed login attempts. Please try again later.";
            break;
          default:
            errorMessage = `Login error: ${err.message || err.code}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Header */}
      <div className="header">
        <h1 onClick={() => navigate('/')}>Vōstcard</h1>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        <h1 className="welcome">Welcome</h1>

        {error && (
          <div style={{
            color: 'red',
            marginBottom: '20px',
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#ffe6e6',
            borderRadius: '8px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Username or Email Input */}
          <input
            type="text"
            placeholder="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            className="input-field"
          />

          {/* Password Input */}
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="eye-button"
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>

          {/* Log In Button */}
          <button
            type="submit"
            disabled={loading}
            className="main-button"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          {/* Register Section */}
          <p className="register-prompt">
            If you don't have an account tap here
          </p>

          {/* Register Button */}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="main-button"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}