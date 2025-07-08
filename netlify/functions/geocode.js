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
    const { streetAddress, city, stateProvince, postalCode, country } = JSON.parse(event.body);

    // Validate required fields
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

    console.log('🌍 Geocoding address:', addressParts);

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
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    if (isNaN(latitude) || isNaN(longitude)) {
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

    console.log('✅ Geocoding successful:', { latitude, longitude });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        displayAddress: result.display_name || addressParts
      }),
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