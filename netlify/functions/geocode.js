// ✅ Netlify Function: Geocode Address

// Helper: Fetch with retry
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      console.warn(`Attempt ${i + 1} failed: ${res.status}`);
    } catch (err) {
      console.warn(`Attempt ${i + 1} error: ${err.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('All retries failed');
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const requestBody = JSON.parse(event.body);
    const { type, streetAddress, city, stateProvince, postalCode, country, latitude, longitude } = requestBody;

    // Handle forward geocoding (address to coordinates)
    if (type === 'forward' || !type) {
      if (!streetAddress || !city || !stateProvince || !country) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required address fields' }) };
      }

      const addressParts = [streetAddress, city, stateProvince, postalCode, country]
        .filter(part => part && part.trim())
        .join(', ');

      const params = new URLSearchParams({
        q: addressParts,
        format: 'json',
        limit: '1',
        addressdetails: '1'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        return { statusCode: response.status, headers, body: JSON.stringify({ error: `Geocoding API error: ${response.status}` }) };
      }

      if (!data || data.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'No results found for this address' }) };
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      if (isNaN(lat) || isNaN(lng)) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Invalid coordinates received from geocoding service' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          displayAddress: result.display_name || addressParts
        })
      };
    }

    // Handle reverse geocoding (coordinates to address)
    if (type === 'reverse') {
      if (!latitude || !longitude) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing latitude or longitude' }) };
      }

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1'
      });

      const response = await fetchWithRetry(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        {
          headers: {
            'User-Agent': 'VostcardWebApp/1.0 (https://vostcard.com)',
            'Accept-Language': 'en'
          }
        }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(`Reverse geocoding API error: ${response.status} - ${response.statusText}`);
        return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Reverse geocoding failed' }) };
      }

      if (!data || !data.address) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'No address found for these coordinates' }) };
      }

      const address = data.address;
      const houseNumber = address.house_number || '';
      const road = address.road || '';
      const fullStreetAddress = `${houseNumber} ${road}`.trim();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          streetAddress: fullStreetAddress || address.amenity || '',
          city: address.city || address.town || address.village || '',
          stateProvince: address.state || address.county || '',
          postalCode: address.postcode || '',
          country: address.country || '',
          displayAddress: data.display_name || ''
        })
      };
    }

    // Invalid type
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid geocoding type. Use "forward" or "reverse"' }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Geocoding failed', details: error.message }) };
  }
};