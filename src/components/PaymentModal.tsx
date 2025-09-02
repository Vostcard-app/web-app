import React, { useState } from 'react';
import { FaTimes, FaCreditCard, FaLock, FaPaypal } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { GuidedTourService } from '../services/guidedTourService';

interface BookingData {
  tourId: string;
  selectedDate: Date;
  startTime: string;
  duration: number;
  adults: number;
  children: number;
  personalMessage: string;
}

interface PaymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  bookingData: BookingData;
  tourDetails: {
    id: string;
    name: string;
    basePrice: number;
    guideName: string;
  };
  onPaymentSuccess: (bookingId: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isVisible,
  onClose,
  bookingData,
  tourDetails,
  onPaymentSuccess
}) => {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isVisible) return null;

  // Calculate pricing - basePrice already includes platform fee
  const pricePerPerson = tourDetails.basePrice; // Inclusive price
  const totalParticipants = bookingData.adults + bookingData.children;
  const total = pricePerPerson * totalParticipants;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handlePayment = async () => {
    if (!user) {
      setError('Please log in to complete booking');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create booking request
      const bookTourRequest = {
        tourId: tourDetails.id,
        userId: user.uid,
        bookingDetails: {
          date: bookingData.selectedDate.toISOString().split('T')[0],
          startTime: bookingData.startTime,
          duration: bookingData.duration,
          specialRequests: bookingData.personalMessage
        },
        participants: [
          ...Array(bookingData.adults).fill({ type: 'adult', age: 25 }),
          ...Array(bookingData.children).fill({ type: 'child', age: 10 })
        ],
        paymentMethodId: 'temp_payment_method', // TODO: Integrate with Stripe
        specialRequests: bookingData.personalMessage
      };

      // Create the booking
      const bookingId = await GuidedTourService.bookTour(bookTourRequest);
      
      // TODO: Process actual payment with Stripe
      // For now, simulate successful payment
      console.log('💳 Processing payment...', { paymentMethod, cardDetails });
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onPaymentSuccess(bookingId);
      onClose();
      
    } catch (error) {
      console.error('❌ Payment failed:', error);
      setError('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
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
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              Complete Booking
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '20px' }}>
            {/* Booking Summary */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Booking Summary</h3>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>{tourDetails.name}</strong> with {tourDetails.guideName}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  Date: {bookingData.selectedDate.toLocaleDateString()}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  Time: {bookingData.startTime}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  Duration: {bookingData.duration} hours
                </div>
                <div>
                  Participants: {bookingData.adults} adults, {bookingData.children} children
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div style={{
              border: '1px solid #eee',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Price Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{formatPrice(pricePerPerson)} × {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}</span>
                <span>{formatPrice(total)}</span>
              </div>
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                All fees included
              </div>
            </div>

            {/* Payment Method Selection */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Payment Method</h3>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button
                  onClick={() => setPaymentMethod('card')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: paymentMethod === 'card' ? '2px solid #007aff' : '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: paymentMethod === 'card' ? '#f0f8ff' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaCreditCard />
                  Credit Card
                </button>
                <button
                  onClick={() => setPaymentMethod('paypal')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: paymentMethod === 'paypal' ? '2px solid #007aff' : '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: paymentMethod === 'paypal' ? '#f0f8ff' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaPaypal />
                  PayPal
                </button>
              </div>

              {/* Card Details Form */}
              {paymentMethod === 'card' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardDetails.cardholderName}
                    onChange={(e) => setCardDetails({...cardDetails, cardholderName: e.target.value})}
                    style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={cardDetails.cardNumber}
                    onChange={(e) => setCardDetails({...cardDetails, cardNumber: e.target.value})}
                    style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardDetails.expiryDate}
                      onChange={(e) => setCardDetails({...cardDetails, expiryDate: e.target.value})}
                      style={{
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                      style={{
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#666'
            }}>
              <FaLock />
              Your payment information is encrypted and secure
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                color: '#dc3545',
                backgroundColor: '#f8d7da',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing || (paymentMethod === 'card' && !cardDetails.cardNumber)}
                style={{
                  flex: 2,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isProcessing ? '#ccc' : '#007aff',
                  color: 'white',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {isProcessing ? 'Processing...' : `Pay ${formatPrice(total)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentModal;
