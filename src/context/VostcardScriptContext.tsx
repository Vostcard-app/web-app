import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Vostcard } from '../types/VostcardTypes';

interface ScriptSegment {
  id: string;
  type: 'intro' | 'content' | 'outro' | 'transition';
  text: string;
  duration: number; // in seconds
  order: number;
}

interface GeneratedScript {
  id: string;
  vostcardId: string;
  segments: ScriptSegment[];
  totalDuration: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  segments: Omit<ScriptSegment, 'id' | 'order'>[];
  category: string;
  isDefault: boolean;
}

interface VostcardScriptContextProps {
  // Script state
  currentScript: GeneratedScript | null;
  availableTemplates: ScriptTemplate[];
  isGenerating: boolean;
  error: string | null;
  
  // Script generation
  generateScript: (vostcard: Vostcard, templateId?: string) => Promise<GeneratedScript>;
  regenerateScript: (scriptId: string) => Promise<GeneratedScript>;
  updateScript: (scriptId: string, updates: Partial<GeneratedScript>) => Promise<void>;
  
  // Script management
  saveScript: (script: GeneratedScript) => Promise<void>;
  loadScript: (scriptId: string) => Promise<GeneratedScript | null>;
  deleteScript: (scriptId: string) => Promise<void>;
  
  // Template management
  loadTemplates: () => Promise<void>;
  createTemplate: (template: Omit<ScriptTemplate, 'id'>) => Promise<void>;
  updateTemplate: (templateId: string, updates: Partial<ScriptTemplate>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  
  // Script analysis
  analyzeVostcard: (vostcard: Vostcard) => {
    suggestedDuration: number;
    suggestedSegments: number;
    complexity: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  
  // Utility functions
  exportScript: (script: GeneratedScript, format: 'text' | 'json' | 'srt') => string;
  clearCurrentScript: () => void;
}

const VostcardScriptContext = createContext<VostcardScriptContextProps | undefined>(undefined);

// Default script templates
const DEFAULT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'default',
    name: 'Standard Vostcard',
    description: 'A balanced script with intro, content, and outro',
    category: 'general',
    isDefault: true,
    segments: [
      {
        type: 'intro',
        text: 'Welcome to this amazing place!',
        duration: 5
      },
      {
        type: 'content',
        text: 'Let me show you what makes this location special.',
        duration: 15
      },
      {
        type: 'outro',
        text: 'Thanks for watching! Don\'t forget to like and subscribe.',
        duration: 5
      }
    ]
  },
  {
    id: 'quickcard',
    name: 'Quick Snapshot',
    description: 'Perfect for quick photo-based posts',
    category: 'quickcard',
    isDefault: false,
    segments: [
      {
        type: 'intro',
        text: 'Quick look at this spot!',
        duration: 3
      },
      {
        type: 'content',
        text: 'Here\'s what caught my eye.',
        duration: 8
      },
      {
        type: 'outro',
        text: 'Worth checking out!',
        duration: 2
      }
    ]
  },
  {
    id: 'story',
    name: 'Story Mode',
    description: 'Narrative-driven script with emotional connection',
    category: 'story',
    isDefault: false,
    segments: [
      {
        type: 'intro',
        text: 'Let me tell you a story about this place.',
        duration: 6
      },
      {
        type: 'content',
        text: 'It all started when I discovered this hidden gem.',
        duration: 20
      },
      {
        type: 'transition',
        text: 'But that\'s not even the best part.',
        duration: 4
      },
      {
        type: 'content',
        text: 'What really makes it special is the atmosphere.',
        duration: 15
      },
      {
        type: 'outro',
        text: 'Sometimes the best adventures are the unexpected ones.',
        duration: 5
      }
    ]
  }
];

export const VostcardScriptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Script state
  const [currentScript, setCurrentScript] = useState<GeneratedScript | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<ScriptTemplate[]>(DEFAULT_TEMPLATES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Script generation
  const generateScript = useCallback(async (vostcard: Vostcard, templateId?: string): Promise<GeneratedScript> => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Select template
      const template = templateId 
        ? availableTemplates.find(t => t.id === templateId)
        : availableTemplates.find(t => t.isDefault) || availableTemplates[0];
      
      if (!template) {
        throw new Error('No template available');
      }
      
      // Analyze vostcard for customization
      const analysis = analyzeVostcard(vostcard);
      
      // Generate script based on template and analysis
      const scriptId = `script_${vostcard.id}_${Date.now()}`;
      const segments: ScriptSegment[] = template.segments.map((segment, index) => ({
        ...segment,
        id: `${scriptId}_seg_${index}`,
        order: index,
        text: customizeSegmentText(segment.text, vostcard, analysis),
        duration: adjustSegmentDuration(segment.duration, analysis)
      }));
      
      const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
      
      const newScript: GeneratedScript = {
        id: scriptId,
        vostcardId: vostcard.id,
        segments,
        totalDuration,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      
      setCurrentScript(newScript);
      console.log('✅ Script generated:', scriptId);
      
      return newScript;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate script';
      setError(errorMessage);
      console.error('❌ Script generation failed:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [availableTemplates]);

  const regenerateScript = useCallback(async (scriptId: string): Promise<GeneratedScript> => {
    if (!currentScript) {
      throw new Error('No current script to regenerate');
    }
    
    // Load the original vostcard to regenerate
    // This would typically come from storage context
    const mockVostcard: Vostcard = {
      id: currentScript.vostcardId,
      title: 'Regenerated Vostcard',
      description: 'Regenerated description',
      state: 'private',
      visibility: 'private',
      photos: [],
      categories: [],
      username: '',
      userID: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return generateScript(mockVostcard);
  }, [currentScript, generateScript]);

  const updateScript = useCallback(async (scriptId: string, updates: Partial<GeneratedScript>): Promise<void> => {
    if (!currentScript || currentScript.id !== scriptId) {
      throw new Error('Script not found');
    }
    
    const updatedScript: GeneratedScript = {
      ...currentScript,
      ...updates,
      updatedAt: new Date(),
      version: currentScript.version + 1
    };
    
    setCurrentScript(updatedScript);
    console.log('✅ Script updated:', scriptId);
  }, [currentScript]);

  // Script management
  const saveScript = useCallback(async (script: GeneratedScript): Promise<void> => {
    try {
      // In a real implementation, this would save to storage
      // For now, just update the current script
      setCurrentScript(script);
      console.log('✅ Script saved:', script.id);
    } catch (err) {
      console.error('❌ Failed to save script:', err);
      throw err;
    }
  }, []);

  const loadScript = useCallback(async (scriptId: string): Promise<GeneratedScript | null> => {
    try {
      // In a real implementation, this would load from storage
      // For now, return the current script if it matches
      if (currentScript && currentScript.id === scriptId) {
        return currentScript;
      }
      return null;
    } catch (err) {
      console.error('❌ Failed to load script:', err);
      return null;
    }
  }, [currentScript]);

  const deleteScript = useCallback(async (scriptId: string): Promise<void> => {
    try {
      if (currentScript && currentScript.id === scriptId) {
        setCurrentScript(null);
      }
      console.log('✅ Script deleted:', scriptId);
    } catch (err) {
      console.error('❌ Failed to delete script:', err);
      throw err;
    }
  }, [currentScript]);

  // Template management
  const loadTemplates = useCallback(async (): Promise<void> => {
    try {
      // In a real implementation, this would load from storage
      // For now, just use the default templates
      setAvailableTemplates(DEFAULT_TEMPLATES);
      console.log('✅ Templates loaded:', DEFAULT_TEMPLATES.length);
    } catch (err) {
      console.error('❌ Failed to load templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }, []);

  const createTemplate = useCallback(async (template: Omit<ScriptTemplate, 'id'>): Promise<void> => {
    try {
      const newTemplate: ScriptTemplate = {
        ...template,
        id: `template_${Date.now()}`,
        isDefault: false
      };
      
      setAvailableTemplates(prev => [...prev, newTemplate]);
      console.log('✅ Template created:', newTemplate.id);
    } catch (err) {
      console.error('❌ Failed to create template:', err);
      throw err;
    }
  }, []);

  const updateTemplate = useCallback(async (templateId: string, updates: Partial<ScriptTemplate>): Promise<void> => {
    try {
      setAvailableTemplates(prev => 
        prev.map(t => t.id === templateId ? { ...t, ...updates } : t)
      );
      console.log('✅ Template updated:', templateId);
    } catch (err) {
      console.error('❌ Failed to update template:', err);
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    try {
      setAvailableTemplates(prev => prev.filter(t => t.id !== templateId));
      console.log('✅ Template deleted:', templateId);
    } catch (err) {
      console.error('❌ Failed to delete template:', err);
      throw err;
    }
  }, []);

  // Script analysis
  const analyzeVostcard = useCallback((vostcard: Vostcard) => {
    const photoCount = vostcard.photos?.length || 0;
    const hasVideo = !!vostcard.video;
    const descriptionLength = vostcard.description?.length || 0;
    const categoryCount = vostcard.categories?.length || 0;
    
    // Calculate suggested duration based on content
    let suggestedDuration = 15; // Base duration
    
    if (hasVideo) suggestedDuration += 10;
    if (photoCount > 0) suggestedDuration += photoCount * 2;
    if (descriptionLength > 100) suggestedDuration += 5;
    if (categoryCount > 3) suggestedDuration += 3;
    
    // Calculate complexity
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (suggestedDuration > 25) complexity = 'high';
    else if (suggestedDuration > 15) complexity = 'medium';
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (photoCount === 0) recommendations.push('Add photos to make your content more engaging');
    if (descriptionLength < 50) recommendations.push('Consider adding more description for better context');
    if (categoryCount === 0) recommendations.push('Add categories to help others discover your content');
    if (hasVideo && suggestedDuration > 30) recommendations.push('Consider breaking long videos into shorter segments');
    
    return {
      suggestedDuration,
      suggestedSegments: Math.ceil(suggestedDuration / 8), // 8 seconds per segment average
      complexity,
      recommendations
    };
  }, []);

  // Utility functions
  const exportScript = useCallback((script: GeneratedScript, format: 'text' | 'json' | 'srt'): string => {
    switch (format) {
      case 'text':
        return script.segments
          .sort((a, b) => a.order - b.order)
          .map(seg => `${seg.type.toUpperCase()}: ${seg.text}`)
          .join('\n\n');
      
      case 'json':
        return JSON.stringify(script, null, 2);
      
      case 'srt':
        let srtContent = '';
        let currentTime = 0;
        
        script.segments
          .sort((a, b) => a.order - b.order)
          .forEach((seg, index) => {
            const startTime = formatTime(currentTime);
            currentTime += seg.duration;
            const endTime = formatTime(currentTime);
            
            srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${seg.text}\n\n`;
          });
        
        return srtContent;
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }, []);

  const clearCurrentScript = useCallback(() => {
    setCurrentScript(null);
    setError(null);
    console.log('✅ Current script cleared');
  }, []);

  // Helper functions
  const customizeSegmentText = (baseText: string, vostcard: Vostcard, analysis: ReturnType<typeof analyzeVostcard>): string => {
    let customized = baseText;
    
    // Replace placeholders with actual content
    if (vostcard.title) {
      customized = customized.replace('this place', vostcard.title);
      customized = customized.replace('this location', vostcard.title);
      customized = customized.replace('this spot', vostcard.title);
    }
    
    if (vostcard.description) {
      // Extract key phrases from description
      const keyPhrases = vostcard.description.split(' ').slice(0, 5).join(' ');
      customized = customized.replace('what makes this location special', keyPhrases);
    }
    
    return customized;
  };

  const adjustSegmentDuration = (baseDuration: number, analysis: ReturnType<typeof analyzeVostcard>): number => {
    // Adjust duration based on complexity
    let adjusted = baseDuration;
    
    if (analysis.complexity === 'high') {
      adjusted = Math.round(adjusted * 1.2);
    } else if (analysis.complexity === 'low') {
      adjusted = Math.round(adjusted * 0.8);
    }
    
    return Math.max(2, Math.min(30, adjusted)); // Keep between 2-30 seconds
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},000`;
  };

  const value: VostcardScriptContextProps = {
    // Script state
    currentScript,
    availableTemplates,
    isGenerating,
    error,
    
    // Script generation
    generateScript,
    regenerateScript,
    updateScript,
    
    // Script management
    saveScript,
    loadScript,
    deleteScript,
    
    // Template management
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    
    // Script analysis
    analyzeVostcard,
    
    // Utility functions
    exportScript,
    clearCurrentScript,
  };

  return (
    <VostcardScriptContext.Provider value={value}>
      {children}
    </VostcardScriptContext.Provider>
  );
};

export const useVostcardScript = () => {
  const context = useContext(VostcardScriptContext);
  if (context === undefined) {
    throw new Error('useVostcardScript must be used within a VostcardScriptProvider');
  }
  return context;
};
