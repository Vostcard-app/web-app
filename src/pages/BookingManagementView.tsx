import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GuidedTourService } from '../services/guidedTourService';
import { TourBooking, BookingStatus } from '../types/GuidedTourTypes';
import { FaCalendar, FaUser, FaClock, FaMapMarkerAlt, FaCheck, FaTimes, FaEye, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const BookingManagementView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const guideBookings = await GuidedTourService.getGuideBookings(user.uid);
      setBookings(guideBookings);
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'cancel') => {
    try {
      // TODO: Implement booking confirmation/cancellation
      console.log(`${action} booking:`, bookingId);
      
      // Update local state optimistically
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: action === 'confirm' ? 'confirmed' : 'cancelled-by-guide' }
          : booking
      ));
    } catch (error) {
      console.error(`❌ Error ${action}ing booking:`, error);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'confirmed': return '#28a745';
      case 'paid': return '#17a2b8';
      case 'in-progress': return '#6f42c1';
      case 'completed': return '#20c997';
      case 'cancelled-by-user':
      case 'cancelled-by-guide': return '#dc3545';
      case 'no-show': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filter);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <p>Loading bookings...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #eee'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#007aff',
              marginRight: '12px'
            }}
          >
            <FaArrowLeft />
          </button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            Booking Management
          </h1>
        </div>
        
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'confirmed', 'paid', 'in-progress', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: filter === status ? '#007aff' : '#e9ecef',
                color: filter === status ? 'white' : '#495057',
                cursor: 'pointer',
                fontSize: '14px',
                textTransform: 'capitalize'
              }}
            >
              {status === 'all' ? 'All' : status.replace('-', ' ')}
              {status !== 'all' && (
                <span style={{ marginLeft: '4px' }}>
                  ({bookings.filter(b => b.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div style={{ padding: '20px' }}>
        {filteredBookings.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#666', fontSize: '16px' }}>
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredBookings.map(booking => (
              <div
                key={booking.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid #eee'
                }}
              >
                {/* Booking Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: getStatusColor(booking.status),
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      {booking.status.replace('-', ' ')}
                    </div>
                    <h3 style={{ margin: '0', fontSize: '18px' }}>
                      Booking #{booking.id.slice(-8)}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {formatPrice(booking.paymentInfo.total)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Created {new Date(booking.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCalendar style={{ color: '#666' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {booking.bookingDetails.date}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {booking.bookingDetails.startTime}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaClock style={{ color: '#666' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {booking.bookingDetails.duration} hours
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Duration</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaUser style={{ color: '#666' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {booking.participants.length} participants
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {booking.participants.filter(p => p.type === 'adult').length} adults, {' '}
                        {booking.participants.filter(p => p.type === 'child').length} children
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaMapMarkerAlt style={{ color: '#666' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {booking.bookingDetails.meetingPoint?.name || 'TBD'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Meeting point</div>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {booking.bookingDetails.specialRequests && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Special Requests:
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {booking.bookingDetails.specialRequests}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {booking.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleBookingAction(booking.id, 'confirm')}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <FaCheck />
                      Confirm Booking
                    </button>
                    <button
                      onClick={() => handleBookingAction(booking.id, 'cancel')}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #dc3545',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        color: '#dc3545',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <FaTimes />
                      Decline
                    </button>
                  </div>
                )}

                {(booking.status === 'confirmed' || booking.status === 'paid') && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #007aff',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        color: '#007aff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <FaEye />
                      View Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingManagementView;
