export async function generateScript(topic, style) {
  try {
    const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ topic, style }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating script:', error);
    throw error;
  }
} 