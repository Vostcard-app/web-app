import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaKey, FaUser, FaSearch, FaHome, FaUsers, FaEye, FaSync, FaList } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { storage } from '../firebase/firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import AdminPostViewer from '../components/AdminPostViewer';

const AdminPanel: React.FC = () => {
  const { user, userRole, isAdmin, convertUserToGuide, convertUserToAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [pendingAdvertisers, setPendingAdvertisers] = useState<any[]>([]);
  const [advertisersLoading, setAdvertisersLoading] = useState(false);
  // Music library admin state
  const [uploading, setUploading] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  // Music manager state
  const [tracks, setTracks] = useState<any[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);
  
  // Statistics state
  const [stats, setStats] = useState({
    usersToday: 0,
    usersLastWeek: 0,
    usersTotal: 0,
    vostcardsViewedToday: 0,
    vostcardsViewedLastWeek: 0,
    vostcardsViewedTotal: 0,
    advertisersToday: 0,
    advertisersLastWeek: 0,
    advertisersTotal: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'users' | 'music'>('overview');


  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
    }
  }, [isAdmin, navigate]);

  // Load pending advertiser applications on mount
  useEffect(() => {
    if (isAdmin) {
      loadPendingAdvertisers();
      reloadTracks();
      loadStatistics();
    }
  }, [isAdmin]);

  const reloadTracks = async () => {
    setTracksLoading(true);
    setTracksError(null);
    try {
      const snap = await getDocs(collection(db, 'musicLibrary'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Newest first if createdAt exists
      list.sort((a, b) => (String(b.createdAt || '')).localeCompare(String(a.createdAt || '')));
      setTracks(list);
    } catch (e: any) {
      setTracksError(e?.message || 'Failed to load music library');
    } finally {
      setTracksLoading(false);
    }
  };

  const loadStatistics = async () => {
    setStatsLoading(true);
    try {
      console.log('📊 Loading admin statistics...');
      
      // Calculate date ranges
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStart = new Date(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate());
      
      // Load user statistics
      const usersRef = collection(db, 'users');
      const allUsersSnap = await getDocs(usersRef);
      const usersTotal = allUsersSnap.docs.length;
      
      // Count users signed up today
      const usersTodayQuery = query(usersRef, where('createdAt', '>=', todayStart));
      const usersTodaySnap = await getDocs(usersTodayQuery);
      const usersToday = usersTodaySnap.docs.length;
      
      // Count users signed up in the last week
      const usersLastWeekQuery = query(usersRef, where('createdAt', '>=', weekAgoStart));
      const usersLastWeekSnap = await getDocs(usersLastWeekQuery);
      const usersLastWeek = usersLastWeekSnap.docs.length;
      
      // Load vostcard view statistics
      const vostcardsRef = collection(db, 'vostcards');
      const allVostcardsSnap = await getDocs(vostcardsRef);
      
      // Calculate total views from all vostcards
      let vostcardsViewedTotal = 0;
      let vostcardsViewedToday = 0;
      let vostcardsViewedLastWeek = 0;
      
      allVostcardsSnap.docs.forEach(doc => {
        const data = doc.data();
        const views = data.views || 0;
        vostcardsViewedTotal += views;
        
        // For today and last week views, we'd need view timestamps
        // Since we don't have view tracking by date, we'll use creation dates as approximation
        const createdAt = data.createdAt;
        if (createdAt) {
          let createdDate;
          if (createdAt instanceof Timestamp) {
            createdDate = createdAt.toDate();
          } else if (typeof createdAt === 'string') {
            createdDate = new Date(createdAt);
          } else {
            createdDate = new Date(createdAt);
          }
          
          if (createdDate >= todayStart) {
            vostcardsViewedToday += views;
          }
          if (createdDate >= weekAgoStart) {
            vostcardsViewedLastWeek += views;
          }
        }
      });
      
      // Load advertiser statistics
      const advertisersRef = collection(db, 'advertisers');
      const allAdvertisersSnap = await getDocs(advertisersRef);
      const advertisersTotal = allAdvertisersSnap.docs.length;
      
      // Count advertisers signed up today
      const advertisersTodayQuery = query(advertisersRef, where('createdAt', '>=', todayStart));
      const advertisersTodaySnap = await getDocs(advertisersTodayQuery);
      const advertisersToday = advertisersTodaySnap.docs.length;
      
      // Count advertisers signed up in the last week
      const advertisersLastWeekQuery = query(advertisersRef, where('createdAt', '>=', weekAgoStart));
      const advertisersLastWeekSnap = await getDocs(advertisersLastWeekQuery);
      const advertisersLastWeek = advertisersLastWeekSnap.docs.length;
      
      setStats({
        usersToday,
        usersLastWeek,
        usersTotal,
        vostcardsViewedToday,
        vostcardsViewedLastWeek,
        vostcardsViewedTotal,
        advertisersToday,
        advertisersLastWeek,
        advertisersTotal
      });
      
      console.log('✅ Statistics loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };



  const handleTrackSelection = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
  };

  const handleDeleteChecked = async () => {
    if (selectedTracks.size === 0) {
      alert('No songs selected for deletion');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedTracks.size} selected song(s)? This cannot be undone.`
    );
    
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const deletePromises = Array.from(selectedTracks).map(trackId => 
        deleteDoc(doc(db, 'musicLibrary', trackId))
      );
      
      await Promise.all(deletePromises);
      setSelectedTracks(new Set());
      await reloadTracks();
      
      alert('✅ Selected songs deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting songs:', error);
      alert('Failed to delete songs. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = (track: any) => {
    // If this track is already playing, pause it
    if (playingTrack === track.id && audioRef) {
      audioRef.pause();
      setPlayingTrack(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef) {
      audioRef.pause();
    }

    // Create new audio element and play
    const audio = new Audio(track.url);
    audio.volume = 0.5; // Set volume to 50%
    
    audio.onended = () => {
      setPlayingTrack(null);
      setAudioRef(null);
    };

    audio.onerror = () => {
      alert('Failed to play audio');
      setPlayingTrack(null);
      setAudioRef(null);
    };

    audio.play().then(() => {
      setPlayingTrack(track.id);
      setAudioRef(audio);
    }).catch(() => {
      alert('Failed to play audio');
      setPlayingTrack(null);
      setAudioRef(null);
    });
  };



  const loadPendingAdvertisers = async () => {
    setAdvertisersLoading(true);
    try {
      console.log('🔍 Loading pending advertiser applications...');
      
      // Query the advertisers collection for pending applications
      const advertisersRef = collection(db, 'advertisers');
      const pendingQuery = query(advertisersRef, where('accountStatus', '==', 'pending'));
      const querySnapshot = await getDocs(pendingQuery);
      
      const pending = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));
      
      // Sort by creation date (newest first)
      pending.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setPendingAdvertisers(pending);
      console.log(`✅ Found ${pending.length} pending advertiser applications`);
      
    } catch (error) {
      console.error('❌ Error loading pending advertisers:', error);
    } finally {
      setAdvertisersLoading(false);
    }
  };

  const handleApproveAdvertiser = async (advertiserId: string, advertiserEmail: string) => {
    if (!confirm(`Are you sure you want to approve ${advertiserEmail} as an advertiser?`)) {
      return;
    }
    
    try {
      // Update the advertiser's account status to approved
      const advertiserRef = doc(db, 'advertisers', advertiserId);
      await updateDoc(advertiserRef, {
        accountStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: user?.uid
      });
      
      console.log(`✅ Approved advertiser: ${advertiserEmail}`);
      alert(`Successfully approved ${advertiserEmail} as an advertiser!`);
      
      // Refresh the pending list
      await loadPendingAdvertisers();
      
    } catch (error) {
      console.error('❌ Error approving advertiser:', error);
      alert('Failed to approve advertiser. Please try again.');
    }
  };

  const handleRejectAdvertiser = async (advertiserId: string, advertiserEmail: string) => {
    if (!confirm(`Are you sure you want to reject ${advertiserEmail}'s advertiser application? This will delete their application.`)) {
      return;
    }
    
    try {
      // Delete the advertiser application
      const advertiserRef = doc(db, 'advertisers', advertiserId);
      await deleteDoc(advertiserRef);
      
      console.log(`✅ Rejected advertiser application: ${advertiserEmail}`);
      alert(`Rejected and deleted advertiser application for ${advertiserEmail}.`);
      
      // Refresh the pending list
      await loadPendingAdvertisers();
      
    } catch (error) {
      console.error('❌ Error rejecting advertiser:', error);
      alert('Failed to reject advertiser application. Please try again.');
    }
  };

  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Search users by email or username
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', searchTerm.toLowerCase()));
      const usernameQuery = query(usersRef, where('username', '==', searchTerm));
      
      const [emailResults, usernameResults] = await Promise.all([
        getDocs(emailQuery),
        getDocs(usernameQuery)
      ]);
      
      const allResults = [
        ...emailResults.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...usernameResults.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Remove duplicates
      const uniqueResults = allResults.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
      
      setSearchResults(uniqueResults);
      
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToGuide = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to convert ${userEmail} to a Guide account?`)) {
      return;
    }
    
    try {
      await convertUserToGuide(userId);
      alert(`Successfully converted ${userEmail} to Guide account!`);
      
      // Refresh search results
      await handleSearchUsers();
      
    } catch (err) {
      console.error('Error converting user to Guide:', err);
      alert('Failed to convert user to Guide. Please try again.');
    }
  };

  const handleConvertToAdmin = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to convert ${userEmail} to an Admin account? This will give them full administrative privileges.`)) {
      return;
    }
    
    try {
      await convertUserToAdmin(userId);
      alert(`Successfully converted ${userEmail} to Admin account!`);
      
      // Refresh admin search results
      await handleSearchAdminUsers();
      
    } catch (err) {
      console.error('Error converting user to Admin:', err);
      alert('Failed to convert user to Admin. Please try again.');
    }
  };

  const handleSearchAdminUsers = async () => {
    if (!adminSearchTerm.trim()) return;
    
    setAdminLoading(true);
    setAdminError(null);
    
    try {
      // Search users by email or username (same logic as handleSearchUsers)
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', adminSearchTerm.toLowerCase()));
      const usernameQuery = query(usersRef, where('username', '==', adminSearchTerm));
      
      const [emailResults, usernameResults] = await Promise.all([
        getDocs(emailQuery),
        getDocs(usernameQuery)
      ]);
      
      const allResults = [
        ...emailResults.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...usernameResults.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Remove duplicates
      const uniqueResults = allResults.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
      
      setAdminSearchResults(uniqueResults);
      
    } catch (err) {
      console.error('Error searching users for admin conversion:', err);
      setAdminError('Failed to search users. Please try again.');
    } finally {
      setAdminLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 20px 0', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header banner */}
      <div
        style={{
          background: '#07345c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16
        }}
      >
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
          title="Home"
        >
          <FaHome size={16} />
        </button>
        <h1 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 700 }}>Admin Panel</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid #dee2e6',
        marginBottom: '24px',
        backgroundColor: 'white',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '16px 24px',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid #134369' : '3px solid transparent',
            backgroundColor: activeTab === 'overview' ? '#f8f9fa' : 'white',
            color: activeTab === 'overview' ? '#134369' : '#666',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaEye size={16} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '16px 24px',
            border: 'none',
            borderBottom: activeTab === 'posts' ? '3px solid #134369' : '3px solid transparent',
            backgroundColor: activeTab === 'posts' ? '#f8f9fa' : 'white',
            color: activeTab === 'posts' ? '#134369' : '#666',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaList size={16} />
          All Posts
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '16px 24px',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #134369' : '3px solid transparent',
            backgroundColor: activeTab === 'users' ? '#f8f9fa' : 'white',
            color: activeTab === 'users' ? '#134369' : '#666',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaUsers size={16} />
          User Management
        </button>
        <button
          onClick={() => setActiveTab('music')}
          style={{
            padding: '16px 24px',
            border: 'none',
            borderBottom: activeTab === 'music' ? '3px solid #134369' : '3px solid transparent',
            backgroundColor: activeTab === 'music' ? '#f8f9fa' : 'white',
            color: activeTab === 'music' ? '#134369' : '#666',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🎵
          Music Library
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <AdminPostViewer />
      )}

      {activeTab === 'overview' && (
        <>
          {/* Statistics Dashboard */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', color: '#495057' }}>
            📊 Platform Statistics
          </h2>
          <button
            onClick={loadStatistics}
            disabled={statsLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: statsLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FaSync />
            {statsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading statistics...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* User Statistics */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', color: '#28a745' }}>
                <FaUsers style={{ marginRight: '10px' }} />
                User Signups
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Today:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#28a745' }}>{stats.usersToday.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Last 7 days:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#17a2b8' }}>{stats.usersLastWeek.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Total:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#6f42c1' }}>{stats.usersTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Vostcard View Statistics */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', color: '#fd7e14' }}>
                <FaEye style={{ marginRight: '10px' }} />
                Vostcard Views
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Today:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#28a745' }}>{stats.vostcardsViewedToday.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Last 7 days:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#17a2b8' }}>{stats.vostcardsViewedLastWeek.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Total:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#6f42c1' }}>{stats.vostcardsViewedTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Advertiser Statistics */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', color: '#dc3545' }}>
                🏪 Advertiser Signups
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Today:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#28a745' }}>{stats.advertisersToday.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Last 7 days:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#17a2b8' }}>{stats.advertisersLastWeek.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Total:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#6f42c1' }}>{stats.advertisersTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

        </>
      )}

      {activeTab === 'users' && (
        <>
          {/* 1. Pending Advertiser Applications Section */}
          <div style={{ backgroundColor: '#e8f5e8', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c3e6c3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', color: '#155724' }}>
            🏪 Pending Advertiser Applications
            {pendingAdvertisers.length > 0 && (
              <span style={{
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                marginLeft: '10px'
              }}>
                {pendingAdvertisers.length}
              </span>
            )}
          </h2>
          <button
            onClick={loadPendingAdvertisers}
            disabled={advertisersLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#198754',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: advertisersLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {advertisersLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {advertisersLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading pending applications...
          </div>
        ) : pendingAdvertisers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            ✅ No pending advertiser applications
          </div>
        ) : (
          <div>
            {pendingAdvertisers.map((advertiser) => (
              <div 
                key={advertiser.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #c3e6c3',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#155724' }}>
                      {advertiser.businessName || 'Business Name Not Provided'}
                    </h4>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      <strong>Contact:</strong> {advertiser.contactName || 'N/A'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      <strong>Email:</strong> {advertiser.email || 'N/A'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      <strong>Phone:</strong> {advertiser.phoneNumber || 'N/A'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      <strong>Category:</strong> {advertiser.businessCategory || 'N/A'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      <strong>Description:</strong> {advertiser.businessDescription || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      <strong>Applied:</strong> {advertiser.createdAt ? new Date(advertiser.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApproveAdvertiser(advertiser.id, advertiser.email)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#198754',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectAdvertiser(advertiser.id, advertiser.email)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Convert User to Guide Section */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <FaKey style={{ marginRight: '10px' }} />
          Convert User to Guide
        </h2>
        
        <div style={{ display: 'flex', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by email or username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginRight: '10px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
          />
          <button
            onClick={handleSearchUsers}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <FaSearch style={{ marginRight: '5px' }} />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        {searchResults.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '10px' }}>Search Results:</h3>
            {searchResults.map((user) => (
              <div 
                key={user.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  border: '1px solid #ddd'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    <FaUser style={{ marginRight: '5px' }} />
                    {user.email}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Username: {user.username || 'Not set'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Role: {user.userRole || 'user'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Name: {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.name || 'Not set')}
                  </div>
                </div>
                
                {user.userRole !== 'guide' && (
                  <button
                    onClick={() => handleConvertToGuide(user.id, user.email)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <FaKey style={{ marginRight: '5px' }} />
                    Convert to Guide
                  </button>
                )}
                
                {user.userRole === 'guide' && (
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                    ✅ Guide Account
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Convert User to Admin Section */}
      <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffeaa7' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#856404' }}>
          <FaKey style={{ marginRight: '10px' }} />
          Convert User to Admin
        </h2>
        
        <div style={{ display: 'flex', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by email or username"
            value={adminSearchTerm}
            onChange={(e) => setAdminSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginRight: '10px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchAdminUsers()}
          />
          <button
            onClick={handleSearchAdminUsers}
            disabled={adminLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: adminLoading ? 'not-allowed' : 'pointer'
            }}
          >
            <FaSearch style={{ marginRight: '5px' }} />
            {adminLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {adminError && (
          <div style={{ color: 'red', marginBottom: '15px' }}>
            {adminError}
          </div>
        )}

        {adminSearchResults.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '10px' }}>Search Results:</h3>
            {adminSearchResults.map((user) => (
              <div 
                key={user.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  border: '1px solid #ddd'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    <FaUser style={{ marginRight: '5px' }} />
                    {user.email}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Username: {user.username || 'Not set'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Role: {user.userRole || 'user'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Name: {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.name || 'Not set')}
                  </div>
                </div>
                
                {user.userRole !== 'admin' && (
                  <button
                    onClick={() => handleConvertToAdmin(user.id, user.email)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <FaKey style={{ marginRight: '5px' }} />
                    Convert to Admin
                  </button>
                )}
                
                {user.userRole === 'admin' && (
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                    ✅ Admin Account
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

        </>
      )}

      {activeTab === 'music' && (
        <>
          {/* 4. Music Library (Admin) */}
          <div style={{ backgroundColor: '#eef5ff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #cfe2ff' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#084298' }}>
          🎵 Music Library (Admin)
        </h2>
        
        {/* Choose File and Upload */}
        <div style={{ marginBottom: '30px' }}>
          <input
            type="file"
            accept="audio/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              setUploading(true);
              try {
                const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const path = `library/music/${Date.now()}_${cleanName}`;
                const ref = storageRef(storage, path);
                await uploadBytes(ref, file);
                const url = await getDownloadURL(ref);
                
                const title = file.name.replace(/\.[^/.]+$/, "");
                await addDoc(collection(db, 'musicLibrary'), {
                  title: title,
                  artist: null,
                  url,
                  createdAt: new Date().toISOString(),
                });
                
                await reloadTracks();
                e.target.value = '';
                alert('✅ Music uploaded successfully!');
              } catch (error) {
                console.error('❌ Error uploading music:', error);
                alert('Failed to upload music. Please try again.');
              } finally {
                setUploading(false);
              }
            }}
            style={{ marginBottom: '15px', fontSize: '16px' }}
          />
          <br />
          <button
            disabled={uploading}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1
            }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {/* Songs List */}
        <div style={{ marginBottom: '30px' }}>
          {tracksLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
            </div>
          ) : tracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No songs yet.
            </div>
          ) : (
            <div>
              {tracks.map((track) => (
                <div key={track.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                  <input
                    type="checkbox"
                    checked={selectedTracks.has(track.id)}
                    onChange={() => handleTrackSelection(track.id)}
                    style={{
                      marginRight: '15px',
                      width: '18px',
                      height: '18px'
                    }}
                  />
                  <span style={{ fontSize: '16px', flex: 1 }}>
                    {track.title}
                  </span>
                  <button
                    onClick={() => handlePreview(track)}
                    style={{
                      backgroundColor: playingTrack === track.id ? '#dc3545' : '#007aff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      marginLeft: '10px'
                    }}
                  >
                    {playingTrack === track.id ? 'Stop' : 'Preview'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Section */}
        {tracks.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}>
              Delete Checked Songs
            </div>
            <button
              onClick={handleDeleteChecked}
              disabled={selectedTracks.size === 0 || deleting}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: selectedTracks.size === 0 || deleting ? 'not-allowed' : 'pointer',
                opacity: selectedTracks.size === 0 || deleting ? 0.6 : 1
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>
        </>
      )}

    </div>
  );
};

export default AdminPanel;