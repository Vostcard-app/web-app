const functions = require('firebase-functions');

// OpenAI API key from Firebase environment
const OPENAI_API_KEY = functions.config().openai?.api_key;

exports.generateScript = functions.https.onRequest((req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, style } = req.body;
    
    if (!topic || !style) {
      return res.status(400).json({ error: 'Missing topic or style' });
    }

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const prompt = `Write a 30-second video script in a "${style}" style about: ${topic}. 
    Make it engaging, conversational, and perfect for a short video. 
    Keep it around 80 words and make it sound natural when spoken.`;

    console.log('Calling OpenAI API...');

    // Use the built-in fetch (available in Node.js 18+)
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes short video scripts.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Successfully generated script');
      res.json(data);
    })
    .catch(error => {
      console.error('OpenAI API error:', error);
      res.status(500).json({ 
        error: 'Script generation failed', 
        details: error.message 
      });
    });

  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ 
      error: 'Script generation failed', 
      details: error.message 
    });
  }
}); 