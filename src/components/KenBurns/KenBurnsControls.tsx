import React, { useState } from 'react';
import { FaPlay, FaPause, FaStop, FaMagic } from 'react-icons/fa';

interface KenBurnsControlsProps {
  isEnabled: boolean;
  isProcessing: boolean;
  progress: number;
  onToggleEnabled: (enabled: boolean) => void;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
}

const KenBurnsControls: React.FC<KenBurnsControlsProps> = ({
  isEnabled,
  isProcessing,
  progress,
  onToggleEnabled,
  onStartProcessing,
  onStopProcessing
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '12px',
      padding: '20px',
      margin: '16px 0'
    }}>
      {/* Main Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaMagic size={24} color="#007aff" />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              Ken Burns Effect
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
              Add cinematic photo transitions to your vostcard
            </p>
          </div>
        </div>
        
        <label style={{
          position: 'relative',
          display: 'inline-block',
          width: '60px',
          height: '34px'
        }}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isEnabled ? '#007aff' : '#ccc',
            transition: '.4s',
            borderRadius: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isEnabled ? 'flex-end' : 'flex-start',
            padding: '4px'
          }}>
            <span style={{
              height: '26px',
              width: '26px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: '.4s'
            }} />
          </span>
        </label>
      </div>

      {/* Processing Controls */}
      {isEnabled && (
        <div style={{
          borderTop: '1px solid #dee2e6',
          paddingTop: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <button
              onClick={isProcessing ? onStopProcessing : onStartProcessing}
              disabled={!isEnabled}
              style={{
                background: isProcessing ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isEnabled ? 'pointer' : 'not-allowed',
                opacity: isEnabled ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isProcessing ? (
                <>
                  <FaStop size={14} />
                  Stop Processing
                </>
              ) : (
                <>
                  <FaPlay size={14} />
                  Start Processing
                </>
              )}
            </button>
            
            {isProcessing && (
              <span style={{ fontSize: '14px', color: '#666' }}>
                Processing...
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div style={{
              background: '#e9ecef',
              borderRadius: '8px',
              height: '8px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                background: '#007aff',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
                borderRadius: '8px'
              }} />
            </div>
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#666'
          }}>
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {/* Advanced Options Toggle */}
      <div style={{
        borderTop: '1px solid #dee2e6',
        paddingTop: '16px',
        marginTop: '16px'
      }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007aff',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>
        
        {showAdvanced && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
              <strong>Note:</strong> Ken Burns effect works best with:
            </p>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '12px',
              color: '#666'
            }}>
              <li>Videos that are 29-31 seconds long</li>
              <li>High-quality photos (at least 1080x1920)</li>
              <li>Photos with good contrast and composition</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default KenBurnsControls; 