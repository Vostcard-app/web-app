import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash, FaClock, FaCalendarAlt, FaSave, FaCheck } from 'react-icons/fa';
import { GuideAvailability, DayAvailability, TimeSlot } from '../types/GuidedTourTypes';
import { useAuth } from '../context/AuthContext';

interface GuideAvailabilityManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (availability: GuideAvailability) => Promise<void>;
  initialAvailability?: GuideAvailability;
}

const GuideAvailabilityManager: React.FC<GuideAvailabilityManagerProps> = ({
  isVisible,
  onClose,
  onSave,
  initialAvailability
}) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions'>('weekly');
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const [availability, setAvailability] = useState<GuideAvailability>(() => {
    if (initialAvailability) {
      return initialAvailability;
    }
    
    // Default availability - all days available 9 AM to 5 PM
    const defaultSchedule: DayAvailability[] = dayNames.map((_, index) => ({
      dayOfWeek: index,
      isAvailable: index >= 1 && index <= 5, // Monday to Friday by default
      timeSlots: [
        {
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true
        }
      ]
    }));

    return {
      guideId: user?.uid || '',
      weeklySchedule: defaultSchedule,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      blackoutDates: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  const [blackoutDate, setBlackoutDate] = useState('');

  if (!isVisible) return null;

  const updateDayAvailability = (dayIndex: number, isAvailable: boolean) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(day =>
        day.dayOfWeek === dayIndex ? { ...day, isAvailable } : day
      )
    }));
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: string | boolean) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(day =>
        day.dayOfWeek === dayIndex
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot, index) =>
                index === slotIndex ? { ...slot, [field]: value } : slot
              )
            }
          : day
      )
    }));
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSlot: TimeSlot = {
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true
    };

    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(day =>
        day.dayOfWeek === dayIndex
          ? { ...day, timeSlots: [...day.timeSlots, newSlot] }
          : day
      )
    }));
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(day =>
        day.dayOfWeek === dayIndex
          ? { ...day, timeSlots: day.timeSlots.filter((_, index) => index !== slotIndex) }
          : day
      )
    }));
  };

  const addBlackoutDate = () => {
    if (!blackoutDate) return;
    
    setAvailability(prev => ({
      ...prev,
      blackoutDates: [...prev.blackoutDates, blackoutDate]
    }));
    setBlackoutDate('');
  };

  const removeBlackoutDate = (dateToRemove: string) => {
    setAvailability(prev => ({
      ...prev,
      blackoutDates: prev.blackoutDates.filter(date => date !== dateToRemove)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(availability);
      onClose();
    } catch (error) {
      console.error('❌ Error saving availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Manage Availability
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                Set your available days and times for guided tours
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '8px'
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f8f9fa'
          }}>
            <button
              onClick={() => setActiveTab('weekly')}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                backgroundColor: activeTab === 'weekly' ? 'white' : 'transparent',
                borderBottom: activeTab === 'weekly' ? '2px solid #134369' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: activeTab === 'weekly' ? '600' : '400',
                color: activeTab === 'weekly' ? '#134369' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaClock size={16} />
              Weekly Schedule
            </button>
            
            <button
              onClick={() => setActiveTab('exceptions')}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                backgroundColor: activeTab === 'exceptions' ? 'white' : 'transparent',
                borderBottom: activeTab === 'exceptions' ? '2px solid #134369' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: activeTab === 'exceptions' ? '600' : '400',
                color: activeTab === 'exceptions' ? '#134369' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaCalendarAlt size={16} />
              Blackout Dates
            </button>
          </div>

          {/* Content */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '24px' 
          }}>
            {activeTab === 'weekly' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                  Weekly Availability
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {availability.weeklySchedule.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      style={{
                        padding: '20px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '12px',
                        backgroundColor: day.isAvailable ? '#f8fff8' : '#f8f8f8'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <input
                          type="checkbox"
                          checked={day.isAvailable}
                          onChange={(e) => updateDayAvailability(dayIndex, e.target.checked)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                          {dayNames[dayIndex]}
                        </h4>
                      </div>

                      {day.isAvailable && (
                        <div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {day.timeSlots.map((slot, slotIndex) => (
                              <div
                                key={slotIndex}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '12px',
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  border: '1px solid #e0e0e0'
                                }}
                              >
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'startTime', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                                <span style={{ color: '#666' }}>to</span>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'endTime', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                                
                                {day.timeSlots.length > 1 && (
                                  <button
                                    onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#dc3545',
                                      padding: '8px'
                                    }}
                                  >
                                    <FaTrash size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <button
                            onClick={() => addTimeSlot(dayIndex)}
                            style={{
                              marginTop: '12px',
                              padding: '8px 12px',
                              backgroundColor: '#134369',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <FaPlus size={12} />
                            Add Time Slot
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'exceptions' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                  Blackout Dates
                </h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                  Add dates when you're not available for tours (holidays, personal time, etc.)
                </p>
                
                {/* Add Blackout Date */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <input
                    type="date"
                    value={blackoutDate}
                    onChange={(e) => setBlackoutDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={addBlackoutDate}
                    disabled={!blackoutDate}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: blackoutDate ? '#134369' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: blackoutDate ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaPlus size={12} />
                    Add Date
                  </button>
                </div>

                {/* Blackout Dates List */}
                <div>
                  {availability.blackoutDates.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
                      No blackout dates set. You're available on all days according to your weekly schedule.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {availability.blackoutDates.map((date, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffeaa7',
                            borderRadius: '8px'
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>
                            {formatDate(date)}
                          </span>
                          <button
                            onClick={() => removeBlackoutDate(date)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#dc3545',
                              padding: '4px'
                            }}
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '24px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#134369',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: saving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaSave size={14} />
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuideAvailabilityManager;
