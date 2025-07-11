// ✅ Blueprint: ReportBugView for PWA (React + Firebase)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft } from 'react-icons/fa';

const ReportBugView: React.FC = () => {
  const navigate = useNavigate();
  const [messageBody, setMessageBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleSubmit = async () => {
    if (!messageBody.trim()) {
      setFeedbackMessage('⚠️ Please enter a message before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedbackMessage('');

      // ✅ Send email via Firebase Cloud Function (or use EmailJS as fallback)
      const response = await fetch('/.netlify/functions/sendBugReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Vōstcard Bug Report (PWA)',
          body: messageBody,
          recipient: 'support@vostcardapp.com',
        }),
      });

      if (response.ok) {
        setFeedbackMessage('✅ Bug report submitted successfully!');
        setMessageBody('');
      } else {
        throw new Error('Failed to send bug report');
      }
    } catch (error) {
      console.error('❌ Error sending bug report:', error);
      setFeedbackMessage('❌ Could not send bug report. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>Vōstcard</span>
        <FaHome
          size={50}
          style={{ cursor: 'pointer', color: 'white' }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* Content Container */}
      <div style={{ 
        maxWidth: 800, 
        margin: '20px auto', 
        padding: '20px',
        flex: 1,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <FaArrowLeft 
            style={{ 
              cursor: 'pointer',
              fontSize: 24,
              color: '#002B4D'
            }} 
            onClick={() => navigate(-1)} 
          />
          <h2 style={{ 
            margin: '0 0 0 15px',
            color: '#002B4D',
            fontSize: 24
          }}>
            Report a Bug
          </h2>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ 
            color: '#555', 
            marginBottom: 20,
            fontSize: 16
          }}>
            Please describe the issue you encountered and we'll look into it.
          </p>

          {/* Bug Report Form */}
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Describe the issue you encountered..."
            style={{
              width: '100%',
              minHeight: 150,
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              marginBottom: 20,
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: isSubmitting ? '#e0e0e0' : '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
          </button>

          {/* Feedback Message */}
          {feedbackMessage && (
            <p style={{ 
              marginTop: 15, 
              color: feedbackMessage.includes('✅') ? '#28a745' : '#dc3545',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: 8
            }}>
              {feedbackMessage}
            </p>
          )}

          {/* Footer */}
          <p style={{ 
            fontSize: 14, 
            color: '#666', 
            marginTop: 20,
            textAlign: 'center'
          }}>
            This bug report will be sent to the Vōstcard support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportBugView; 