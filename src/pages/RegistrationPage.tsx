import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import InfoPin from "../assets/Info_pin.png";
import { useResponsive } from "../hooks/useResponsive";
import "./RegistrationPage.css";



const linkStyle = {
  color: '#07345c',
  fontWeight: 600,
  fontSize: 14,
  textDecoration: 'underline',
  cursor: 'pointer',
};

export default function RegistrationPage() {
  const { isDesktop } = useResponsive();
  const [formType, setFormType] = useState<"user" | "advertiser">("user");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper to check if username is unique (case-insensitive)
  const isUsernameUnique = async (username: string) => {
    try {
      // First try exact match
      const exactQuery = query(collection(db, "users"), where("username", "==", username));
      let querySnapshot = await getDocs(exactQuery);
      
      if (!querySnapshot.empty) {
        return false;
      }
      
      // Then check case-insensitive match
      const allUsersQuery = query(collection(db, "users"));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      const lowerUsername = username.toLowerCase();
      for (const userDoc of allUsersSnapshot.docs) {
        const userData = userDoc.data();
        const storedUsername = userData.username;
        
        if (storedUsername && storedUsername.toLowerCase() === lowerUsername) {
          return false; // Username already exists (case-insensitive)
        }
      }
      
      return true; // Username is unique
    } catch (error) {
      console.error("Error checking username uniqueness:", error);
      return false; // Err on the side of caution
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("🔐 Registering user with:", { email, password, formType });

    // Basic validation
    if (!firstName || !lastName || !email || !password || (formType === "user" && !username) || (formType === "advertiser" && !businessName)) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    if (!agreed) {
      setError("You must agree to the terms and privacy policy.");
      setLoading(false);
      return;
    }

    try {
      // For user, check username uniqueness
      if (formType === "user") {
        const trimmedUsername = username.trim();
        
        // Basic username validation
        if (trimmedUsername.length < 3) {
          setError("Username must be at least 3 characters long.");
          setLoading(false);
          return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
          setError("Username can only contain letters, numbers, and underscores.");
          setLoading(false);
          return;
        }
        
        const unique = await isUsernameUnique(trimmedUsername);
        if (!unique) {
          setError("Username is already taken.");
          setLoading(false);
          return;
        }
        
        // Update the username to the trimmed version
        setUsername(trimmedUsername);
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);
      
      // Save extra info to Firestore
      if (formType === "user") {
        const trimmedUsername = username.trim();
        await setDoc(doc(db, "users", user.uid), {
          firstName,
          lastName,
          username: trimmedUsername,
          email,
          userRole: "user",
          createdAt: new Date(),
        });
        window.alert('Registration successful! Please verify your email before logging in. It may go to spam.');
      } else {
        await setDoc(doc(db, "advertisers", user.uid), {
          firstName,
          lastName,
          businessName,
          email,
          userRole: "advertiser",
          accountStatus: "pending",
          createdAt: new Date(),
        });

        // Send email notification to info@vostcard.com about new advertiser application
        try {
          console.log('📧 Sending advertiser application notification...');
          const response = await fetch('/.netlify/functions/sendAdvertiserNotification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firstName,
              lastName,
              businessName,
              email,
              applicationId: user.uid,
              timestamp: new Date().toISOString()
            }),
          });

          if (response.ok) {
            console.log('✅ Advertiser application notification sent successfully');
          } else {
            console.warn('⚠️ Failed to send advertiser application notification:', await response.text());
          }
        } catch (emailError) {
          console.error('❌ Error sending advertiser application notification:', emailError);
          // Don't block registration if email fails
        }

        window.alert('Application submitted successfully! Please verify your email, then an admin will review your advertiser application. You will be contacted once approved.');
      }

      // ✅ Force logout so they must log in after verifying
      await auth.signOut();

      // Redirect to login page with a success message
      const message = formType === "user" 
        ? "Registration successful! Please verify your email before logging in. It may go to spam."
        : "Application submitted! Please verify your email. An admin will review your advertiser application and contact you once approved.";
      navigate("/login", { state: { message } });
    } catch (err: any) {
      console.error('Registration error:', err.code, err.message, err);
      setError((err.code ? err.code + ': ' : '') + (err.message || 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: isDesktop ? '20px' : '0'
    }}>
      {/* Mobile-style container with responsive design */}
      <div style={{
        width: isDesktop ? '390px' : '100%',
        maxWidth: '390px',
        height: isDesktop ? '844px' : '100vh',
        backgroundColor: '#fff',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: isDesktop ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'all 0.3s ease'
      }}>
      {/* Header */}
      <div style={{
        background: '#07345c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '32px 24px 24px 24px',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderTopLeftRadius: isDesktop ? 16 : 0,
        borderTopRightRadius: isDesktop ? 16 : 0,
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}>
        <h1 
          onClick={() => navigate('/home')}
          style={{
          color: 'white',
          fontWeight: 700,
          fontSize: 14,
          margin: 0,
          cursor: 'pointer',
        }}>Vōstcard</h1>
        <div
          onClick={() => navigate("/user-guide")}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img 
            src={InfoPin} 
            alt="Info Pin" 
            style={{
              width: '40px',
              height: '40px',
              marginBottom: '4px'
            }}
          />
          <span style={{
            fontSize: 14,
            fontWeight: '500',
            color: 'white'
          }}>
            Quick Guide
          </span>
        </div>
      </div>

      {/* Large Account Type Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '40px auto 24px auto',
        width: '95%',
        maxWidth: 500,
        alignSelf: 'center',
      }}>
        <button
          onClick={() => setFormType("user")}
          style={{
            flex: 1,
            padding: '24px 0',
            background: formType === "user" ? "#07345c" : "#eee",
            color: formType === "user" ? "#fff" : "#07345c",
            border: 'none',
            borderRadius: '8px 0 0 8px',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            boxShadow: formType === "user" ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
          }}
        >
          User
        </button>
        <button
          onClick={() => setFormType("advertiser")}
          style={{
            flex: 1,
            padding: '24px 0',
            background: formType === "advertiser" ? "#07345c" : "#eee",
            color: formType === "advertiser" ? "#fff" : "#07345c",
            border: 'none',
            borderRadius: '0 8px 8px 0',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            boxShadow: formType === "advertiser" ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
          }}
        >
          Advertiser
        </button>
      </div>

      {/* Advertiser Notice */}
      {formType === "advertiser" && (
        <div style={{
          width: '90%',
          maxWidth: 400,
          margin: '0 auto 24px auto',
          padding: '16px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          textAlign: 'center',
          fontSize: 14,
          color: '#333',
          lineHeight: 1.4,
        }}>
          To ensure there aren't too many advertisers in one area, we'll contact you to confirm availability in your location.
        </div>
      )}

      {/* Form */}
      <form
        style={{
          width: '90%',
          maxWidth: 400,
          marginBottom: 40,
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'center',
          alignItems: 'center',
        }}
        onSubmit={handleRegister}
      >
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="centered-input"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          className="centered-input"
        />
        {formType === "user" && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="centered-input"
          />
        )}
        {formType === "advertiser" && (
          <input
            type="text"
            placeholder="Business Name"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            className="centered-input"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="centered-input"
        />
        <div style={{ position: 'relative', marginBottom: 20, width: '100%' }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="centered-input"
            style={{ marginBottom: 0, textAlign: 'center' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 14, color: '#888' }}></i>
          </button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <a href="/terms" style={linkStyle}>Terms & Conditions</a>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <a href="/privacy" style={linkStyle}>Privacy Policy</a>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 24,
          paddingLeft: 10,
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ width: 28, height: 28, marginRight: 12 }}
            id="agree"
          />
          <label htmlFor="agree" style={{ color: '#b0b0b0', fontSize: 14 }}>
            I have Read and Agree to the above
          </label>
        </div>
        {error && <div style={{ color: "#ff3b30", textAlign: "center", marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={!agreed || loading}
          style={{
            width: '100%',
            background: agreed ? "#07345c" : "#b0b0b0",
            color: 'white',
            border: 'none',
            borderRadius: 16,
            fontSize: 14,
            fontWeight: 600,
            padding: '20px 0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            cursor: agreed && !loading ? 'pointer' : 'not-allowed',
            letterSpacing: '0.01em',
          }}
        >
          {loading ? "Registering..." : (formType === "advertiser" ? "Apply" : "Register")}
        </button>
      </form>
      </div>
    </div>
  );
}