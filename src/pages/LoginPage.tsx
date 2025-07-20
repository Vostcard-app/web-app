import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

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
      console.log('🔍 Looking up username:', { original: username, trimmed: trimmedUsername });
      
      const exactQuery = query(collection(db, "users"), where("username", "==", trimmedUsername));
      let querySnapshot = await getDocs(exactQuery);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const email = userDoc.data().email;
        console.log('✅ Found exact match:', { username: trimmedUsername, email });
        return email || null;
      }
      
      console.log('🔍 No exact match, trying case-insensitive search...');
      const allUsersQuery = query(collection(db, "users"));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      const lowerUsername = trimmedUsername.toLowerCase();
      for (const userDoc of allUsersSnapshot.docs) {
        const userData = userDoc.data();
        const storedUsername = userData.username;
        
        if (storedUsername && storedUsername.toLowerCase() === lowerUsername) {
          const email = userData.email;
          console.log('✅ Found case-insensitive match:', { 
            searched: trimmedUsername, 
            found: storedUsername, 
            email 
          });
          return email || null;
        }
      }
      
      console.log('❌ No username match found');
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
        console.log('🔍 Input appears to be a username, looking up email...');
        const foundEmail = await getEmailFromUsername(trimmedInput);
        
        if (!foundEmail) {
          setError("No account found with this username.");
          setLoading(false);
          return;
        }
        
        emailToUse = foundEmail;
        console.log('✅ Found email for username:', emailToUse);
      }

      await signInWithEmailAndPassword(auth, emailToUse, password);
      console.log('✅ Login successful');
      // Auth redirect will handle navigation
    } catch (err: any) {
      console.error("Login error:", err);
      
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
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed login attempts. Please try again later.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your internet connection.";
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
    <div style={{ 
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      margin: 0,
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Header - SIMPLIFIED */}
      <div style={{
        background: '#07345c',
        color: 'white',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        flexShrink: 0,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <span 
          onClick={() => navigate('/')}
          style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            letterSpacing: '0.01em',
            cursor: 'pointer',
          }}>
          Vōstcard
        </span>
      </div>

      {/* Content - SIMPLIFIED */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        width: '100%',
        backgroundColor: '#f5f5f5'
      }}>
        {/* Welcome */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '60px',
          textAlign: 'center'
        }}>
          Welcome
        </h1>

        {error && (
          <div style={{
            color: 'red',
            marginBottom: '20px',
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#ffe6e6',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '400px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Username or Email Input */}
          <input
            type="text"
            placeholder="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            style={{
              width: '90%',
              fontSize: 18,
              padding: '16px 20px',
              borderRadius: 25,
              border: '1px solid #ddd',
              marginBottom: 20,
              backgroundColor: 'white',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />

          {/* Password Input */}
          <div style={{
            width: '90%',
            position: 'relative',
            marginBottom: 40
          }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              style={{
                width: '100%',
                fontSize: 18,
                padding: '16px 20px',
                borderRadius: 25,
                border: '1px solid #ddd',
                backgroundColor: 'white',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 15,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 18, color: '#666' }}></i>
            </button>
          </div>

          {/* Log In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '90%',
              padding: '18px 0',
              background: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 20,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
              marginBottom: 40,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          {/* Register Section */}
          <p style={{
            color: '#999',
            fontSize: 16,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            If you don't have an account tap here
          </p>

          {/* Register Button */}
          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{
              width: '90%',
              padding: '18px 0',
              background: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 20,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)'
            }}
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}