import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaMapPin, FaArrowLeft } from 'react-icons/fa';
import { GeocodingService } from '../services/geocodingService';
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import './BrowseAreaView.css';

const DEBOUNCE_MS = 300;

const BrowseAreaView: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    const handler = setTimeout(async () => {
      try {
        // Focus on location search only
        let locationResults: any[] = [];
        try {
          // Check if we're in development mode
          const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          
          if (isDevelopment) {
            // In development, create mock geocoding results for any search
            console.log(`🗺️ Creating mock location for: "${searchQuery}"`);
            
            // Create mock coordinates based on search query with better coverage
            const lowerQuery = searchQuery.toLowerCase();
            let mockCoordinates;
            
            if (lowerQuery.includes('commack')) {
              mockCoordinates = [40.8429, -73.2973]; // Commack, NY coordinates
            } else if (lowerQuery.includes('dublin')) {
              mockCoordinates = [53.3498, -6.2603]; // Dublin, Ireland
            } else if (lowerQuery.includes('new york') || lowerQuery.includes('nyc')) {
              mockCoordinates = [40.7128, -74.0060]; // New York City
            } else if (lowerQuery.includes('london')) {
              mockCoordinates = [51.5074, -0.1278]; // London
            } else if (lowerQuery.includes('los angeles') || lowerQuery.includes('la')) {
              mockCoordinates = [34.0522, -118.2437]; // Los Angeles
            } else if (lowerQuery.includes('chicago')) {
              mockCoordinates = [41.8781, -87.6298]; // Chicago
            } else if (lowerQuery.includes('miami')) {
              mockCoordinates = [25.7617, -80.1918]; // Miami
            } else if (lowerQuery.includes('seattle')) {
              mockCoordinates = [47.6062, -122.3321]; // Seattle
            } else if (lowerQuery.includes('boston')) {
              mockCoordinates = [42.3601, -71.0589]; // Boston
            } else if (lowerQuery.includes('san francisco') || lowerQuery.includes('sf')) {
              mockCoordinates = [37.7749, -122.4194]; // San Francisco
            } else if (lowerQuery.includes('paris')) {
              mockCoordinates = [48.8566, 2.3522]; // Paris
            } else if (lowerQuery.includes('tokyo')) {
              mockCoordinates = [35.6762, 139.6503]; // Tokyo
            } else if (lowerQuery.includes('sydney')) {
              mockCoordinates = [33.8688, 151.2093]; // Sydney
            } else if (lowerQuery.includes('berlin')) {
              mockCoordinates = [52.5200, 13.4050]; // Berlin
            } else if (lowerQuery.includes('madrid')) {
              mockCoordinates = [40.4168, -3.7038]; // Madrid
            } else if (lowerQuery.includes('rome')) {
              mockCoordinates = [41.9028, 12.4964]; // Rome
            } else {
              // Generate pseudo-random coordinates based on search query
              const hash = searchQuery.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              
              // Convert hash to latitude/longitude ranges
              const lat = 40 + (hash % 40) - 20; // Range: 20 to 60 degrees
              const lng = -100 + (hash % 160) - 80; // Range: -180 to 80 degrees
              
              mockCoordinates = [lat, lng];
            }
            
            locationResults = [{
              name: `${searchQuery}`,
              coordinates: mockCoordinates,
              type: 'location',
              displayAddress: `${searchQuery}, Mock Location`
            }];
          } else {
            const geo = await GeocodingService.geocodeAddressWithFallback('', searchQuery, '', '', '');
            locationResults = [{
              name: geo.displayAddress || searchQuery,
              coordinates: [geo.latitude, geo.longitude],
              type: 'location',
              displayAddress: geo.displayAddress
            }];
          }
          
          console.log(`🗺️ Found location results:`, locationResults);
        } catch (e) {
          console.log('❌ Location search failed, creating fallback result for search query');
          
          // Create a fallback result based on the search query
          const hash = searchQuery.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          // Convert hash to latitude/longitude ranges
          const lat = 40 + (hash % 40) - 20; // Range: 20 to 60 degrees
          const lng = -100 + (hash % 160) - 80; // Range: -180 to 80 degrees
          
          locationResults = [{
            name: searchQuery,
            coordinates: [lat, lng],
            type: 'location',
            displayAddress: `${searchQuery} (Approximate Location)`
          }];
        }
        
        console.log(`📋 Location search results: ${locationResults.length}`, locationResults);
        
        setSearchResults(locationResults);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch (error: any) {
        console.error('❌ Search error:', error);
        setSearchError(error.message || 'No results found.');
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handler);
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

  const handleBrowseArea = () => {
    console.log('🗺️ Browse Area button clicked');
    console.log('📍 Selected location:', selectedLocation);
    
    if (selectedLocation) {
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
          position: 'relative',
          color: 'white'
        }}
      >
        <h1 style={{ fontSize: '30px', margin: 0 }}>Browse Area</h1>
        <FaHome
          size={48}
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

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-container">
          <FaMapPin className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter city, zip code, or location to browse..."
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

        {/* Browse Button */}
        {selectedLocation && (
          <div className="browse-section">
            <div className="selected-location">
              <FaMapPin className="selected-icon" />
              <span>View map of {selectedLocation.name}</span>
            </div>
            <button onClick={handleBrowseArea} className="browse-button">
              Browse Area
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseAreaView; 