import React, { useState } from 'react';
import { FaMagic, FaSave, FaTimes } from 'react-icons/fa';
import './AIScriptTool.css';

interface AIScriptToolProps {
  onSave: (script: string) => void;
  onClose?: () => void;
  initialPrompt?: string;
}

export default function AIScriptTool({ onSave, onClose, initialPrompt = "" }: AIScriptToolProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedScript, setGeneratedScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateScript = async () => {
    if (!prompt.trim()) {
      setError("Please enter a description of your scene.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // For now, we'll use a mock AI response
      // In production, this would call your actual AI API
      const mockResponse = await mockAIGenerateScript(prompt);
      setGeneratedScript(mockResponse);
    } catch (error) {
      console.error("Error generating script:", error);
      setError("Failed to generate script. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedScript.trim()) {
      onSave(generatedScript);
      if (onClose) onClose();
    }
  };

  const handleClear = () => {
    setPrompt("");
    setGeneratedScript("");
    setError("");
  };

  return (
    <div className="ai-script-tool-overlay">
      <div className="ai-script-tool">
        <div className="ai-script-header">
          <h2>
            <FaMagic /> AI Script Tool
          </h2>
          {onClose && (
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          )}
        </div>

        <div className="ai-script-content">
          <div className="prompt-section">
            <label htmlFor="prompt">Describe your Vōstcard scene:</label>
            <textarea
              id="prompt"
              placeholder="e.g., 'A cozy coffee shop in Dublin with vintage decor, serving artisanal coffee and pastries. The atmosphere is warm and inviting with soft jazz playing in the background.'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <div className="prompt-examples">
              <p><strong>Examples:</strong></p>
              <ul>
                <li>"Historic castle with stunning views of the countryside"</li>
                <li>"Trendy restaurant with modern decor and fusion cuisine"</li>
                <li>"Hidden gem bookstore with rare first editions"</li>
              </ul>
            </div>
          </div>

          <div className="generate-section">
            <button 
              onClick={generateScript} 
              disabled={loading || !prompt.trim()}
              className="generate-button"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FaMagic />
                  Generate Script
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {generatedScript && (
            <div className="generated-script">
              <h3>Generated Script:</h3>
              <div className="script-content">
                {generatedScript}
              </div>
              <div className="script-actions">
                <button onClick={handleSave} className="save-button">
                  <FaSave /> Save to Vōstcard
                </button>
                <button onClick={handleClear} className="clear-button">
                  Clear & Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock AI function - replace with actual API call
const mockAIGenerateScript = async (prompt: string): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const responses = [
    `Welcome to this amazing ${prompt.toLowerCase().includes('coffee') ? 'coffee shop' : 'place'}! I'm here to share this incredible spot with you. The atmosphere is absolutely ${prompt.toLowerCase().includes('cozy') ? 'cozy and inviting' : 'wonderful'}, and I can't wait to tell you all about it.`,
    
    `Hey everyone! I just discovered this fantastic ${prompt.toLowerCase().includes('restaurant') ? 'restaurant' : 'location'} and I had to share it with you. The ${prompt.toLowerCase().includes('food') ? 'food is amazing' : 'experience here is incredible'}, and the vibe is absolutely perfect.`,
    
    `You won't believe this amazing ${prompt.toLowerCase().includes('castle') ? 'castle' : 'spot'} I found! The history here is fascinating, and the views are absolutely breathtaking. I'm so excited to show you around this incredible place.`,
    
    `This is one of my favorite ${prompt.toLowerCase().includes('bookstore') ? 'bookstores' : 'places'} in the city! The selection here is incredible, and the atmosphere is so peaceful and inspiring. I could spend hours exploring every corner.`
  ];
  
  // Return a random response based on the prompt
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}; 