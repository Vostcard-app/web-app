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
        // 1. Geocode for city/zip/place
        let geoResults: any[] = [];
        try {
          const geo = await GeocodingService.geocodeAddressWithFallback('', searchQuery, '', searchQuery, '');
          geoResults = [{
            name: geo.displayAddress || searchQuery,
            coordinates: [geo.latitude, geo.longitude],
            type: 'location',
          }];
        } catch (e) {
          // Ignore geocoding errors for now
        }
        // 2. Firestore search for Vostcard titles/places
        let vostcardResults: any[] = [];
        try {
          const vostcardsCol = collection(db, 'vostcards');
          const snapshot = await getDocs(vostcardsCol);
          vostcardResults = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (
              (data.title && data.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (data.place && data.place.toLowerCase().includes(searchQuery.toLowerCase()))
            ) {
              vostcardResults.push({
                name: data.title,
                coordinates: data.coordinates || null,
                type: 'vostcard',
                id: docSnap.id,
                place: data.place || '',
              });
            }
          });
        } catch (e) {
          // Ignore Firestore errors for now
        }
        // Merge and show
        const merged = [...geoResults, ...vostcardResults];
        setSearchResults(merged);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch (error: any) {
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
    <div className="browse-area-container">
      {/* Header */}
      <div className="browse-area-header">
        <button className="back-button" onClick={() => navigate('/home')}>
          <FaArrowLeft size={20} />
        </button>
        <h1>Browse Area</h1>
        <button className="home-button" onClick={() => navigate('/home')}>
          <FaHome size={20} />
        </button>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-container">
          <FaMapPin className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter city, zip code, Vōstcard title, or location..."
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
                <span style={{ fontWeight: result.type === 'vostcard' ? 700 : 400 }}>
                  {result.name}
                  {result.type === 'vostcard' && result.place ? (
                    <span style={{ color: '#888', fontWeight: 400, fontSize: 13 }}> — {result.place}</span>
                  ) : null}
                </span>
                <span style={{ color: '#aaa', fontSize: 12, marginLeft: 8 }}>{result.type}</span>
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
              <span>Browse Vōstcards in {selectedLocation.name}</span>
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