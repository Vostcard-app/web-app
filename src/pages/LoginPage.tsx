import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { useResponsive } from "../hooks/useResponsive";
import RoundInfoButton from '../assets/RoundInfo_Button.png';

export default function LoginPage() {
  const { isDesktop } = useResponsive();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
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

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!forgotPasswordEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    setForgotPasswordLoading(true);
    setError("");

    try {
      const trimmedEmail = forgotPasswordEmail.trim();
      let emailToUse = trimmedEmail;
      
      // If input is not an email, try to look up the email by username
      if (!isEmail(trimmedEmail)) {
        console.log('🔍 Input appears to be a username, looking up email for password reset...');
        const foundEmail = await getEmailFromUsername(trimmedEmail);
        
        if (!foundEmail) {
          setError("No account found with this username.");
          setForgotPasswordLoading(false);
          return;
        }
        
        emailToUse = foundEmail;
        console.log('✅ Found email for username:', emailToUse);
      }

      await sendPasswordResetEmail(auth, emailToUse);
      console.log('✅ Password reset email sent successfully');
      setForgotPasswordSuccess(true);
      setForgotPasswordEmail("");
    } catch (err: any) {
      console.error("Password reset error:", err);
      
      let errorMessage = "Failed to send password reset email. Please try again.";
      
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email address or username.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address format.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many password reset attempts. Please try again later.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your internet connection.";
            break;
          default:
            errorMessage = `Password reset error: ${err.message || err.code}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDesktop ? '#f0f0f0' : '#f5f5f5',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: isDesktop ? '20px' : '0'
    }}>
      {/* Mobile-style container with responsive design */}
      <form onSubmit={handleLogin} style={{
        width: isDesktop ? '390px' : '100%',
        maxWidth: '390px',
        height: isDesktop ? '844px' : '100vh',
        backgroundColor: '#f5f5f5',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: isDesktop ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'all 0.3s ease',
        position: isDesktop ? 'relative' : 'fixed',
        top: isDesktop ? 'auto' : 0,
        left: isDesktop ? 'auto' : 0,
        right: isDesktop ? 'auto' : 0,
        bottom: isDesktop ? 'auto' : 0
      }}>
      {/* Header */}
      <div style={{
        background: '#07345c',
        color: 'white',
        width: '100%',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        borderTopLeftRadius: isDesktop ? 16 : 0,
        borderTopRightRadius: isDesktop ? 16 : 0,
        flexShrink: 0
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
        
        {/* What's Vōstcard Button */}
        <div
          onClick={() => navigate('/user-guide')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img 
            src={RoundInfoButton} 
            alt="Round Info Button" 
            style={{
              width: '40px',
              height: '40px',
              marginBottom: '2px'
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center'
          }}>
            What's Vōstcard
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        minHeight: 0
      }}>
        {/* Welcome */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '60px',
          textAlign: 'center',
          margin: '0 0 60px 0'
        }}>
          Welcome
        </h1>

        {error && (
          <div style={{
            color: 'red',
            marginBottom: '20px',
            textAlign: 'center'
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
            width: '90%',
            maxWidth: 400,
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
          maxWidth: 400,
          position: 'relative',
          marginBottom: 20
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
              cursor: 'pointer'
            }}
          >
            <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 18, color: '#666' }}></i>
          </button>
        </div>

        {/* Forgot Password Link */}
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#07345c',
            fontSize: 16,
            cursor: 'pointer',
            textDecoration: 'underline',
            marginBottom: 40,
            alignSelf: 'flex-end',
            marginRight: '5%'
          }}
        >
          Forgot Password?
        </button>

        {/* Log In Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '90%',
            maxWidth: 400,
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
            maxWidth: 400,
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
      </div>
    </form>

    {/* Forgot Password Modal */}
    {showForgotPassword && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => {
          setShowForgotPassword(false);
          setForgotPasswordSuccess(false);
          setError("");
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}
          onClick={e => e.stopPropagation()}
        >
          {!forgotPasswordSuccess ? (
            <>
              <h2 style={{
                margin: '0 0 20px 0',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Reset Password
              </h2>
              
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '16px',
                color: '#666',
                lineHeight: 1.5
              }}>
                Enter your email address or username and we'll send you a link to reset your password.
              </p>

              {error && (
                <div style={{
                  color: 'red',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <input
                type="text"
                placeholder="Email or Username"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: 16,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  marginBottom: 20,
                  backgroundColor: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail("");
                    setError("");
                  }}
                  style={{
                    backgroundColor: '#f8f9fa',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordLoading}
                  style={{
                    backgroundColor: '#07345c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: forgotPasswordLoading ? 'not-allowed' : 'pointer',
                    flex: 1,
                    opacity: forgotPasswordLoading ? 0.7 : 1
                  }}
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontSize: '48px',
                marginBottom: '20px',
                color: '#28a745'
              }}>
                ✓
              </div>
              <h2 style={{
                margin: '0 0 20px 0',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Check Your Email
              </h2>
              
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '16px',
                color: '#666',
                lineHeight: 1.5
              }}>
                We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
              </p>

              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordSuccess(false);
                  setError("");
                }}
                style={{
                  backgroundColor: '#07345c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    )}
    </div>
  );
}