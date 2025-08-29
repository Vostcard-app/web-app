import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaExpand, FaTimes } from 'react-icons/fa';

interface ExpandableDescriptionProps {
  description: string;
  maxLines?: number;
  maxLength?: number;
  showPopup?: boolean;
  style?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  title?: string;
}

const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  description,
  maxLines = 3,
  maxLength = 150,
  showPopup = true,
  style = {},
  textStyle = {},
  title = "Description"
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!description || description.trim() === '') {
    return null;
  }

  const isTruncated = description.length > maxLength;
  const truncatedText = isTruncated ? description.substring(0, maxLength) + '...' : description;

  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showPopup && isTruncated) {
      setShowModal(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleModalClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowModal(false);
  };

  return (
    <>
      <div 
        style={{
          position: 'relative',
          ...style
        }}
      >
        <div
          onClick={handleToggleExpanded}
          style={{
            cursor: isTruncated ? 'pointer' : 'default',
            ...textStyle
          }}
        >
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#555',
            lineHeight: '1.4',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: isExpanded ? 'none' : maxLines,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {isExpanded ? description : truncatedText}
          </p>
        </div>

        {isTruncated && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px'
          }}>
            {!showPopup && (
              <button
                onClick={handleToggleExpanded}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007aff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 0'
                }}
              >
                {isExpanded ? (
                  <>
                    Show Less <FaChevronUp size={10} />
                  </>
                ) : (
                  <>
                    Show More <FaChevronDown size={10} />
                  </>
                )}
              </button>
            )}
            
            {showPopup && (
              <button
                onClick={handleToggleExpanded}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007aff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 0'
                }}
                title="Click to view full description"
              >
                Read More <FaExpand size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal for full description */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleModalClose}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleModalClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            >
              <FaTimes size={14} color="#666" />
            </button>

            {/* Title */}
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              paddingRight: '40px'
            }}>
              {title}
            </h3>

            {/* Scrollable content */}
            <div style={{
              maxHeight: 'calc(80vh - 120px)',
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              <p style={{
                margin: '0',
                fontSize: '16px',
                color: '#555',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {description}
              </p>
            </div>

            {/* Close button at bottom */}
            <div style={{
              marginTop: '20px',
              textAlign: 'center'
            }}>
              <button
                onClick={handleModalClose}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpandableDescription;
