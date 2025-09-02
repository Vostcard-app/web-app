import React, { useState } from 'react';
import { FaTimes, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { GuidedTour } from '../types/GuidedTourTypes';

interface DeleteTourModalProps {
  isVisible: boolean;
  onClose: () => void;
  tour: GuidedTour;
  onConfirmDelete: (tourId: string) => Promise<void>;
}

const DeleteTourModal: React.FC<DeleteTourModalProps> = ({
  isVisible,
  onClose,
  tour,
  onConfirmDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!isVisible) return null;

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      alert('Please type "DELETE" to confirm deletion');
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirmDelete(tour.id);
      onClose();
    } catch (error) {
      console.error('❌ Error deleting tour:', error);
      alert('Failed to delete tour. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaExclamationTriangle size={20} color="#dc2626" />
            </div>
            
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                Delete Tour
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                This action cannot be undone
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                padding: '8px'
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>
                You are about to delete:
              </h4>
              <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                "{tour.name}"
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                {tour.description}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                What will be deleted:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
                <li>Tour information and details</li>
                <li>All tour images and media</li>
                <li>Tour itinerary and meeting points</li>
                <li>Tour policies and requirements</li>
                <li style={{ color: '#dc2626', fontWeight: '500' }}>
                  All existing bookings will be cancelled
                </li>
              </ul>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: '#333'
              }}>
                Type "DELETE" to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  borderColor: confirmText.toLowerCase() === 'delete' ? '#10b981' : '#e5e7eb'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = confirmText.toLowerCase() === 'delete' ? '#10b981' : '#e5e7eb'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleDelete}
                disabled={isDeleting || confirmText.toLowerCase() !== 'delete'}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: confirmText.toLowerCase() === 'delete' ? '#dc2626' : '#9ca3af',
                  color: 'white',
                  cursor: confirmText.toLowerCase() === 'delete' && !isDeleting ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                <FaTrash size={14} />
                {isDeleting ? 'Deleting...' : 'Delete Tour'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteTourModal;
