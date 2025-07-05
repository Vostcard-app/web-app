const express = require('express');
const cors = require('cors');
const openaiProxy = require('./openaiProxy');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-netlify-domain.netlify.app'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', openaiProxy);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'OpenAI Proxy Server Running' });
});

app.listen(PORT, () => {
  console.log(`🚀 OpenAI Proxy Server running on port ${PORT}`);
  console.log(`🔑 OpenAI API Key configured: ${OPENAI_API_KEY ? 'Yes' : 'No'}`);
}); 