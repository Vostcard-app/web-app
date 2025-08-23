const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

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

// Server-side avatar URL regeneration function
exports.regenerateAvatarUrls = functions.https.onCall(async (data, context) => {
  // Set CORS headers for callable functions
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Verify admin authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to regenerate avatar URLs');
  }

  // Check if user is admin by checking their user document
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || userData.userRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can regenerate avatar URLs');
  }

  try {
    console.log('🔧 Starting server-side avatar URL regeneration...');
    const storage = admin.storage();
    const bucket = storage.bucket();
    
    let fixed = 0;
    let errors = 0;
    
    // Step 1: Scan avatar storage
    console.log('📁 Step 1: Scanning avatar storage...');
    const [files] = await bucket.getFiles({ prefix: 'avatars/' });
    
    const avatarMap = new Map(); // userId -> avatarURL
    
    // Process avatar files
    for (const file of files) {
      const fileName = file.name.split('/').pop();
      if (fileName && fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        // Handle both userId.jpg and userId/avatar.jpg formats
        let userId;
        if (file.name.includes('/')) {
          const parts = file.name.split('/');
          if (parts.length === 2) {
            userId = parts[1].replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
          } else if (parts.length === 3) {
            userId = parts[1];
          }
        }
        
        if (userId) {
          try {
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: '03-09-2491' // Far future date
            });
            avatarMap.set(userId, url);
            console.log(`📸 Found avatar for user: ${userId}`);
          } catch (e) {
            console.log(`❌ Failed to get URL for ${file.name}: ${e.message}`);
          }
        }
      }
    }
    
    console.log(`📊 Avatar scan complete: Found avatars for ${avatarMap.size} users`);
    
    // Step 2: Update user profiles with avatar URLs
    console.log('💾 Step 2: Updating user profiles...');
    
    const usersSnapshot = await db.collection('users').get();
    console.log(`👥 Found ${usersSnapshot.docs.length} users in database`);
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const currentAvatarURL = userData.avatarURL;
        const foundAvatarURL = avatarMap.get(userId);
        
        console.log(`👤 Checking user: ${userData.username || userData.email || userId}`);
        
        if (foundAvatarURL) {
          if (!currentAvatarURL || currentAvatarURL !== foundAvatarURL) {
            await userDoc.ref.update({
              avatarURL: foundAvatarURL,
              avatarUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            fixed++;
            console.log(`  ✅ Updated avatar URL`);
          } else {
            console.log(`  ℹ️ Avatar URL already correct`);
          }
        } else {
          console.log(`  ⚠️ No avatar found in storage`);
        }
      } catch (error) {
        console.error(`❌ Failed to process user ${userDoc.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Avatar URL regeneration completed!`);
    console.log(`   Fixed: ${fixed} users`);
    console.log(`   Errors: ${errors}`);
    
    return {
      success: true,
      fixed,
      errors,
      message: `Successfully updated avatar URLs for ${fixed} users${errors > 0 ? ` (${errors} errors)` : ''}`
    };
    
  } catch (error) {
    console.error('❌ Avatar URL regeneration failed:', error);
    throw new functions.https.HttpsError('internal', 'Avatar URL regeneration failed', error.message);
  }
});