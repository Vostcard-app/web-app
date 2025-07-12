const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// Enable CORS for all origins
app.use(cors({
  origin: ['https://vostcard.com', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

app.post('/generate-script', async (req, res) => {
  try {
    const { topic, style } = req.body;
    
    if (!topic || !style) {
      return res.status(400).json({ error: 'Missing topic or style' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const prompt = `Write a 30-second video script in a "${style}" style about: ${topic}. 
    Make it engaging, conversational, and perfect for a short video. 
    Keep it around 80 words and make it sound natural when spoken.`;

    console.log('Calling OpenAI API...');

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

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(response.status).json({ 
        error: `OpenAI API error: ${data.error?.message || 'Unknown error'}`,
        details: data
      });
    }

    console.log('Successfully generated script');
    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Script generation failed', 
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 