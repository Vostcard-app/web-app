import React from 'react';
import { FaMapPin, FaEye, FaEyeSlash, FaEdit, FaTrash, FaShare, FaLink } from 'react-icons/fa';
import type { Tour } from '../types/TourTypes';

interface TourListProps {
  tours: Tour[];
  isCurrentUser: boolean;
  onTourClick: (tour: Tour) => void;
  onEditTour?: (tour: Tour) => void;
  onDeleteTour?: (tour: Tour) => void;
  onToggleSharing?: (tour: Tour) => void;
  userRole?: string;
}

const TourList: React.FC<TourListProps> = ({
  tours,
  isCurrentUser,
  onTourClick,
  onEditTour,
  onDeleteTour,
  onToggleSharing,
  userRole,
}) => {
  const getTourTerminology = () => {
    return userRole === 'guide' ? 'Tour' : 'Trip';
  };

  if (tours.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#666',
        fontStyle: 'italic'
      }}>
        {isCurrentUser ? `No ${getTourTerminology().toLowerCase()}s created yet` : `No ${getTourTerminology().toLowerCase()}s available`}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{ 
        marginBottom: '16px', 
        fontSize: '20px', 
        fontWeight: '600',
        color: '#333'
      }}>
        {getTourTerminology()}s ({tours.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tours.map((tour) => (
          <div
            key={tour.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => onTourClick(tour)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = '#007aff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e0e0e0';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <FaMapPin style={{ color: '#007aff', fontSize: '16px' }} />
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {tour.name}
                  </h4>
                  {!tour.isPublic && (
                    <FaEyeSlash style={{ color: '#666', fontSize: '14px' }} title="Private tour" />
                  )}
                  {tour.isShareable && (
                    <FaLink style={{ color: '#007aff', fontSize: '14px' }} title="Shareable tour" />
                  )}
                </div>
                
                {tour.description && (
                  <p style={{ 
                    margin: '0 0 8px 0', 
                    color: '#666', 
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {tour.description}
                  </p>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  fontSize: '12px',
                  color: '#999'
                }}>
                  <span>{tour.postIds.length} {tour.postIds.length === 1 ? 'post' : 'posts'}</span>
                  <span>Created {tour.createdAt.toLocaleDateString()}</span>
                  {tour.isShareable && tour.shareableUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(tour.shareableUrl!);
                        alert('Shareable link copied to clipboard!');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#007aff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Copy shareable link"
                    >
                      <FaShare size={10} />
                      Copy Link
                    </button>
                  )}
                </div>
              </div>
              
              {/* Action buttons for current user */}
              {isCurrentUser && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  marginLeft: '12px'
                }}>
                  {onToggleSharing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSharing(tour);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: tour.isShareable ? '#28a745' : '#007aff',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                      title={tour.isShareable ? 'Disable sharing' : 'Enable sharing'}
                    >
                      <FaShare size={14} />
                    </button>
                  )}
                  {onEditTour && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTour(tour);
                      }}
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid #007aff',
                        color: '#007aff',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                      title="Edit tour"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#007aff';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8f9fa';
                        e.currentTarget.style.color = '#007aff';
                      }}
                    >
                      <FaEdit size={12} style={{ marginRight: '4px' }} />
                      Edit
                    </button>
                  )}
                  {onDeleteTour && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${tour.name}"?`)) {
                          onDeleteTour(tour);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d32f2f',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                      title="Delete tour"
                    >
                      <FaTrash size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TourList; 