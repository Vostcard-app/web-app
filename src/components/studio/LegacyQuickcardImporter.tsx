import React, { useState, useEffect } from 'react';
import { FaImage, FaMapMarkerAlt, FaClock, FaEdit, FaArrowRight } from 'react-icons/fa';
import { useVostcard } from '../../context/VostcardContext';
import { useVostcardEdit } from '../../context/VostcardEditContext';
import type { Vostcard } from '../../types/VostcardTypes';

interface QuickcardImporterProps {
  onImport: (quickcard: Vostcard) => void;
  onCancel: () => void;
}

export const QuickcardImporter: React.FC<QuickcardImporterProps> = ({ onImport, onCancel }) => {
  const { savedVostcards, loadAllLocalVostcardsImmediate } = useVostcard();
  const [loading, setLoading] = useState(true);
  const [selectedQuickcard, setSelectedQuickcard] = useState<Vostcard | null>(null);

  // Filter quickcards from saved vostcards
  const quickcards = savedVostcards.filter(vostcard => vostcard.isQuickcard === true);

  useEffect(() => {
    const loadQuickcards = async () => {
      try {
        setLoading(true);
        await loadAllLocalVostcardsImmediate();
      } catch (error) {
        console.error('Failed to load quickcards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuickcards();
  }, [loadAllLocalVostcardsImmediate]);

  const handleImport = () => {
    if (selectedQuickcard) {
      onImport(selectedQuickcard);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📱</div>
          <div>Loading your quickcards...</div>
        </div>
      </div>
    );
  }

  if (quickcards.length === 0) {
    return (
      <div style={{
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd',
        padding: '30px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
        <h3 style={{ color: '#333', marginBottom: '12px' }}>No Quickcards Found</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Create some quickcards first to import them into Studio.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #ddd',
      padding: '20px',
      width: '100%'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
        📱 Import Quickcard
      </h3>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        Select a quickcard to enhance in Studio. You can add audio, edit content, and create a full vostcard.
      </p>

      {/* Quickcard List */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '20px'
      }}>
        {quickcards.map(quickcard => {
          const isSelected = selectedQuickcard?.id === quickcard.id;
          const hasPhoto = quickcard.photos && quickcard.photos.length > 0;
          const photoUrl = hasPhoto ? URL.createObjectURL(quickcard.photos[0]) : null;
          
          return (
            <div
              key={quickcard.id}
              onClick={() => setSelectedQuickcard(quickcard)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: isSelected ? '#e3f2fd' : 'white',
                border: `2px solid ${isSelected ? '#2196f3' : '#e0e0e0'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Photo Thumbnail */}
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Quickcard"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <FaImage color="#ccc" size={24} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  margin: '0 0 4px 0',
                  color: '#333',
                  fontSize: '16px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {quickcard.title || 'Untitled Quickcard'}
                </h4>
                
                {quickcard.description && (
                  <p style={{
                    margin: '0 0 8px 0',
                    color: '#666',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {quickcard.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#888'
                }}>
                  {quickcard.geo && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaMapMarkerAlt size={10} />
                      Location
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaClock size={10} />
                    {new Date(quickcard.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#2196f3',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={onCancel}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!selectedQuickcard}
          style={{
            backgroundColor: selectedQuickcard ? '#007aff' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: selectedQuickcard ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaEdit size={14} />
          Import & Edit
          <FaArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}; 