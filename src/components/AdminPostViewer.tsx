import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { FaSearch, FaFilter, FaFlag, FaEye, FaTrash, FaUser, FaMapMarkerAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa';

interface PostData {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  creatorName?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  visibility: 'public' | 'personal';
  flagged?: boolean;
  flagCount?: number;
  flagReasons?: string[];
  createdAt: any;
  updatedAt?: any;
  type: 'vostcard' | 'offer' | 'tour';
  imageURLs?: string[];
  tags?: string[];
}

interface FilterOptions {
  searchTerm: string;
  area: string;
  user: string;
  visibility: 'all' | 'public' | 'personal';
  flagged: 'all' | 'flagged' | 'unflagged';
  postType: 'all' | 'vostcard' | 'offer';
  sortBy: 'newest' | 'oldest' | 'flagged' | 'location';
}

const AdminPostViewer: React.FC = () => {
  console.log('🚀 AdminPostViewer component rendered');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    area: '',
    user: '',
    visibility: 'all',
    flagged: 'all',
    postType: 'all',
    sortBy: 'newest'
  });

  // Load all posts from different collections
  useEffect(() => {
    loadAllPosts();
  }, []);

  // Apply filters whenever filters or posts change
  useEffect(() => {
    applyFilters();
  }, [filters, posts]);

  const loadAllPosts = async () => {
    setLoading(true);
    console.log('🔍 AdminPostViewer: Starting to load all posts...');
    console.log('🔗 Firebase db instance:', db);
    try {
      const allPosts: PostData[] = [];

      // Load Vostcards
      console.log('📋 Loading vostcards...');
      try {
        // Try with orderBy first, fallback to simple query if it fails
        let vostcardsSnapshot;
        try {
          const vostcardsQuery = query(collection(db, 'vostcards'), orderBy('createdAt', 'desc'));
          vostcardsSnapshot = await getDocs(vostcardsQuery);
        } catch (orderError) {
          console.warn('⚠️ OrderBy failed for vostcards, using simple query:', orderError);
          vostcardsSnapshot = await getDocs(collection(db, 'vostcards'));
        }
        console.log(`📋 Found ${vostcardsSnapshot.docs.length} vostcards`);
        
        if (vostcardsSnapshot.docs.length > 0) {
          console.log('📋 Sample vostcard data:', vostcardsSnapshot.docs[0].data());
        }
      
      for (const docSnap of vostcardsSnapshot.docs) {
        const data = docSnap.data();
        console.log(`📋 Processing vostcard ${docSnap.id} by creator ${data.creatorId}`);
        const creatorDoc = await getDoc(doc(db, 'users', data.creatorId));
        const creatorData = creatorDoc.data();
        if (!creatorData) {
          console.warn(`⚠️ Creator data not found for user ${data.creatorId}`);
        }
        
        allPosts.push({
          id: docSnap.id,
          title: data.title || 'Untitled Vostcard',
          description: data.description || '',
          creatorId: data.creatorId,
          creatorUsername: creatorData?.username || 'Unknown User',
          creatorName: creatorData?.displayName || creatorData?.name || creatorData?.firstName && creatorData?.lastName 
            ? `${creatorData.firstName} ${creatorData.lastName}` : undefined,
          location: data.location,
          visibility: data.visibility || 'public',
          flagged: data.flagged || false,
          flagCount: data.flagCount || 0,
          flagReasons: data.flagReasons || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          type: 'vostcard',
          imageURLs: data.imageURLs || [],
          tags: data.tags || []
        });
      }
      } catch (vostcardsError) {
        console.error('❌ Error loading vostcards:', vostcardsError);
      }

      // Load Offers
      console.log('🎁 Loading offers...');
      try {
        // Try with orderBy first, fallback to simple query if it fails
        let offersSnapshot;
        try {
          const offersQuery = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
          offersSnapshot = await getDocs(offersQuery);
        } catch (orderError) {
          console.warn('⚠️ OrderBy failed for offers, using simple query:', orderError);
          offersSnapshot = await getDocs(collection(db, 'offers'));
        }
        console.log(`🎁 Found ${offersSnapshot.docs.length} offers`);
        
        if (offersSnapshot.docs.length > 0) {
          console.log('🎁 Sample offer data:', offersSnapshot.docs[0].data());
        }
      
      for (const docSnap of offersSnapshot.docs) {
        const data = docSnap.data();
        console.log(`🎁 Processing offer ${docSnap.id} by creator ${data.creatorId}`);
        const creatorDoc = await getDoc(doc(db, 'users', data.creatorId));
        const creatorData = creatorDoc.data();
        if (!creatorData) {
          console.warn(`⚠️ Creator data not found for user ${data.creatorId}`);
        }
        
        allPosts.push({
          id: docSnap.id,
          title: data.title || 'Untitled Offer',
          description: data.description || '',
          creatorId: data.creatorId,
          creatorUsername: creatorData?.username || 'Unknown User',
          creatorName: creatorData?.displayName || creatorData?.name || creatorData?.firstName && creatorData?.lastName 
            ? `${creatorData.firstName} ${creatorData.lastName}` : undefined,
          location: data.location,
          visibility: data.visibility || 'public',
          flagged: data.flagged || false,
          flagCount: data.flagCount || 0,
          flagReasons: data.flagReasons || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          type: 'offer',
          imageURLs: data.imageURLs || [],
          tags: data.tags || []
        });
      }
      } catch (offersError) {
        console.error('❌ Error loading offers:', offersError);
      }

      // Skip guided tours - focus on vostcards as main content
      console.log('ℹ️ Skipping guided tours - focusing on vostcards as main content');

      setPosts(allPosts);
      console.log(`✅ Loaded ${allPosts.length} total posts`);
      console.log('📊 Posts breakdown:', {
        vostcards: allPosts.filter(p => p.type === 'vostcard').length,
        offers: allPosts.filter(p => p.type === 'offer').length
      });
    } catch (error) {
      console.error('❌ Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...posts];

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchLower) ||
        post.description.toLowerCase().includes(searchLower) ||
        post.creatorUsername.toLowerCase().includes(searchLower) ||
        post.creatorName?.toLowerCase().includes(searchLower) ||
        post.location?.address?.toLowerCase().includes(searchLower)
      );
    }

    // Area filter
    if (filters.area) {
      const areaLower = filters.area.toLowerCase();
      filtered = filtered.filter(post => 
        post.location?.address?.toLowerCase().includes(areaLower)
      );
    }

    // User filter
    if (filters.user) {
      const userLower = filters.user.toLowerCase();
      filtered = filtered.filter(post => 
        post.creatorUsername.toLowerCase().includes(userLower) ||
        post.creatorName?.toLowerCase().includes(userLower)
      );
    }

    // Visibility filter
    if (filters.visibility !== 'all') {
      filtered = filtered.filter(post => post.visibility === filters.visibility);
    }

    // Flagged filter
    if (filters.flagged === 'flagged') {
      filtered = filtered.filter(post => post.flagged);
    } else if (filters.flagged === 'unflagged') {
      filtered = filtered.filter(post => !post.flagged);
    }

    // Post type filter
    if (filters.postType !== 'all') {
      filtered = filtered.filter(post => post.type === filters.postType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return a.createdAt?.toDate() - b.createdAt?.toDate();
        case 'flagged':
          return (b.flagCount || 0) - (a.flagCount || 0);
        case 'location':
          return (a.location?.address || '').localeCompare(b.location?.address || '');
        case 'newest':
        default:
          return b.createdAt?.toDate() - a.createdAt?.toDate();
      }
    });

    setFilteredPosts(filtered);
  };

  const handleFlagPost = async (post: PostData) => {
    try {
      const collection_name = post.type === 'vostcard' ? 'vostcards' : 
                             post.type === 'offer' ? 'offers' : 'guidedTours';
      
      await updateDoc(doc(db, collection_name, post.id), {
        flagged: !post.flagged,
        flagCount: post.flagged ? Math.max(0, (post.flagCount || 1) - 1) : (post.flagCount || 0) + 1,
        flagReasons: post.flagged ? [] : [...(post.flagReasons || []), 'Admin flagged']
      });

      // Update local state
      setPosts(posts.map(p => p.id === post.id ? {
        ...p,
        flagged: !p.flagged,
        flagCount: p.flagged ? Math.max(0, (p.flagCount || 1) - 1) : (p.flagCount || 0) + 1
      } : p));

      console.log(`✅ ${post.flagged ? 'Unflagged' : 'Flagged'} post: ${post.title}`);
    } catch (error) {
      console.error('❌ Error flagging post:', error);
    }
  };

  const handleDeletePost = async (post: PostData) => {
    if (!confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const collection_name = post.type === 'vostcard' ? 'vostcards' : 
                             post.type === 'offer' ? 'offers' : 'guidedTours';
      
      await deleteDoc(doc(db, collection_name, post.id));

      // Update local state
      setPosts(posts.filter(p => p.id !== post.id));
      setSelectedPost(null);

      console.log(`✅ Deleted post: ${post.title}`);
    } catch (error) {
      console.error('❌ Error deleting post:', error);
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'vostcard': return '#134369';
      case 'offer': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading all posts...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#134369'
          }}>
            Admin Post Viewer
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            color: '#666',
            fontSize: '14px'
          }}>
            {filteredPosts.length} of {posts.length} posts
          </p>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '8px 16px',
            backgroundColor: showFilters ? '#134369' : 'white',
            color: showFilters ? 'white' : '#134369',
            border: `2px solid #134369`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          <FaFilter size={12} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            {/* Search Term */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' }}>
                Search Posts
              </label>
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '14px' }} />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  placeholder="Search title, description, user..."
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 36px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Area Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' }}>
                Filter by Area
              </label>
              <input
                type="text"
                value={filters.area}
                onChange={(e) => setFilters({...filters, area: e.target.value})}
                placeholder="Enter location..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* User Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' }}>
                Filter by User
              </label>
              <input
                type="text"
                value={filters.user}
                onChange={(e) => setFilters({...filters, user: e.target.value})}
                placeholder="Enter username or name..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            {/* Visibility Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' }}>
                Visibility
              </label>
              <select
                value={filters.visibility}
                onChange={(e) => setFilters({...filters, visibility: e.target.value as any})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Posts</option>
                <option value="public">Public Only</option>
                <option value="personal">Personal Only</option>
              </select>
            </div>

            {/* Flagged Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' }}>
                Flag Status
              </label>
              <select
                value={filters.flagged}
                onChange={(e) => setFilters({...filters, flagged: e.target.value as any})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Posts</option>
                <option value="flagged">Flagged Only</option>
                <option value="unflagged">Unflagged Only</option>
              </select>
            </div>

            {/* Post Type Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' }}>
                Post Type
              </label>
              <select
                value={filters.postType}
                onChange={(e) => setFilters({...filters, postType: e.target.value as any})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Types</option>
                <option value="vostcard">Vostcards</option>
                <option value="offer">Offers</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' }}>
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="flagged">Most Flagged</option>
                <option value="location">By Location</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {filteredPosts.map(post => (
          <div
            key={post.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: post.flagged ? '#fff5f5' : 'white',
              borderLeft: `4px solid ${getPostTypeColor(post.type)}`,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              ':hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }
            }}
            onClick={() => setSelectedPost(post)}
          >
            {/* Post Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    backgroundColor: getPostTypeColor(post.type),
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {post.type}
                  </span>
                  {post.visibility === 'personal' && (
                    <span style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      PERSONAL
                    </span>
                  )}
                  {post.flagged && (
                    <span style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <FaFlag size={8} />
                      FLAGGED ({post.flagCount || 1})
                    </span>
                  )}
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  lineHeight: '1.3'
                }}>
                  {post.title}
                </h3>
              </div>
            </div>

            {/* Post Content */}
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {post.description}
            </p>

            {/* Post Meta */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12px',
              color: '#888',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaUser size={10} />
                {post.creatorName || post.creatorUsername}
              </div>
              {post.location?.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaMapMarkerAlt size={10} />
                  {post.location.address.substring(0, 30)}...
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaClock size={10} />
                {formatDate(post.createdAt)}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPost(post);
                }}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: '#134369',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <FaEye size={10} />
                View
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlagPost(post);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: post.flagged ? '#28a745' : '#ffc107',
                  color: post.flagged ? 'white' : '#000',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FaFlag size={10} />
                {post.flagged ? 'Unflag' : 'Flag'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePost(post);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FaTrash size={10} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredPosts.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#666'
        }}>
          <FaExclamationTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px 0' }}>No posts found</h3>
          <p style={{ margin: 0 }}>Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    backgroundColor: getPostTypeColor(selectedPost.type),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {selectedPost.type}
                  </span>
                  {selectedPost.flagged && (
                    <span style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <FaFlag size={10} />
                      FLAGGED
                    </span>
                  )}
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#333'
                }}>
                  {selectedPost.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Post Details */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div>
                  <strong>Creator:</strong><br />
                  {selectedPost.creatorName || selectedPost.creatorUsername}
                </div>
                <div>
                  <strong>Created:</strong><br />
                  {formatDate(selectedPost.createdAt)}
                </div>
                <div>
                  <strong>Visibility:</strong><br />
                  <span style={{
                    textTransform: 'capitalize',
                    color: selectedPost.visibility === 'personal' ? '#6c757d' : '#28a745'
                  }}>
                    {selectedPost.visibility}
                  </span>
                </div>
                {selectedPost.location?.address && (
                  <div>
                    <strong>Location:</strong><br />
                    {selectedPost.location.address}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>Description:</strong>
                <p style={{
                  margin: '8px 0 0 0',
                  lineHeight: '1.6',
                  color: '#666'
                }}>
                  {selectedPost.description}
                </p>
              </div>

              {selectedPost.flagged && selectedPost.flagReasons && selectedPost.flagReasons.length > 0 && (
                <div style={{
                  backgroundColor: '#fff5f5',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <strong style={{ color: '#dc3545' }}>Flag Reasons:</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    {selectedPost.flagReasons.map((reason, index) => (
                      <li key={index} style={{ color: '#666' }}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Images */}
              {selectedPost.imageURLs && selectedPost.imageURLs.length > 0 && (
                <div>
                  <strong>Images:</strong>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    {selectedPost.imageURLs.slice(0, 4).map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Post image ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => handleFlagPost(selectedPost)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedPost.flagged ? '#28a745' : '#ffc107',
                  color: selectedPost.flagged ? 'white' : '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaFlag size={12} />
                {selectedPost.flagged ? 'Unflag Post' : 'Flag Post'}
              </button>
              <button
                onClick={() => handleDeletePost(selectedPost)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaTrash size={12} />
                Delete Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPostViewer;
