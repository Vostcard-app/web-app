// ✅ Blueprint: ReportBugView for PWA (React + Firebase)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      {/* 🔵 Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => navigate('/home')}
          style={{ background: '#002B4D', color: 'white', border: 'none', padding: 10, borderRadius: 8, cursor: 'pointer' }}
        >
          <FaHome /> Home
        </button>
        <h1 style={{ color: '#002B4D' }}>Report a Bug</h1>
      </div>

      {/* 📝 Bug Report Form */}
      <textarea
        value={messageBody}
        onChange={(e) => setMessageBody(e.target.value)}
        placeholder="Describe the issue you encountered..."
        rows={8}
        style={{
          width: '100%',
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 12,
          marginTop: 20,
          resize: 'vertical',
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{
          background: '#667eea',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 10,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginTop: 20,
        }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
      </button>

      {/* 🟢 Feedback Message */}
      {feedbackMessage && (
        <p style={{ marginTop: 15, color: feedbackMessage.includes('✅') ? 'green' : 'red' }}>
          {feedbackMessage}
        </p>
      )}

      {/* 📄 Footer */}
      <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 30 }}>
        This bug report will be sent to the Vōstcard support team.
      </p>
    </div>
  );
};

export default ReportBugView; 