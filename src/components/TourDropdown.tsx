import React, { useState, useRef, useEffect } from 'react';
import { FaMapPin, FaChevronDown, FaChevronUp, FaEye, FaEyeSlash } from 'react-icons/fa';
import type { Tour } from '../types/TourTypes';

interface TourDropdownProps {
  tours: Tour[];
  onTourSelect: (tour: Tour) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  userRole?: string;
}

const TourDropdown: React.FC<TourDropdownProps> = ({
  tours,
  onTourSelect,
  placeholder = "Select a tour...",
  disabled = false,
  style = {},
  userRole,
}) => {
  const getTourTerminology = () => {
    return userRole === 'guide' ? 'Tour' : 'Trip';
  };
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTourSelect = (tour: Tour) => {
    setSelectedTour(tour);
    setIsOpen(false);
    onTourSelect(tour);
  };

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }}>
      {/* Dropdown Button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: disabled ? '#f5f5f5' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          color: disabled ? '#999' : '#333',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = '#007aff';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = '#ddd';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaMapPin style={{ color: '#007aff', fontSize: '16px' }} />
          <span>
            {selectedTour ? selectedTour.name : placeholder}
          </span>
          {selectedTour && !selectedTour.isPublic && (
            <FaEyeSlash style={{ color: '#666', fontSize: '12px' }} title="Private tour" />
          )}
        </div>
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '4px',
          }}
        >
          {tours.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              textAlign: 'center', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              No {getTourTerminology().toLowerCase()}s available
            </div>
          ) : (
            tours.map((tour) => (
              <div
                key={tour.id}
                onClick={() => handleTourSelect(tour)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FaMapPin style={{ color: '#007aff', fontSize: '14px' }} />
                  <span style={{ fontWeight: '500', fontSize: '14px' }}>
                    {tour.name}
                  </span>
                  {!tour.isPublic && (
                    <FaEyeSlash style={{ color: '#666', fontSize: '10px' }} title="Private tour" />
                  )}
                </div>
                
                {tour.description && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginBottom: '4px',
                    lineHeight: '1.3'
                  }}>
                    {tour.description.length > 60 
                      ? `${tour.description.substring(0, 60)}...` 
                      : tour.description}
                  </div>
                )}
                
                <div style={{ 
                  fontSize: '11px', 
                  color: '#999',
                  display: 'flex',
                  gap: '12px'
                }}>
                  <span>{tour.postIds.length} {tour.postIds.length === 1 ? 'post' : 'posts'}</span>
                  <span>{tour.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TourDropdown; 