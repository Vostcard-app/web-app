import React, { useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';

interface EditTripNameModalProps {
  trip: Trip;
  onClose: () => void;
  onUpdate: (updatedTrip: Trip) => void;
}

export default function EditTripNameModal({ trip, onClose, onUpdate }: EditTripNameModalProps) {
  const [newName, setNewName] = useState(trip.name);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async () => {
    if (!newName.trim()) {
      alert('Please enter a trip name');
      return;
    }

    try {
      setIsUpdating(true);
      const updatedTrip = await TripService.updateTrip(trip.id, {
        name: newName.trim()
      });
      onUpdate(updatedTrip);
      onClose();
    } catch (error) {
      console.error('Error updating trip name:', error);
      alert('Failed to update trip name. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <FaPencilAlt style={{ marginRight: '8px', color: '#002B4D' }} />
          <h3 style={{ margin: 0, fontSize: '20px' }}>Edit Trip Name</h3>
        </div>

        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Enter trip name"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '16px',
            marginBottom: '20px',
            boxSizing: 'border-box'
          }}
          autoFocus
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={!newName.trim() || isUpdating}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: newName.trim() && !isUpdating ? '#002B4D' : '#cccccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: newName.trim() && !isUpdating ? 'pointer' : 'not-allowed',
            }}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
