const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Replace this with your OpenAI API key (keep it on the server only!)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/generate-script', async (req, res) => {
  try {
    console.log('📝 Received request:', req.body);
    
    const { topic, style } = req.body;
    
    if (!topic || !style) {
      return res.status(400).json({ error: 'Missing topic or style' });
    }
    
    if (!OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    const prompt = `Write a 30-second video script in a "${style}" style about: ${topic}. 
    Make it engaging, conversational, and perfect for a short video. 
    Keep it under 100 words and make it sound natural when spoken.`;

    console.log(' Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    });

    console.log('📡 OpenAI response status:', response.status);
    
    const data = await response.json();
    console.log('📄 OpenAI response data:', data);
    
    if (!response.ok) {
      console.error('❌ OpenAI API error:', data);
      return res.status(response.status).json({ 
        error: `OpenAI API error: ${data.error?.message || 'Unknown error'}`,
        details: data
      });
    }
    
    console.log('✅ Successfully generated script');
    res.json(data);
  } catch (err) {
    console.error('❌ OpenAI proxy error:', err);
    res.status(500).json({ 
      error: 'OpenAI API request failed', 
      details: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;