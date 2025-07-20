// Advanced Vostcard Editor - Professional editing interface with rich features
import React, { useState, useRef, useEffect } from 'react';
import { 
  FaSave, FaPlay, FaEye, FaVideo, FaImage, FaMapMarkerAlt, 
  FaTags, FaPalette, FaMagic, FaUndo, FaRedo, FaCrop, FaAdjust,
  FaVolumeUp, FaClosedCaptioning, FaFilter, FaBrush, FaLayerGroup,
  FaCode, FaExpandArrowsAlt, FaCompressArrowsAlt, FaCopy, FaFileExport,
  FaEdit, FaCog
} from 'react-icons/fa';
import { useVostcardEdit } from '../../context/VostcardEditContext';
import { useStudioAccess } from '../../hooks/useStudioAccess';
import { VOSTCARD_CATEGORIES } from '../DriveModeIntegration';
import type { Vostcard } from '../../types/VostcardTypes';

interface EditorTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  content: React.ComponentType;
}

interface EditorState {
  activeTab: string;
  isFullscreen: boolean;
  showPreview: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
}

export const AdvancedEditor: React.FC = () => {
  const { permissions } = useStudioAccess();
  const { 
    currentVostcard, 
    createNewVostcard, 
    updateContent, 
    saveVostcard, 
    isDirty,
    isValid 
  } = useVostcardEdit();

  const [editorState, setEditorState] = useState<EditorState>({
    activeTab: 'content',
    isFullscreen: false,
    showPreview: true,
    isDirty: false,
    lastSaved: null
  });

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const editorTabs: EditorTab[] = [
    { id: 'content', label: 'Content', icon: FaEdit, content: ContentTab },
    { id: 'media', label: 'Media', icon: FaVideo, content: MediaTab },
    { id: 'style', label: 'Style', icon: FaPalette, content: StyleTab },
    { id: 'location', label: 'Location', icon: FaMapMarkerAlt, content: LocationTab },
    { id: 'settings', label: 'Settings', icon: FaCog, content: SettingsTab }
  ] as const;

  useEffect(() => {
    // Create new vostcard if none exists
    if (!currentVostcard) {
      createNewVostcard();
    }
  }, [currentVostcard, createNewVostcard]);

  const handleSave = async () => {
    if (!permissions.canEdit || !currentVostcard) return;
    
    try {
      await saveVostcard();
      setEditorState(prev => ({ ...prev, lastSaved: new Date() }));
    } catch (error) {
      console.error('Failed to save vostcard:', error);
    }
  };

  const handleTabChange = (tabId: string) => {
    setEditorState(prev => ({ ...prev, activeTab: tabId }));
  };

  const toggleFullscreen = () => {
    setEditorState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  const togglePreview = () => {
    setEditorState(prev => ({ ...prev, showPreview: !prev.showPreview }));
  };

  const currentTab = editorTabs.find(tab => tab.id === editorState.activeTab);
  const ContentComponent = currentTab?.content || ContentTab;

  return (
    <div style={{
      height: editorState.isFullscreen ? '100vh' : 'calc(100vh - 140px)',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      position: editorState.isFullscreen ? 'fixed' : 'relative',
      top: editorState.isFullscreen ? 0 : 'auto',
      left: editorState.isFullscreen ? 0 : 'auto',
      right: editorState.isFullscreen ? 0 : 'auto',
      bottom: editorState.isFullscreen ? 0 : 'auto',
      zIndex: editorState.isFullscreen ? 9999 : 'auto'
    }}>
      
      {/* Editor Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>
            {currentVostcard?.title || 'Untitled Vostcard'}
          </h3>
          
          {isDirty && (
            <span style={{
              backgroundColor: '#ffc107',
              color: '#212529',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              UNSAVED
            </span>
          )}

          {editorState.lastSaved && (
            <span style={{ fontSize: '12px', color: '#6c757d' }}>
              Last saved: {editorState.lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={togglePreview}
            style={{
              backgroundColor: editorState.showPreview ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px'
            }}
          >
            <FaEye size={12} />
            Preview
          </button>

          <button
            onClick={toggleFullscreen}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {editorState.isFullscreen ? <FaCompressArrowsAlt size={12} /> : <FaExpandArrowsAlt size={12} />}
          </button>

          <button
            onClick={handleSave}
            disabled={!permissions.canEdit || !isDirty}
            style={{
              backgroundColor: isValid ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: permissions.canEdit ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: permissions.canEdit ? 1 : 0.6
            }}
          >
            <FaSave size={12} />
            Save
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div style={{ flex: 1, display: 'flex' }}>
        
        {/* Tab Navigation */}
        <div style={{
          width: '200px',
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '20px 0'
        }}>
          {editorTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: editorState.activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                borderLeft: editorState.activeTab === tab.id ? '3px solid #ff6b35' : '3px solid transparent'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Editor Content */}
        <div style={{
          flex: editorState.showPreview ? 1 : 2,
          padding: '20px',
          backgroundColor: 'white',
          overflow: 'auto'
        }}>
          <ContentComponent />
        </div>

        {/* Live Preview */}
        {editorState.showPreview && (
          <div style={{
            flex: 1,
            backgroundColor: '#f8f9fa',
            borderLeft: '1px solid #dee2e6',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '15px 20px',
              backgroundColor: '#343a40',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h4 style={{ margin: 0, fontSize: '14px' }}>Live Preview</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <FaPlay size={12} />
                </button>
              </div>
            </div>
            
            <div style={{
              flex: 1,
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <VostcardPreview vostcard={currentVostcard} isPlaying={isPreviewPlaying} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Content Tab Component
const ContentTab: React.FC = () => {
  const { currentVostcard, updateContent } = useVostcardEdit();

  return (
    <div style={{ maxWidth: '800px' }}>
      <h4 style={{ marginBottom: '20px', color: '#2c3e50' }}>Content Details</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Title *
          </label>
          <input
            type="text"
            value={currentVostcard?.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder="Enter vostcard title..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Description *
          </label>
          <textarea
            value={currentVostcard?.description || ''}
            onChange={(e) => updateContent({ description: e.target.value })}
            placeholder="Describe your vostcard content..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Categories */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Categories *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {VOSTCARD_CATEGORIES.map((category) => (
              <label key={category} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={currentVostcard?.categories?.includes(category) || false}
                  onChange={(e) => {
                    const categories = currentVostcard?.categories || [];
                    if (e.target.checked) {
                      updateContent({ categories: [...categories, category] });
                    } else {
                      updateContent({ categories: categories.filter(c => c !== category) });
                    }
                  }}
                />
                <span style={{ fontSize: '14px' }}>{category}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h5 style={{ margin: '0 0 15px 0', color: '#495057' }}>Advanced Options</h5>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={currentVostcard?.isQuickcard || false}
                onChange={(e) => updateContent({ isQuickcard: e.target.checked })}
              />
              <span>Quickcard (photo-only content)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={currentVostcard?.isOffer || false}
                onChange={(e) => updateContent({ isOffer: e.target.checked })}
              />
              <span>Special offer or promotion</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// Media Tab Component
const MediaTab: React.FC = () => {
  const { currentVostcard, setVideo, addPhoto } = useVostcardEdit();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideo(file);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        addPhoto(file);
      }
    });
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h4 style={{ marginBottom: '20px', color: '#2c3e50' }}>Media Content</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Video Section */}
        <div>
          <h5 style={{ marginBottom: '15px' }}>Video Content</h5>
          <div style={{
            border: '2px dashed #ced4da',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: currentVostcard?.video ? '#e8f5e8' : '#f8f9fa'
          }}>
            {currentVostcard?.video ? (
              <div>
                <FaVideo size={32} color="#28a745" style={{ marginBottom: '10px' }} />
                <p style={{ margin: '0 0 15px 0', color: '#28a745' }}>
                  Video uploaded successfully
                </p>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Replace Video
                </button>
              </div>
            ) : (
              <div>
                <FaVideo size={32} color="#6c757d" style={{ marginBottom: '10px' }} />
                <p style={{ margin: '0 0 15px 0', color: '#6c757d' }}>
                  Upload a video file for your vostcard
                </p>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <FaVideo style={{ marginRight: '8px' }} />
                  Upload Video
                </button>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Photos Section */}
        <div>
          <h5 style={{ marginBottom: '15px' }}>Photo Gallery</h5>
          <div style={{
            border: '2px dashed #ced4da',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa'
          }}>
            <FaImage size={32} color="#6c757d" style={{ marginBottom: '10px' }} />
            <p style={{ margin: '0 0 15px 0', color: '#6c757d' }}>
              Add photos to complement your video content
            </p>
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <FaImage style={{ marginRight: '8px' }} />
              Add Photos
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Photo Grid */}
          {currentVostcard?.photos && currentVostcard.photos.length > 0 && (
            <div style={{
              marginTop: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '10px'
            }}>
              {currentVostcard.photos.map((photo, index) => (
                <div
                  key={index}
                  style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FaImage size={24} color="#6c757d" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other tabs
const StyleTab = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <FaPalette size={48} color="#fd7e14" />
    <h3>Style Editor</h3>
    <p>Visual styling tools coming soon...</p>
  </div>
);

const LocationTab = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <FaMapMarkerAlt size={48} color="#dc3545" />
    <h3>Location Manager</h3>
    <p>Geographic and location tools coming soon...</p>
  </div>
);

const SettingsTab = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <FaCog size={48} color="#6c757d" />
    <h3>Vostcard Settings</h3>
    <p>Advanced configuration options coming soon...</p>
  </div>
);

// Vostcard Preview Component
interface VostcardPreviewProps {
  vostcard: Vostcard | null;
  isPlaying: boolean;
}

const VostcardPreview: React.FC<VostcardPreviewProps> = ({ vostcard, isPlaying }) => {
  if (!vostcard) {
    return (
      <div style={{ textAlign: 'center', color: '#6c757d' }}>
        <FaEye size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
        <p>Preview will appear here</p>
        <p style={{ fontSize: '12px' }}>Add content to see live preview</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '300px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      overflow: 'hidden'
    }}>
      {/* Preview Header */}
      <div style={{
        padding: '15px',
        backgroundColor: '#2c3e50',
        color: 'white'
      }}>
        <h5 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
          {vostcard.title || 'Untitled Vostcard'}
        </h5>
        <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
          {vostcard.username || 'Author'}
        </p>
      </div>

      {/* Preview Content */}
      <div style={{ padding: '15px' }}>
        <div style={{
          width: '100%',
          height: '150px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '15px',
          border: '1px solid #dee2e6'
        }}>
          {vostcard.video ? (
            <FaPlay size={32} color={isPlaying ? '#28a745' : '#6c757d'} />
          ) : (
            <FaVideo size={32} color="#dee2e6" />
          )}
        </div>

        <p style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          color: '#495057',
          lineHeight: 1.4
        }}>
          {vostcard.description || 'No description provided'}
        </p>

        {vostcard.categories && vostcard.categories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {vostcard.categories.slice(0, 3).map((category, index) => (
              <span
                key={index}
                style={{
                  fontSize: '10px',
                  backgroundColor: '#e9ecef',
                  color: '#495057',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                {category}
              </span>
            ))}
            {vostcard.categories.length > 3 && (
              <span style={{ fontSize: '10px', color: '#6c757d' }}>
                +{vostcard.categories.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedEditor; 