export async function generateScript(topic, style) {
  try {
    console.log('🔄 Calling AI API with:', { topic, style });
    
    const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ topic, style }),
    });

    console.log(' Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Server error:', errorData);
      throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
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