const isProd = window.location.hostname === "vostcard.com";
const apiUrl = isProd
  ? "/.netlify/functions/generate-script" // Netlify Function for production
  : "http://localhost:8888/.netlify/functions/generate-script"; // Netlify dev for local

export async function generateScript(topic: string, style: string): Promise<string> {
  try {
    console.log('🔄 Calling AI API with:', { topic, style });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, style }),
    });

    console.log(' Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server error:', errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ AI response:', data);
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ Error generating script:', error);
    throw error;
  }
} 