// ✅ Netlify Function: Geocode Address

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    const { type, streetAddress, city, stateProvince, postalCode, country, latitude, longitude } = requestBody;

    // Handle forward geocoding (address to coordinates)
    if (type === 'forward' || !type) {
      // Validate required fields for forward geocoding
      if (!streetAddress || !city || !stateProvince || !country) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
          },
          body: JSON.stringify({ error: 'Missing required address fields' }),
        };
      }

      // Build the query string
      const addressParts = [streetAddress, city, stateProvince, postalCode, country]
        .filter(part => part && part.trim())
        .join(', ');

      console.log('🌍 Forward geocoding address:', addressParts);

      const params = new URLSearchParams({
        q: addressParts,
        format: 'json',
        limit: '1',
        addressdetails: '1'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Nominatim API error:', response.status);
        return {
          statusCode: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
          },
          body: JSON.stringify({ error: `Geocoding API error: ${response.status}` }),
        };
      }

      if (!data || data.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
          },
          body: JSON.stringify({ error: 'No results found for this address' }),
        };
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      if (isNaN(lat) || isNaN(lng)) {
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
          },
          body: JSON.stringify({ error: 'Invalid coordinates received from geocoding service' }),
        };
      }

      console.log('✅ Forward geocoding successful:', { lat, lng });

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          displayAddress: result.display_name || addressParts
        }),
      };
    }

    // Handle reverse geocoding (coordinates to address)
    if (type === 'reverse') {
      // Validate required fields for reverse geocoding
      if (!latitude || !longitude) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
          },
          body: JSON.stringify({ error: 'Missing latitude or longitude' }),
        };
      }

      console.log('🔄 Reverse geocoding coordinates:', { latitude, longitude });

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Nominatim reverse API error:', response.status);
        return {
          statusCode: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
          },
          body: JSON.stringify({ error: `Reverse geocoding API error: ${response.status}` }),
        };
      }

      if (!data || !data.address) {
        return {
          statusCode: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
          },
          body: JSON.stringify({ error: 'No address found for these coordinates' }),
        };
      }

      const address = data.address;
      
      // Parse and structure the address components
      const houseNumber = address.house_number || '';
      const road = address.road || '';
      const fullStreetAddress = `${houseNumber} ${road}`.trim();

      console.log('✅ Reverse geocoding successful:', address);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST',
        },
        body: JSON.stringify({
          streetAddress: fullStreetAddress || address.amenity || '',
          city: address.city || address.town || address.village || '',
          stateProvince: address.state || address.county || '',
          postalCode: address.postcode || '',
          country: address.country || '',
          displayAddress: data.display_name || ''
        }),
      };
    }

    // Invalid type
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({ error: 'Invalid geocoding type. Use "forward" or "reverse"' }),
    };

  } catch (error) {
    console.error('❌ Geocoding failed:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({ 
        error: 'Geocoding failed', 
        details: error.message 
      }),
    };
  }
}; 