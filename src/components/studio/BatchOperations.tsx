// Batch Operations - Professional bulk management of vostcards (Simplified)
import React, { useState, useEffect } from 'react';
import { 
  FaCheckSquare, FaSquare, FaTrash, FaEye, FaDownload, 
  FaSearch, FaFilter, FaSort, FaFileExport, FaLayerGroup
} from 'react-icons/fa';
import { useVostcard } from '../../context/VostcardContext';
import { useStudioAccess } from '../../hooks/useStudioAccess';
import { VOSTCARD_CATEGORIES } from '../DriveModeIntegration';
import type { Vostcard } from '../../types/VostcardTypes';

interface ExtendedVostcard extends Vostcard {
  _batchState: 'draft' | 'published';
}

export const BatchOperations: React.FC = () => {
  const { permissions } = useStudioAccess();
  const { 
    savedVostcards, 
    postedVostcards, 
    loadAllLocalVostcards, 
    loadPostedVostcards 
  } = useVostcard();

  const [selectedVostcards, setSelectedVostcards] = useState<Set<string>>(new Set());
  const [allVostcards, setAllVostcards] = useState<ExtendedVostcard[]>([]);
  const [filteredVostcards, setFilteredVostcards] = useState<ExtendedVostcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'quickcards'>('all');

  // Load all vostcards on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([loadAllLocalVostcards(), loadPostedVostcards()]);
      } catch (error) {
        console.error('Failed to load vostcards:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [loadAllLocalVostcards, loadPostedVostcards]);

  // Combine and process vostcards
  useEffect(() => {
    const combined: ExtendedVostcard[] = [
      ...savedVostcards.map(v => ({ ...v, _batchState: 'draft' as const })),
      ...postedVostcards.map(v => ({ ...v, _batchState: 'published' as const }))
    ];
    
    setAllVostcards(combined);
  }, [savedVostcards, postedVostcards]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allVostcards];

    // Apply type filter
    if (typeFilter === 'quickcards') {
      filtered = filtered.filter(v => v.isQuickcard === true);
    } else if (typeFilter === 'regular') {
      filtered = filtered.filter(v => !v.isQuickcard);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.title?.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query) ||
        v.username?.toLowerCase().includes(query)
      );
    }

    // Sort by updated date (newest first)
    filtered.sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bDate - aDate;
    });

    setFilteredVostcards(filtered);
  }, [allVostcards, searchQuery, typeFilter]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedVostcards.size === filteredVostcards.length) {
      setSelectedVostcards(new Set());
    } else {
      setSelectedVostcards(new Set(filteredVostcards.map(v => v.id)));
    }
  };

  const handleSelectVostcard = (id: string) => {
    const newSelected = new Set(selectedVostcards);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVostcards(newSelected);
  };

  // Batch action handlers
  const handleBatchExport = () => {
    const selectedData = filteredVostcards
      .filter(v => selectedVostcards.has(v.id))
      .map(v => ({
        id: v.id,
        title: v.title,
        description: v.description,
        categories: v.categories,
        state: v._batchState,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        location: v.geo
      }));

    const blob = new Blob([JSON.stringify(selectedData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vostcards-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Exported ${selectedData.length} vostcards`);
  };

  const handleBatchAction = (action: string) => {
    const selectedData = filteredVostcards.filter(v => selectedVostcards.has(v.id));
    
    switch (action) {
      case 'export':
        handleBatchExport();
        break;
      case 'delete':
        if (permissions.canDelete) {
          const confirmed = window.confirm(
            `Delete ${selectedData.length} vostcard${selectedData.length > 1 ? 's' : ''}? This action will be implemented soon.`
          );
          if (confirmed) {
            console.log('Would delete:', selectedData.map(v => v.id));
          }
        }
        break;
      default:
        console.log(`Action ${action} not implemented yet`);
    }
    
    setSelectedVostcards(new Set());
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <FaLayerGroup size={48} color="#6f42c1" />
        <h2>Batch Operations</h2>
        <p>Loading vostcards...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>
            Batch Operations ({filteredVostcards.length} items)
            {typeFilter === 'all' && (
              <span style={{ fontSize: '14px', color: '#6c757d', marginLeft: '8px' }}>
                ({allVostcards.filter(v => !v.isQuickcard).length} vostcards, {allVostcards.filter(v => v.isQuickcard).length} quickcards)
              </span>
            )}
          </h3>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'regular' | 'quickcards')}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Content</option>
              <option value="regular">Vostcards</option>
              <option value="quickcards">📱 Quickcards</option>
            </select>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <FaSearch 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#6c757d'
                }} 
              />
              <input
                type="text"
                placeholder="Search vostcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '35px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  width: '200px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Selection Controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={handleSelectAll}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#495057'
              }}
            >
              {selectedVostcards.size === filteredVostcards.length ? 
                <FaCheckSquare size={16} color="#007bff" /> : 
                <FaSquare size={16} />
              }
              Select All ({filteredVostcards.length})
            </button>

            {selectedVostcards.size > 0 && (
              <span style={{ fontSize: '14px', color: '#6c757d' }}>
                {selectedVostcards.size} selected
              </span>
            )}
          </div>

          {/* Batch Actions */}
          {selectedVostcards.size > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleBatchAction('export')}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <FaFileExport size={12} />
                Export Selected
              </button>

              {permissions.canDelete && (
                <button
                  onClick={() => handleBatchAction('delete')}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px'
                  }}
                >
                  <FaTrash size={12} />
                  Delete Selected
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vostcards Grid */}
      {filteredVostcards.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          borderRadius: '8px'
        }}>
          <FaSearch size={48} color="#dee2e6" style={{ marginBottom: '15px' }} />
          <h3 style={{ color: '#6c757d', margin: '0 0 10px 0' }}>No vostcards found</h3>
          <p style={{ color: '#6c757d', margin: 0 }}>
            Try adjusting your search terms
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {filteredVostcards.map((vostcard) => (
            <VostcardBatchItem
              key={vostcard.id}
              vostcard={vostcard}
              isSelected={selectedVostcards.has(vostcard.id)}
              onSelect={() => handleSelectVostcard(vostcard.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual vostcard item component
interface VostcardBatchItemProps {
  vostcard: ExtendedVostcard;
  isSelected: boolean;
  onSelect: () => void;
}

const VostcardBatchItem: React.FC<VostcardBatchItemProps> = ({ vostcard, isSelected, onSelect }) => {
  const statusColors = {
    draft: '#ffc107',
    published: '#28a745'
  };

  const statusLabels = {
    draft: 'Draft',
    published: 'Published'
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: isSelected ? '0 4px 20px rgba(0,123,255,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
      border: isSelected ? '2px solid #007bff' : '1px solid #e9ecef',
      overflow: 'hidden',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onClick={onSelect}
    >
      {/* Header with selection checkbox */}
      <div style={{
        padding: '15px',
        backgroundColor: isSelected ? '#e3f2fd' : '#f8f9fa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isSelected ? 
            <FaCheckSquare size={18} color="#007bff" /> : 
            <FaSquare size={18} color="#6c757d" />
          }
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: statusColors[vostcard._batchState],
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {statusLabels[vostcard._batchState]}
          </span>
        </div>

        <div style={{ fontSize: '12px', color: '#6c757d' }}>
          {vostcard.createdAt ? new Date(vostcard.createdAt).toLocaleDateString() : 'Unknown'}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '15px' }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '16px',
          color: '#2c3e50',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {vostcard.title || 'Untitled Vostcard'}
        </h4>

        <p style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          color: '#6c757d',
          lineHeight: 1.4,
          height: '40px',
          overflow: 'hidden'
        }}>
          {vostcard.description || 'No description available'}
        </p>

        {/* Meta info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {vostcard.video && <span>📹 Video</span>}
            {vostcard.photos && vostcard.photos.length > 0 && 
              <span>📸 {vostcard.photos.length} photo{vostcard.photos.length > 1 ? 's' : ''}</span>
            }
          </div>
          
          <div>
            {vostcard.username || 'Unknown User'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchOperations; 