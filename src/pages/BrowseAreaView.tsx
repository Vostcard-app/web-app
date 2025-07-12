import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaMapPin, FaArrowLeft } from 'react-icons/fa';
import { GeocodingService } from '../services/geocodingService';
import './BrowseAreaView.css';

const BrowseAreaView: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Real search using GeocodingService
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedLocation(null);
    try {
      // Try to geocode as city, state, or postal code (country left blank for now)
      const result = await GeocodingService.geocodeAddressWithFallback('', searchQuery, '', searchQuery, '');
      setSearchResults([
        {
          name: result.displayAddress || searchQuery,
          coordinates: [result.latitude, result.longitude],
          type: 'location',
        },
      ]);
    } catch (error: any) {
      setSearchError(error.message || 'No results found.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
  };

  const handleBrowseArea = () => {
    if (selectedLocation) {
      navigate('/home', {
        state: {
          browseLocation: {
            coordinates: selectedLocation.coordinates,
            name: selectedLocation.name,
          },
        },
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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
            type="text"
            placeholder="Enter city, zip code, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
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

        {/* Error Message */}
        {searchError && (
          <div style={{ color: 'red', margin: '12px 0', textAlign: 'center' }}>{searchError}</div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>Search Results</h3>
            <div className="results-list">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className={`result-item ${selectedLocation?.name === result.name ? 'selected' : ''}`}
                  onClick={() => handleLocationSelect(result)}
                >
                  <FaMapPin className="result-icon" />
                  <div className="result-details">
                    <div className="result-name">{result.name}</div>
                    <div className="result-type">{result.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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