import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaMapPin, FaArrowLeft } from 'react-icons/fa';
import './BrowseAreaView.css';

const BrowseAreaView: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Mock search results - in real implementation, this would use a geocoding service
  const mockSearchResults = [
    { name: 'New York, NY', coordinates: [40.7128, -74.0060], type: 'city' },
    { name: 'Los Angeles, CA', coordinates: [34.0522, -118.2437], type: 'city' },
    { name: 'Chicago, IL', coordinates: [41.8781, -87.6298], type: 'city' },
    { name: 'Houston, TX', coordinates: [29.7604, -95.3698], type: 'city' },
    { name: 'Phoenix, AZ', coordinates: [33.4484, -112.0740], type: 'city' },
    { name: 'Philadelphia, PA', coordinates: [39.9526, -75.1652], type: 'city' },
    { name: 'San Antonio, TX', coordinates: [29.4241, -98.4936], type: 'city' },
    { name: 'San Diego, CA', coordinates: [32.7157, -117.1611], type: 'city' },
    { name: 'Dallas, TX', coordinates: [32.7767, -96.7970], type: 'city' },
    { name: 'San Jose, CA', coordinates: [37.3382, -121.8863], type: 'city' },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Filter mock results based on search query
    const filtered = mockSearchResults.filter(result =>
      result.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchResults(filtered);
    setIsSearching(false);
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
  };

  const handleBrowseArea = () => {
    if (selectedLocation) {
      // Navigate to HomeView with the selected location coordinates
      navigate('/home', { 
        state: { 
          browseLocation: {
            coordinates: selectedLocation.coordinates,
            name: selectedLocation.name
          }
        } 
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
        <button 
          className="back-button"
          onClick={() => navigate('/home')}
        >
          <FaArrowLeft size={20} />
        </button>
        <h1>Browse Area</h1>
        <button 
          className="home-button"
          onClick={() => navigate('/home')}
        >
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
            <button 
              onClick={handleBrowseArea}
              className="browse-button"
            >
              Browse Area
            </button>
          </div>
        )}

        {/* Popular Cities */}
        {!searchQuery && searchResults.length === 0 && (
          <div className="popular-cities">
            <h3>Popular Cities</h3>
            <div className="cities-grid">
              {mockSearchResults.slice(0, 6).map((city, index) => (
                <div
                  key={index}
                  className="city-card"
                  onClick={() => {
                    setSearchQuery(city.name);
                    setSelectedLocation(city);
                  }}
                >
                  <FaMapPin className="city-icon" />
                  <span>{city.name.split(',')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseAreaView; 