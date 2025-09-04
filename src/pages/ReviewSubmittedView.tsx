import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaHome, FaStar } from 'react-icons/fa';

const ReviewSubmittedView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message || 'Thank you for your review!';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#e8f5e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto'
        }}>
          <FaCheckCircle size={40} color="#28a745" />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#134369',
          marginBottom: '16px'
        }}>
          Review Submitted!
        </h1>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
          {message}
        </p>

        {/* Benefits */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaStar color="#ffc107" size={16} />
            Your review helps:
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <li>Other travelers make informed decisions</li>
            <li>Guides improve their services</li>
            <li>Build trust in our community</li>
            <li>Support quality tourism experiences</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#134369',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaHome size={14} />
            Return to Home
          </button>
          
          <button
            onClick={() => navigate('/browse-area')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#134369',
              border: '2px solid #134369',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Explore More Tours
          </button>
        </div>

        {/* Footer Note */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#e8f4fd',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#134369'
        }}>
          <strong>What's next?</strong> Your review will be visible on the guide's profile after moderation. 
          You'll receive an email confirmation shortly.
        </div>
      </div>
    </div>
  );
};

export default ReviewSubmittedView;
