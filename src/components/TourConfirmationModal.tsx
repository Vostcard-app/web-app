import React, { useState } from 'react';
import { FaTimes, FaCheck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import ReviewService from '../services/reviewService';

interface TourConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  completionId: string;
  tourName: string;
  travelerName: string;
  tourDate: string;
  onConfirmationSuccess: () => void;
}

const TourConfirmationModal: React.FC<TourConfirmationModalProps> = ({
  isVisible,
  onClose,
  completionId,
  tourName,
  travelerName,
  tourDate,
  onConfirmationSuccess
}) => {
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isVisible) return null;

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      await ReviewService.confirmTourDelivery(completionId, {
        bookingId: completionId, // This should be the actual booking ID
        confirmationNotes: confirmationNotes.trim()
      });

      onConfirmationSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm tour completion');
    } finally {
      setIsSubmitting(false);
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
            padding: '0',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px 24px 0 24px',
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: '#134369'
              }}>
                Confirm Tour Completion
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FaTimes />
              </button>
            </div>
            
            <div style={{
              padding: '16px',
              backgroundColor: '#e8f4fd',
              borderRadius: '8px',
              border: '1px solid #134369'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <FaExclamationTriangle color="#134369" />
                <span style={{ fontWeight: '600', color: '#134369' }}>
                  Important: Review Process
                </span>
              </div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#134369',
                lineHeight: '1.4'
              }}>
                By confirming this tour, you enable {travelerName} to leave a review. 
                They will receive an email invitation to share their experience.
              </p>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {/* Tour Details */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>
                Tour Details
              </h3>
              <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                <div><strong>Tour:</strong> {tourName}</div>
                <div><strong>Traveler:</strong> {travelerName}</div>
                <div><strong>Date:</strong> {tourDate}</div>
              </div>
            </div>

            {/* Confirmation Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
              }}>
                Additional Notes (Optional)
              </label>
              <textarea
                value={confirmationNotes}
                onChange={(e) => setConfirmationNotes(e.target.value)}
                placeholder="Any additional comments about the tour completion..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                maxLength={500}
              />
              <div style={{
                fontSize: '12px',
                color: '#666',
                textAlign: 'right',
                marginTop: '4px'
              }}>
                {confirmationNotes.length}/500 characters
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
                border: '1px solid #fcc'
              }}>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#134369',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.8 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="fa-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <FaCheck />
                    Confirm Tour Completion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TourConfirmationModal;
