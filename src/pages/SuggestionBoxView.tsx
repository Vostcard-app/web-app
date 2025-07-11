import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { send } from 'emailjs-com';
import { FaArrowLeft, FaPaperPlane, FaHome } from 'react-icons/fa';

const SuggestionBoxView: React.FC = () => {
  const navigate = useNavigate();
  const [suggestionText, setSuggestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!suggestionText.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // 🌐 Replace with your backend endpoint or emailJS
      await send(
        'YOUR_EMAILJS_SERVICE_ID',
        'YOUR_EMAILJS_TEMPLATE_ID',
        {
          suggestion: suggestionText.trim(),
          user_email: 'user@example.com', // Replace with actual logged in user's email
          user_name: 'Anonymous'          // Replace with actual username if available
        },
        'YOUR_EMAILJS_PUBLIC_KEY'
      );
      setSuccess(true);
      setSuggestionText('');
    } catch (err: any) {
      console.error('❌ Failed to send suggestion:', err);
      setError('Failed to send suggestion. Please try again.');
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
            Suggestion Box
          </h2>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ 
            textAlign: 'center', 
            color: '#555', 
            marginBottom: 20,
            fontSize: 16
          }}>
            We'd love to hear your ideas for improving Vōstcard!
          </p>

          {/* Suggestion textarea */}
          <textarea
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
            placeholder="Type your suggestion here..."
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
            disabled={isSubmitting || !suggestionText.trim()}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: isSubmitting || !suggestionText.trim() ? '#e0e0e0' : '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: isSubmitting || !suggestionText.trim() ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {isSubmitting ? 'Submitting...' : (
              <>
                <FaPaperPlane />
                Submit Suggestion
              </>
            )}
          </button>

          {/* Messages */}
          {success && (
            <p style={{ 
              color: '#28a745', 
              marginTop: 15, 
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: 8
            }}>
              ✅ Thank you for your suggestion!
            </p>
          )}

          {error && (
            <p style={{ 
              color: '#dc3545', 
              marginTop: 15, 
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: 8
            }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionBoxView; 