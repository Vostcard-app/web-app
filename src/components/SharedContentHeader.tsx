import React from 'react';
import { FaUserCircle, FaClock, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SharedContentHeaderProps {
  sharedBy?: string;
  sharedAt?: Date | string;
  contentType: 'vostcard' | 'quickcard';
  onBack?: () => void;
}

const SharedContentHeader: React.FC<SharedContentHeaderProps> = ({
  sharedBy,
  sharedAt,
  contentType,
  onBack
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (user) {
      navigate('/home');
    } else {
      navigate('/');
    }
  };

  const formatSharedTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #002B4D 0%, #004080 100%)',
      padding: '12px 16px',
      color: 'white',
      borderBottom: '3px solid #00408020',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Top Row - Back button and Vostcard brand */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <FaArrowLeft size={16} />
          </button>
          <span style={{ 
            fontWeight: 700, 
            fontSize: '24px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            Vōstcard
          </span>
        </div>

        {/* User indicator */}
        {user && (
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <FaUserCircle size={14} />
            <span>{user.displayName || user.email?.split('@')[0] || 'Me'}</span>
          </div>
        )}
      </div>

      {/* Shared Content Context */}
      <div style={{
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '8px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          background: 'rgba(135, 206, 235, 0.3)',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Shared {contentType}
        </div>
        
        <div style={{ flex: 1, fontSize: '14px' }}>
          {sharedBy ? (
            <span>
              <strong>{sharedBy}</strong> shared this with you
            </span>
          ) : (
            <span>Someone shared this {contentType} with you</span>
          )}
        </div>

        {sharedAt && (
          <div style={{
            fontSize: '12px',
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <FaClock size={10} />
            {formatSharedTime(sharedAt)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedContentHeader; 