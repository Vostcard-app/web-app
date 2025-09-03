import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaMapPin, FaArrowLeft, FaMap, FaUserTie, FaWalking } from 'react-icons/fa';
import { GeocodingService } from '../services/geocodingService';
import { GuidedTourService } from '../services/guidedTourService';
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import './BrowseAreaView.css';

const DEBOUNCE_MS = 300;

const BrowseAreaView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'vostcards' | 'guides'>('vostcards');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Real-time location search with debouncing using the existing geocoding service
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        console.log('🔍 Searching for location:', searchQuery);

        const response = await fetch('/.netlify/functions/geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'search',
            searchQuery: searchQuery.trim()
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            console.log('🔍 No results found for:', searchQuery);
            setSearchResults([]);
            setShowDropdown(false);
          } else {
            console.error('🔍 Search error:', data.error);
            setSearchError(data.error || 'Search failed');
          }
          return;
        }

        const results = data.results || [];
        console.log('🔍 Found results:', results.length);
        
        // Format results to match expected structure
        const formattedResults = results.map((result: any) => ({
          name: result.name,
          coordinates: [Number(result.latitude), Number(result.longitude)],
          type: result.type,
          displayAddress: result.displayAddress,
          latitude: Number(result.latitude),
          longitude: Number(result.longitude)
        }));

        setSearchResults(formattedResults);
        setShowDropdown(formattedResults.length > 0);
        setHighlightedIndex(-1);

      } catch (error) {
        console.error('🔍 Search failed:', error);
        setSearchError('Search failed. Please try again.');
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      setHighlightedIndex(i => Math.min(i + 1, searchResults.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex(i => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        handleLocationSelect(searchResults[highlightedIndex]);
        setShowDropdown(false);
      } else {
        handleSearch();
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (searchResults.length > 0) {
      handleLocationSelect(searchResults[0]);
      setShowDropdown(false);
    }
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setShowDropdown(false);
  };

  const handleBrowse = () => {
    if (!selectedLocation) {
      alert('Please search and select a location first');
      return;
    }

    if (activeTab === 'vostcards') {
      console.log('🗺️ Browse Vōstcards button clicked');
      console.log('📍 Selected location:', selectedLocation);
      console.log('📍 Coordinates being sent:', selectedLocation.coordinates);
      console.log('🗺️ Navigating to HomeView with browse location:', selectedLocation.name);
      
      navigate('/home', {
        state: {
          browseLocation: {
            coordinates: selectedLocation.coordinates,
            name: selectedLocation.name,
            id: selectedLocation.id,
            type: selectedLocation.type,
            place: selectedLocation.place,
          },
        },
      });
    } else {
      console.log('🎯 Browse Tour Guides button clicked');
      console.log('📍 Selected location:', selectedLocation);
      console.log('🎯 Navigating to GuidedToursView with location filter');
      
      navigate('/guided-tours', {
        state: {
          searchLocation: {
            coordinates: selectedLocation.coordinates,
            name: selectedLocation.name,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          },
        },
      });
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className="browse-area-container"
      style={{ backgroundColor: 'white', minHeight: '100vh' }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#002B4D',
          height: '30px',
          padding: '15px 0 24px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          color: 'white'
        }}
      >
        <h1 
          onClick={() => navigate('/home')}
          style={{ fontSize: '30px', margin: 0, cursor: 'pointer' }}
        >
          Browse
        </h1>
        <FaHome
          size={40}
          color="white"
          style={{
            position: 'absolute',
            right: 44,
            top: 15,
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* Tabbed Interface */}
      <div className="browse-container">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'vostcards' ? 'active' : ''}`}
            onClick={() => setActiveTab('vostcards')}
          >
            <FaMap className="tab-icon" />
            Browse Vōstcards
          </button>
          <button
            className={`tab-button ${activeTab === 'guides' ? 'active' : ''}`}
            onClick={() => setActiveTab('guides')}
          >
            <FaWalking className="tab-icon" />
            Browse Guides
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-input-container">
              <FaMapPin className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search for any location worldwide...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                className="search-input"
                autoComplete="off"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="search-button"
              >
                {isSearching ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <FaSearch size={16} />
                )}
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="autocomplete-dropdown" ref={resultsRef}>
                  {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className={`autocomplete-item${highlightedIndex === index ? ' highlighted' : ''}`}
                    onMouseDown={() => handleLocationSelect(result)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <FaMapPin className="result-icon" />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>
                        {result.name}
                      </span>
                      {result.displayAddress && result.displayAddress !== result.name ? (
                        <span style={{ color: '#666', fontWeight: 400, fontSize: 13, display: 'block' }}>
                          {result.displayAddress}
                        </span>
                      ) : null}
                    </div>
                    <span style={{ color: '#aaa', fontSize: 12, marginLeft: 8 }}>
                      Location
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error Message */}
            {searchError && (
              <div style={{ color: 'red', margin: '12px 0', textAlign: 'center' }}>{searchError}</div>
            )}
          </div>

          {/* Selected Location Display */}
          {selectedLocation && (
            <div className="selected-location-display">
              <FaMapPin className="selected-icon" />
              <span>Selected: {selectedLocation.name}</span>
            </div>
          )}

          {/* Tab-specific Content */}
          <div className="tab-specific-content">
            {activeTab === 'vostcards' ? (
              <div className="content-section">
                <div className="content-header">
                  <FaMap className="content-icon" />
                  <div className="content-info">
                    <h2>Browse Vōstcards</h2>
                    <p>Discover local experiences, stories, and hidden gems in your selected area</p>
                  </div>
                </div>
                <button 
                  onClick={handleBrowse}
                  className={`browse-action-button vostcards-action ${!selectedLocation ? 'disabled' : ''}`}
                  disabled={!selectedLocation}
                >
                  <FaSearch style={{ marginRight: '8px' }} />
                  {selectedLocation ? `View Vōstcards in ${selectedLocation.name}` : 'Select a location to browse Vōstcards'}
                </button>
              </div>
            ) : (
              <div className="content-section">
                <div className="content-header">
                  <FaWalking className="content-icon" />
                  <div className="content-info">
                    <h2>Browse Guides</h2>
                    <p>Find professional guided tours and local experts in your selected area</p>
                  </div>
                </div>
                <button 
                  onClick={handleBrowse}
                  className={`browse-action-button guides-action ${!selectedLocation ? 'disabled' : ''}`}
                  disabled={!selectedLocation}
                >
                  <FaSearch style={{ marginRight: '8px' }} />
                  {selectedLocation ? `Find Tour Guides in ${selectedLocation.name}` : 'Select a location to browse Tour Guides'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseAreaView; 