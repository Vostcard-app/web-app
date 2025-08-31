import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaTimes, FaUser, FaChild, FaClock } from 'react-icons/fa';

interface TourBookingCalendarProps {
  isVisible: boolean;
  onClose: () => void;
  tourId: string;
  guideName: string;
  guideAvatar?: string;
  onBookingSubmit: (bookingData: BookingData) => void;
}

interface BookingData {
  tourId: string;
  selectedDate: Date;
  startTime: string;
  duration: number;
  adults: number;
  children: number;
  personalMessage: string;
}

const TourBookingCalendar: React.FC<TourBookingCalendarProps> = ({
  isVisible,
  onClose,
  tourId,
  guideName,
  guideAvatar,
  onBookingSubmit
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [startTime, setStartTime] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [period, setPeriod] = useState('AM');
  const [duration, setDuration] = useState(3);
  const [personalMessage, setPersonalMessage] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isVisible) {
      setSelectedDate(null);
      setAdults(1);
      setChildren(0);
      setStartTime('09');
      setStartMinute('00');
      setPeriod('AM');
      setDuration(3);
      setPersonalMessage('');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // Calendar generation logic
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selected >= today) {
      setSelectedDate(selected);
    }
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === currentMonth.getMonth() &&
           selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  const isDatePast = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleSubmit = () => {
    if (!selectedDate) return;

    const bookingData: BookingData = {
      tourId,
      selectedDate,
      startTime: `${startTime}:${startMinute} ${period}`,
      duration,
      adults,
      children,
      personalMessage
    };

    onBookingSubmit(bookingData);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #f0f0f0',
            position: 'relative'
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                fontSize: '18px'
              }}
            >
              <FaTimes />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {guideAvatar && (
                <img
                  src={guideAvatar}
                  alt={guideName}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                  Hello, I am {guideName}!
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                  Thanks for getting in touch.<br />
                  Let's personalize your experience!
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '20px' }}>
            {/* Personal Message */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                What makes a perfect tour for you? Include who's joining and your top preferences!
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="E.g., We love food tours with local specialties, street food stops, and unique dining experiences."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Group Size */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                What is your group size
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Adults */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaUser style={{ color: '#666', fontSize: '16px' }} />
                    <span style={{ fontSize: '14px', color: '#333' }}>Adults</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#333'
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: '500', minWidth: '20px', textAlign: 'center' }}>
                      {adults}
                    </span>
                    <button
                      onClick={() => setAdults(adults + 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#333'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaChild style={{ color: '#666', fontSize: '16px' }} />
                    <span style={{ fontSize: '14px', color: '#333' }}>Children</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#333'
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: '500', minWidth: '20px', textAlign: 'center' }}>
                      {children}
                    </span>
                    <button
                      onClick={() => setChildren(children + 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#333'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                Choose your preferred date and time
              </label>

              {/* Calendar Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <button
                  onClick={handlePreviousMonth}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '16px',
                    padding: '4px'
                  }}
                >
                  <FaChevronLeft />
                </button>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={handleNextMonth}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '16px',
                    padding: '4px'
                  }}
                >
                  <FaChevronRight />
                </button>
              </div>

              {/* Calendar Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px',
                marginBottom: '16px'
              }}>
                {/* Day Headers */}
                {dayNames.map(day => (
                  <div
                    key={day}
                    style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#666'
                    }}
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {generateCalendarDays().map((day, index) => (
                  <div
                    key={index}
                    onClick={() => day && !isDatePast(day) && handleDateSelect(day)}
                    style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontSize: '14px',
                      cursor: day && !isDatePast(day) ? 'pointer' : 'default',
                      backgroundColor: day && isDateSelected(day) ? '#e91e63' : 'transparent',
                      color: day && isDateSelected(day) ? 'white' : 
                             day && isDatePast(day) ? '#ccc' : '#333',
                      borderRadius: '4px',
                      minHeight: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Start time
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i + 1;
                    return (
                      <option key={hour} value={hour.toString().padStart(2, '0')}>
                        {hour.toString().padStart(2, '0')}
                      </option>
                    );
                  })}
                </select>
                <span>:</span>
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </select>
                <button
                  onClick={() => setPeriod(period === 'AM' ? 'PM' : 'AM')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: period === 'AM' ? '#e91e63' : 'white',
                    color: period === 'AM' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {period}
                </button>
                <button
                  onClick={() => setPeriod(period === 'PM' ? 'AM' : 'PM')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: period === 'PM' ? '#e91e63' : 'white',
                    color: period === 'PM' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {period === 'AM' ? 'PM' : 'AM'}
                </button>
              </div>
            </div>

            {/* Duration */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#333',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Duration
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaClock style={{ color: '#666', fontSize: '14px' }} />
                <span style={{ fontSize: '16px', fontWeight: '500' }}>
                  {duration} hour{duration !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedDate}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: selectedDate ? '#e91e63' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: selectedDate ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s ease'
              }}
            >
              Send your personalization request
            </button>

            {/* Safety Notice */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#856404'
            }}>
              <strong>⚠️ For your safety, always communicate and transfer money via the Vostcard website or app.</strong>
              <div style={{ marginTop: '4px' }}>
                <a href="#" style={{ color: '#e91e63', textDecoration: 'none' }}>
                  Learn more
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TourBookingCalendar;
