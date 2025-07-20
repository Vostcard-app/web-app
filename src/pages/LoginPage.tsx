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
      
      // Try exact match first
      const exactQuery = query(collection(db, "users"), where("username", "==", trimmedUsername));
      let querySnapshot = await getDocs(exactQuery);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const email = userDoc.data().email;
        console.log('✅ Found exact match:', { username: trimmedUsername, email });
        return email || null;
      }
      
      // If no exact match, try case-insensitive search by getting all users and filtering
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

    console.log('🔐 Attempting login with:', { usernameOrEmail, trimmedInput: usernameOrEmail.trim(), passwordLength: password.length });

    try {
      const trimmedInput = usernameOrEmail.trim();
      let emailToUse = trimmedInput;
      
      // If input is not an email, try to look up the email by username
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
      
      // Provide more specific error messages
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
      height: '100svh', // Mobile-friendly viewport height
      minHeight: '100vh', // Fallback
      width: '100vw',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed', // Prevent mobile scrolling issues
      top: 0,
      left: 0,
      overflow: 'hidden',
      // Mobile safe areas
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      
      {/* Header */}
      <div style={{
        background: '#07345c',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 1000
      }}>
        <span 
          onClick={() => navigate('/')}
          style={{
            fontSize: '24px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Vōstcard
        </span>
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <form onSubmit={handleLogin} style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          
          {/* Welcome */}
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            Welcome
          </h1>

          {error && (
            <div style={{
              color: '#d32f2f',
              marginBottom: '20px',
              textAlign: 'center',
              padding: '12px',
              backgroundColor: '#ffebee',
              borderRadius: '6px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {error}
            </div>
          )}

          {/* Username or Email Input */}
          <input
            type="text"
            placeholder="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            style={{
              width: '100%',
              fontSize: '18px',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '2px solid #ddd',
              marginBottom: '20px',
              backgroundColor: 'white',
              outline: 'none',
              boxSizing: 'border-box',
              touchAction: 'manipulation'
            }}
          />

          {/* Password Input */}
          <div style={{
            width: '100%',
            position: 'relative',
            marginBottom: '30px'
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
                fontSize: '18px',
                padding: '16px 20px',
                borderRadius: '8px',
                border: '2px solid #ddd',
                backgroundColor: 'white',
                outline: 'none',
                boxSizing: 'border-box',
                touchAction: 'manipulation'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#666',
                touchAction: 'manipulation'
              }}
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>

          {/* Log In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px 0',
              background: loading ? '#ccc' : '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '20px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
              marginBottom: '30px',
              touchAction: 'manipulation'
            }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          {/* Register Section */}
          <p style={{
            color: '#666',
            fontSize: '16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Don't have an account?
          </p>

          {/* Register Button */}
          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{
              width: '100%',
              padding: '18px 0',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '20px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
              touchAction: 'manipulation'
            }}
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}