const express = require('express');
const cors = require('cors');
require('dotenv').config();
const functions = require('firebase-functions');

const app = express();
const PORT = process.env.PORT || 3002;
const OPENAI_API_KEY = functions.config().openai?.api_key;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Simple test route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server Running' });
});

// Simple test API route
app.post('/api/generate-script', (req, res) => {
  try {
    console.log('📝 Received request:', req.body);
    
    if (!OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // For now, just return a test response
    const response = { 
      choices: [{ 
        message: { 
          content: `This is a test script about ${req.body.topic} in ${req.body.style} style.` 
        } 
      }] 
    };
    
    console.log('📤 Sending response:', response);
    res.status(200).json(response);  // Explicitly set status to 200
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ Error in generate-script:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔑 OpenAI API Key configured: ${OPENAI_API_KEY ? 'Yes' : 'No'}`);
}); 

// Test the API directly
fetch('http://localhost:3002/api/generate-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ topic: 'test', style: 'Bullet Points' })
})
.then(res => {
  console.log('Status:', res.status);
  return res.text();
})
.then(data => console.log('Direct response:', data))
.catch(err => console.error('Error:', err));