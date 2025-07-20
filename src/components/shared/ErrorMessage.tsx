// Reusable Error Message Component
import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
  showRetry?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onRetry,
  retryText = 'Retry',
  showRetry = true 
}) => {
  const containerStyle: React.CSSProperties = {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #ffcdd2',
    textAlign: 'center'
  };

  const retryButtonStyle: React.CSSProperties = {
    backgroundColor: '#c62828',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '8px',
    fontSize: '14px'
  };

  return (
    <div style={containerStyle}>
      <p style={{ margin: '0 0 8px 0' }}>{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          style={retryButtonStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#b71c1c';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#c62828';
          }}
        >
          {retryText}
        </button>
      )}
    </div>
  );
}; 