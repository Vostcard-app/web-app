import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { send } from 'emailjs-com';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';

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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      {/* ✅ Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#002B4D',
          color: 'white',
          padding: '15px 20px',
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        <FaArrowLeft style={{ cursor: 'pointer' }} onClick={() => navigate(-1)} />
        <h2 style={{ margin: '0 auto', textAlign: 'center' }}>Suggestion Box</h2>
      </div>

      <p style={{ textAlign: 'center', color: '#555', marginBottom: 10 }}>
        We'd love to hear your ideas for improving Vōstcard!
      </p>

      {/* ✅ Suggestion textarea */}
      <textarea
        value={suggestionText}
        onChange={(e) => setSuggestionText(e.target.value)}
        placeholder="Type your suggestion here..."
        style={{
          width: '100%',
          minHeight: 150,
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          marginBottom: 20
        }}
      ></textarea>

      {/* ✅ Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !suggestionText.trim()}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: isSubmitting || !suggestionText.trim() ? '#ccc' : '#002B4D',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: isSubmitting || !suggestionText.trim() ? 'not-allowed' : 'pointer',
          fontSize: 16,
          fontWeight: 600
        }}
      >
        {isSubmitting ? 'Submitting...' : (
          <>
            <FaPaperPlane style={{ marginRight: 8 }} />
            Submit Suggestion
          </>
        )}
      </button>

      {/* ✅ Success message */}
      {success && (
        <p style={{ color: 'green', marginTop: 10, textAlign: 'center' }}>
          ✅ Thank you for your suggestion!
        </p>
      )}

      {/* ❌ Error message */}
      {error && (
        <p style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default SuggestionBoxView; 