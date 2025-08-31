import React, { useState, useRef, useEffect } from 'react';
import { FaCamera } from 'react-icons/fa';

export interface PhotoUploadManagerProps {
  photos: (Blob | File)[];
  photoPreviews: string[];
  onPhotosChange: (photos: (Blob | File)[], previews: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  showPhotoOptionsModal?: () => void;
}

interface DragState {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  isDragging: boolean;
  touchStartPos: { x: number; y: number } | null;
}

const PhotoUploadManager: React.FC<PhotoUploadManagerProps> = ({
  photos,
  photoPreviews,
  onPhotosChange,
  maxPhotos = 4,
  disabled = false,
  showPhotoOptionsModal
}) => {
  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({
    draggedIndex: null,
    dragOverIndex: null,
    isDragging: false,
    touchStartPos: null
  });

  const photoGridRef = useRef<HTMLDivElement | null>(null);

  // Photo upload handler for multiple photos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select valid image files.');
      return;
    }

    // Check if adding these photos would exceed the limit
    const totalPhotos = photos.length + imageFiles.length;
    if (totalPhotos > maxPhotos) {
      alert(`You can only add ${maxPhotos - photos.length} more photo(s). Maximum is ${maxPhotos} photos.`);
      return;
    }

    // Add new photos and previews
    const newPhotos = [...photos, ...imageFiles];
    const newPreviews = [...photoPreviews];
    
    imageFiles.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push(previewUrl);
    });

    onPhotosChange(newPhotos, newPreviews);
    console.log(`📸 Added ${imageFiles.length} photos. Total: ${newPhotos.length}`);
  };

  // Remove a specific photo
  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    
    // Clean up blob URL
    if (photoPreviews[index]) {
      URL.revokeObjectURL(photoPreviews[index]);
    }
    
    onPhotosChange(newPhotos, newPreviews);
  };

  // Reorder photos helper
  const reorderPhotos = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const newPreviews = [...photoPreviews];
    
    const draggedPhoto = newPhotos[fromIndex];
    const draggedPreview = newPreviews[fromIndex];
    
    // Remove from original position
    newPhotos.splice(fromIndex, 1);
    newPreviews.splice(fromIndex, 1);
    
    // Insert at new position
    newPhotos.splice(toIndex, 0, draggedPhoto);
    newPreviews.splice(toIndex, 0, draggedPreview);
    
    onPhotosChange(newPhotos, newPreviews);
  };

  // Drag and drop handlers for desktop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragState(prev => ({ ...prev, draggedIndex: index }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({ ...prev, dragOverIndex: index }));
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (dragState.draggedIndex === null || dragState.draggedIndex === dropIndex) {
      return;
    }

    reorderPhotos(dragState.draggedIndex, dropIndex);
    
    setDragState(prev => ({
      ...prev,
      draggedIndex: null,
      dragOverIndex: null
    }));
  };

  const handleDragEnd = () => {
    setDragState(prev => ({
      ...prev,
      draggedIndex: null,
      dragOverIndex: null
    }));
  };

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    const photoIndex = target.getAttribute('data-photo-index');
    if (!photoIndex) return;
    
    const index = parseInt(photoIndex);
    const touch = e.touches[0];
    setDragState(prev => ({
      ...prev,
      touchStartPos: { x: touch.clientX, y: touch.clientY },
      draggedIndex: index,
      isDragging: false
    }));
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (dragState.draggedIndex === null || !dragState.touchStartPos) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - dragState.touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - dragState.touchStartPos.y);
    
    if (deltaX > 10 || deltaY > 10) {
      setDragState(prev => ({ ...prev, isDragging: true }));
      
      // Find which photo we're over
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const photoElement = elements.find(el => el.getAttribute('data-photo-index'));
      if (photoElement) {
        const targetIndex = parseInt(photoElement.getAttribute('data-photo-index') || '0');
        if (targetIndex !== dragState.draggedIndex) {
          setDragState(prev => ({ ...prev, dragOverIndex: targetIndex }));
        } else {
          setDragState(prev => ({ ...prev, dragOverIndex: null }));
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragState.isDragging && dragState.dragOverIndex !== null && 
        dragState.draggedIndex !== null && dragState.draggedIndex !== dragState.dragOverIndex) {
      reorderPhotos(dragState.draggedIndex, dragState.dragOverIndex);
    }
    
    // Reset all drag state
    setDragState({
      draggedIndex: null,
      dragOverIndex: null,
      isDragging: false,
      touchStartPos: null
    });
  };

  // Effect to manage touch event listeners
  useEffect(() => {
    const photoGrid = photoGridRef.current;
    if (!photoGrid) return;

    photoGrid.addEventListener('touchstart', handleTouchStart, { passive: false });
    photoGrid.addEventListener('touchmove', handleTouchMove, { passive: false });
    photoGrid.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      photoGrid.removeEventListener('touchstart', handleTouchStart);
      photoGrid.removeEventListener('touchmove', handleTouchMove);
      photoGrid.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState.draggedIndex, dragState.touchStartPos, dragState.isDragging, dragState.dragOverIndex]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  return (
    <div>
      {/* Photo Grid */}
      {photoPreviews.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '8px'
          }}>
            Photos ({photoPreviews.length}/{maxPhotos})
          </label>
          <div 
            ref={photoGridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              marginBottom: '8px'
            }}>
            {photoPreviews.map((preview, index) => (
              <div
                key={index}
                data-photo-index={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseDown={(e) => {
                  // Handle mouse drag for desktop
                  if (e.button === 0) { // Left mouse button only
                    setDragState(prev => ({ ...prev, draggedIndex: index }));
                  }
                }}
                onMouseEnter={() => {
                  // Handle drag over for mouse
                  if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
                    setDragState(prev => ({ ...prev, dragOverIndex: index }));
                  }
                }}
                onMouseLeave={() => {
                  setDragState(prev => ({ ...prev, dragOverIndex: null }));
                }}
                onMouseUp={() => {
                  // Handle drop for mouse
                  if (dragState.draggedIndex !== null && dragState.dragOverIndex !== null && 
                      dragState.draggedIndex !== dragState.dragOverIndex) {
                    reorderPhotos(dragState.draggedIndex, dragState.dragOverIndex);
                  }
                  setDragState(prev => ({
                    ...prev,
                    draggedIndex: null,
                    dragOverIndex: null
                  }));
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f0f0f0',
                  cursor: 'grab',
                  opacity: dragState.draggedIndex === index ? 0.5 : 1,
                  transform: dragState.draggedIndex === index ? 'scale(0.95)' : 'scale(1)',
                  transition: dragState.isDragging ? 'none' : 'all 0.2s ease',
                  border: dragState.dragOverIndex === index && dragState.draggedIndex !== index ? '2px dashed #007aff' : 'none',
                  boxShadow: dragState.dragOverIndex === index && dragState.draggedIndex !== index ? '0 0 10px rgba(0, 122, 255, 0.3)' : 'none',
                  touchAction: 'none'
                }}
              >
                <img
                  src={preview}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {index + 1}
                </div>
                <button
                  onClick={() => removePhoto(index)}
                  disabled={disabled}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    border: 'none',
                    fontSize: '12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {photoPreviews.length > 1 && (
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              fontStyle: 'italic',
              marginTop: '4px'
            }}>
              💡 Tap and drag photos to reorder them
            </div>
          )}
        </div>
      )}

      {/* Photo Upload Button */}
      {showPhotoOptionsModal && (
        <button 
          onClick={showPhotoOptionsModal}
          disabled={disabled || photos.length >= maxPhotos}
          style={{
            backgroundColor: (disabled || photos.length >= maxPhotos) ? '#ccc' : '#007aff',
            color: 'white',
            border: 'none',
            padding: '12px 8px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: (disabled || photos.length >= maxPhotos) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%'
          }}
        >
          <FaCamera size={14} />
          📸 Add Photos ({photos.length}/{maxPhotos})
        </button>
      )}

      {/* Hidden file inputs for direct upload (if not using modal) */}
      {!showPhotoOptionsModal && (
        <>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            disabled={disabled || photos.length >= maxPhotos}
            style={{ display: 'none' }}
            id="photo-upload-input"
          />
          <label
            htmlFor="photo-upload-input"
            style={{
              backgroundColor: (disabled || photos.length >= maxPhotos) ? '#ccc' : '#007aff',
              color: 'white',
              border: 'none',
              padding: '12px 8px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: (disabled || photos.length >= maxPhotos) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%'
            }}
          >
            <FaCamera size={14} />
            📸 Add Photos ({photos.length}/{maxPhotos})
          </label>
        </>
      )}
    </div>
  );
};

export default PhotoUploadManager;
