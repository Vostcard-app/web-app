import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: '#07345c',
        color: 'white',
        width: '100%',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <span style={{
          fontSize: '2.2rem',
          fontWeight: 700,
          letterSpacing: '0.01em',
        }}>
          Vōstcard
        </span>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        boxSizing: 'border-box'
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

        {/* Email Input */}
        <input
          type="text"
          placeholder="Username or Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '90%',
            maxWidth: 400,
            fontSize: 18,
            padding: '16px 20px',
            borderRadius: 25, // Matches the button border radius exactly
            border: '1px solid #ddd',
            marginBottom: 20,
            backgroundColor: 'white',
            outline: 'none'
          }}
        />

        {/* Password Input */}
        <div style={{
          width: '90%',
          maxWidth: 400,
          position: 'relative',
          marginBottom: 40
        }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              fontSize: 18,
              padding: '16px 20px',
              borderRadius: 25, // Matches the button border radius exactly
              border: '1px solid #ddd',
              backgroundColor: 'white',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button
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

        {/* Log In Button */}
        <button
          onClick={() => navigate("/home")}
          style={{
            width: '90%',
            maxWidth: 400,
            padding: '18px 0',
            background: '#07345c',
            color: 'white',
            border: 'none',
            borderRadius: 25, // Button border radius unchanged
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
            marginBottom: 40
          }}
        >
          Log In
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

        <button
          onClick={() => navigate("/register")}
          style={{
            width: '90%',
            maxWidth: 400,
            padding: '18px 0',
            background: '#07345c',
            color: 'white',
            border: 'none',
            borderRadius: 25, // Button border radius unchanged
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)'
          }}
        >
          Register
        </button>
      </div>
    </div>
  );
}