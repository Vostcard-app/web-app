import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaKey, FaUser, FaSearch, FaHome } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { storage } from '../firebase/firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';

const AdminPanel: React.FC = () => {
  const { user, userRole, isAdmin, convertUserToGuide, convertUserToAdmin } = useAuth();
  const { cleanupAllQuickcards } = useVostcard();
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
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  // Music manager state
  const [tracks, setTracks] = useState<any[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);
  // Quickcard cleanup state
  const [cleanupLoading, setCleanupLoading] = useState(false);
  // Invalid posts cleanup state
  const [invalidPostsCleanupLoading, setInvalidPostsCleanupLoading] = useState(false);
  // Orphaned posts fix state
  const [orphanedPostsFixLoading, setOrphanedPostsFixLoading] = useState(false);
  // Quickcard to vostcard migration state
  const [quickcardMigrationLoading, setQuickcardMigrationLoading] = useState(false);
  // Jay Bond userRole fix state
  const [jayBondRoleFixLoading, setJayBondRoleFixLoading] = useState(false);
  // Photo URL regeneration state
  const [photoUrlFixLoading, setPhotoUrlFixLoading] = useState(false);
  // Avatar URL regeneration state
  const [avatarUrlFixLoading, setAvatarUrlFixLoading] = useState(false);


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

  const handleCleanupQuickcards = async () => {
    if (!window.confirm('⚠️ This will permanently delete ALL quickcards from Firebase. This action cannot be undone. Are you sure?')) {
      return;
    }

    setCleanupLoading(true);
    try {
      console.log('🗑️ Starting quickcard cleanup from Admin Panel...');
      const result = await cleanupAllQuickcards();
      
      if (result.errors > 0) {
        alert(`⚠️ Cleanup completed with some errors. Deleted: ${result.deleted}, Errors: ${result.errors}. Check console for details.`);
      } else {
        alert(`✅ Quickcard cleanup successful! Deleted ${result.deleted} quickcards.`);
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      alert('❌ Quickcard cleanup failed. Check console for details.');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupInvalidPosts = async () => {
    if (!window.confirm('⚠️ This will delete all posts missing critical data (no title, userID, or location). Are you sure?')) {
      return;
    }

    setInvalidPostsCleanupLoading(true);
    let deleted = 0;
    let errors = 0;

    try {
      console.log('🗑️ Starting invalid posts cleanup...');
      
      // Query for all posted vostcards
      const q = query(
        collection(db, 'vostcards'),
        where('state', '==', 'posted')
      );
      
      const snapshot = await getDocs(q);
      console.log(`📋 Found ${snapshot.docs.length} posted vostcards to check`);
      
      // Check each post for validity
      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data();
          
          // Check if post is invalid (missing critical data)
          const isInvalid = !data.id || 
                           !data.title || 
                           !data.userID || 
                           (!data.latitude && !data.longitude);
          
          if (isInvalid) {
            console.log(`🗑️ Deleting invalid post: "${data.title || 'NO_TITLE'}" (${docSnapshot.id})`);
            console.log('   Missing:', {
              id: !data.id,
              title: !data.title,
              userID: !data.userID,
              location: !data.latitude && !data.longitude
            });
            
            await deleteDoc(docSnapshot.ref);
            deleted++;
          }
        } catch (error) {
          console.error(`❌ Failed to process post ${docSnapshot.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Invalid posts cleanup completed! Deleted: ${deleted}, Errors: ${errors}`);
      
      if (errors > 0) {
        alert(`⚠️ Cleanup completed with some errors. Deleted: ${deleted}, Errors: ${errors}. Check console for details.`);
      } else {
        alert(`✅ Invalid posts cleanup successful! Deleted ${deleted} invalid posts.`);
      }
    } catch (error) {
      console.error('❌ Invalid posts cleanup failed:', error);
      alert('❌ Invalid posts cleanup failed. Check console for details.');
    } finally {
      setInvalidPostsCleanupLoading(false);
    }
  };

  // Fix orphaned Jay Bond posts
  const handleFixOrphanedJayBondPosts = async () => {
    if (!window.confirm('🔧 This will assign all orphaned vostcards (missing userID) to Jay Bond. Continue?')) {
      return;
    }

    setOrphanedPostsFixLoading(true);
    let fixed = 0;
    let errors = 0;
    const JAY_BOND_USER_ID = '9byLf32ls0gF2nzF17vnv9RhLiJ2';

    try {
      console.log('🔧 Starting orphaned Jay Bond posts fix...');
      
      // Query for all posted vostcards
      const q = query(
        collection(db, 'vostcards'),
        where('state', '==', 'posted')
      );
      
      const snapshot = await getDocs(q);
      console.log(`📋 Found ${snapshot.docs.length} posted vostcards to check`);
      
      // Check each post for missing userID
      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data();
          
          // Check if post is orphaned (missing userID)
          const isOrphaned = !data.userID || data.userID === '';
          
          if (isOrphaned) {
            console.log(`🔧 Fixing orphaned post: "${data.title || 'NO_TITLE'}" (${docSnapshot.id})`);
            
            // Get current timestamp
            const now = new Date();
            const timestamp = now.toISOString();
            
            // Update the post with Jay Bond's info and proper dates
            const updateData: any = {
              userID: JAY_BOND_USER_ID,
              username: 'Jay Bond',
              updatedAt: timestamp
            };
            
            // Add missing dates if they don't exist
            if (!data.createdAt) {
              updateData.createdAt = timestamp;
              console.log(`  📅 Adding missing createdAt: ${timestamp}`);
            }
            if (!data.postedAt) {
              updateData.postedAt = timestamp;
              console.log(`  📅 Adding missing postedAt: ${timestamp}`);
            }
            
            await updateDoc(docSnapshot.ref, updateData);
            
            fixed++;
          }
        } catch (error) {
          console.error(`❌ Failed to process post ${docSnapshot.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Orphaned posts fix completed! Fixed: ${fixed}, Errors: ${errors}`);
      
      if (fixed > 0) {
        alert(`✅ Successfully fixed ${fixed} orphaned posts! They should now show up for Jay Bond.`);
      } else if (errors > 0) {
        alert(`⚠️ Fix completed with ${errors} errors. Check console for details.`);
      } else {
        alert('ℹ️ No orphaned posts found to fix.');
      }
      
    } catch (error) {
      console.error('❌ Orphaned posts fix failed:', error);
      alert('❌ Orphaned posts fix failed. Check console for details.');
    } finally {
      setOrphanedPostsFixLoading(false);
    }
  };

  // Global quickcard to vostcard migration
  const handleQuickcardToVostcardMigration = async () => {
    if (!window.confirm('🔄 This will convert ALL quickcard references to vostcard format globally. This includes:\n\n• Removing isQuickcard flags\n• Converting quickcard_ IDs to vostcard format\n• Updating all quickcard references\n\nThis is a MAJOR database change. Continue?')) {
      return;
    }

    setQuickcardMigrationLoading(true);
    let migrated = 0;
    let errors = 0;

    try {
      console.log('🔄 Starting global quickcard to vostcard migration...');
      
      // Query for all documents with quickcard references
      const q = query(collection(db, 'vostcards'));
      const snapshot = await getDocs(q);
      console.log(`📋 Found ${snapshot.docs.length} total vostcards to check`);
      
      // Process each document
      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data();
          let needsUpdate = false;
          const updateData: any = {};
          
          // Check if this is a quickcard that needs migration
          if (data.isQuickcard === true) {
            console.log(`🔄 Migrating quickcard: "${data.title || 'NO_TITLE'}" (${docSnapshot.id})`);
            
            // Remove quickcard flag
            updateData.isQuickcard = false;
            needsUpdate = true;
            console.log(`  ✅ Removing isQuickcard flag`);
          }
          
          // Convert quickcard_ ID to proper vostcard ID
          if (data.id && data.id.includes('quickcard_')) {
            const newId = data.id.replace('quickcard_', 'vostcard_');
            updateData.id = newId;
            needsUpdate = true;
            console.log(`  🔄 Converting ID: ${data.id} → ${newId}`);
          }
          
          // Ensure it has proper vostcard properties
          if (needsUpdate) {
            // Set as regular vostcard
            updateData.type = 'vostcard';
            updateData.migrated = true;
            updateData.migratedAt = new Date().toISOString();
            
            // Ensure proper dates exist
            if (!data.createdAt) {
              updateData.createdAt = new Date().toISOString();
              console.log(`  📅 Adding missing createdAt`);
            }
            if (!data.postedAt && data.state === 'posted') {
              updateData.postedAt = new Date().toISOString();
              console.log(`  📅 Adding missing postedAt`);
            }
            
            // Update the document
            await updateDoc(docSnapshot.ref, updateData);
            migrated++;
            console.log(`  ✅ Migration completed for ${docSnapshot.id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to migrate document ${docSnapshot.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Global migration completed! Migrated: ${migrated}, Errors: ${errors}`);
      
      if (migrated > 0) {
        alert(`✅ Successfully migrated ${migrated} quickcards to vostcard format! All quickcard references have been converted.`);
      } else if (errors > 0) {
        alert(`⚠️ Migration completed with ${errors} errors. Check console for details.`);
      } else {
        alert('ℹ️ No quickcards found that needed migration.');
      }
      
    } catch (error) {
      console.error('❌ Global quickcard migration failed:', error);
      alert('❌ Global quickcard migration failed. Check console for details.');
    } finally {
      setQuickcardMigrationLoading(false);
    }
  };

  // Fix Jay Bond userRole to guide
  const handleFixJayBondUserRole = async () => {
    if (!window.confirm('🔧 This will update ALL vostcards created by Jay Bond to have userRole: "guide". Continue?')) {
      return;
    }

    setJayBondRoleFixLoading(true);
    let fixed = 0;
    let errors = 0;
    const JAY_BOND_USER_ID = '9byLf32ls0gF2nzF17vnv9RhLiJ2';

    try {
      console.log('🔧 Starting Jay Bond userRole fix...');
      
      // Query for all vostcards created by Jay Bond
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', JAY_BOND_USER_ID)
      );
      
      const snapshot = await getDocs(q);
      console.log(`📋 Found ${snapshot.docs.length} vostcards created by Jay Bond to check`);
      
      // Check each vostcard for incorrect userRole
      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data();
          
          // Check if userRole needs to be fixed
          const needsRoleFix = data.userRole !== 'guide';
          
          if (needsRoleFix) {
            console.log(`🔧 Fixing userRole for vostcard: "${data.title || 'NO_TITLE'}" (${docSnapshot.id})`);
            console.log(`  Current userRole: ${data.userRole} → guide`);
            
            // Update the vostcard with correct userRole
            const updateData: any = {
              userRole: 'guide',
              username: 'Jay Bond', // Ensure username is also correct
              updatedAt: new Date().toISOString()
            };
            
            await updateDoc(docSnapshot.ref, updateData);
            
            fixed++;
            console.log(`  ✅ Fixed userRole for ${docSnapshot.id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to process vostcard ${docSnapshot.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Jay Bond userRole fix completed! Fixed: ${fixed}, Errors: ${errors}`);
      
      if (fixed > 0) {
        alert(`✅ Successfully fixed userRole for ${fixed} Jay Bond vostcards! They should now show as guide content.`);
      } else if (errors > 0) {
        alert(`⚠️ Fix completed with ${errors} errors. Check console for details.`);
      } else {
        alert('ℹ️ All Jay Bond vostcards already have correct userRole: guide.');
      }
      
    } catch (error) {
      console.error('❌ Jay Bond userRole fix failed:', error);
      alert('❌ Jay Bond userRole fix failed. Check console for details.');
    } finally {
      setJayBondRoleFixLoading(false);
    }
  };

  // Regenerate photo URLs with smart path discovery
  const handleRegeneratePhotoUrls = async () => {
    if (!window.confirm('🔧 This will scan ALL storage folders to find orphaned photos and reconnect them to vostcards. This fixes database/storage mismatches. Continue?')) {
      return;
    }

    setPhotoUrlFixLoading(true);
    let fixed = 0;
    let errors = 0;
    let scanned = 0;

    try {
      console.log('🔧 Starting smart photo URL regeneration...');
      
      // Step 1: Build a map of all storage files
      console.log('📁 Step 1: Scanning all storage folders...');
      const vostcardsStorageRef = storageRef(storage, 'vostcards');
      const userFolders = await listAll(vostcardsStorageRef);
      
      const storageFileMap = new Map<string, string[]>(); // vostcardId -> [photoURLs]
      
      for (const userFolder of userFolders.prefixes) {
        try {
          const vostcardFolders = await listAll(userFolder);
          
          for (const vostcardFolder of vostcardFolders.prefixes) {
            const vostcardId = vostcardFolder.name.split('/').pop();
            if (!vostcardId) continue;
            
            try {
              const files = await listAll(vostcardFolder);
              const photoURLs: string[] = [];
              
              // Sort files by name for consistent order
              const sortedFiles = files.items.sort((a, b) => a.name.localeCompare(b.name));
              
              for (const file of sortedFiles) {
                if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                  try {
                    const downloadURL = await getDownloadURL(file);
                    photoURLs.push(downloadURL);
                  } catch (urlError) {
                    console.log(`  ❌ Failed to get URL for ${file.fullPath}`);
                  }
                }
              }
              
              if (photoURLs.length > 0) {
                storageFileMap.set(vostcardId, photoURLs);
                console.log(`📸 Found ${photoURLs.length} photos for ${vostcardId}`);
              }
            } catch (e) {
              console.log(`  ❌ Error scanning ${vostcardFolder.fullPath}`);
            }
          }
        } catch (e) {
          console.log(`  ❌ Error scanning user folder ${userFolder.fullPath}`);
        }
      }
      
      console.log(`📊 Storage scan complete: Found photos for ${storageFileMap.size} vostcards`);
      
      // Step 2: Update database with found photos
      console.log('💾 Step 2: Updating database with found photos...');
      
      const q = query(collection(db, 'vostcards'));
      const snapshot = await getDocs(q);
      console.log(`📋 Found ${snapshot.docs.length} vostcards in database`);
      
      for (const docSnapshot of snapshot.docs) {
        try {
          scanned++;
          const data = docSnapshot.data();
          const vostcardId = docSnapshot.id;
          
          console.log(`🔍 ${scanned}/${snapshot.docs.length}: Checking "${data.title || 'NO_TITLE'}" (${vostcardId})`);
          
          // Check if we have photos for this vostcard in storage
          const foundPhotos = storageFileMap.get(vostcardId);
          
          if (foundPhotos && foundPhotos.length > 0) {
            // Check if database needs updating
            const currentPhotos = data.photoURLs || [];
            const needsUpdate = currentPhotos.length === 0 || 
                               currentPhotos.length !== foundPhotos.length ||
                               !currentPhotos.every((url: string) => foundPhotos.includes(url));
            
            if (needsUpdate) {
              const updateData: any = {
                photoURLs: foundPhotos,
                _firebasePhotoURLs: foundPhotos,
                updatedAt: new Date().toISOString(),
                photoUrlsRegeneratedAt: new Date().toISOString()
              };
              
              await updateDoc(docSnapshot.ref, updateData);
              
              fixed++;
              console.log(`  ✅ Updated with ${foundPhotos.length} photo URLs`);
            } else {
              console.log(`  ℹ️ Already has correct photo URLs`);
            }
          } else {
            console.log(`  ⚠️ No photos found in storage`);
          }
        } catch (error) {
          console.error(`❌ Failed to process vostcard ${docSnapshot.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Smart photo URL regeneration completed!`);
      console.log(`   Scanned: ${scanned} vostcards`);
      console.log(`   Fixed: ${fixed} vostcards`);
      console.log(`   Errors: ${errors}`);
      
      if (fixed > 0) {
        alert(`✅ Successfully reconnected photos for ${fixed} vostcards! Images should now load properly.`);
      } else if (errors > 0) {
        alert(`⚠️ Regeneration completed with ${errors} errors. Check console for details.`);
      } else {
        alert('ℹ️ All vostcards already have correct photo URLs.');
      }
      
    } catch (error) {
      console.error('❌ Smart photo URL regeneration failed:', error);
      alert('❌ Photo URL regeneration failed. Check console for details.');
    } finally {
      setPhotoUrlFixLoading(false);
    }
  };

  // Regenerate avatar URLs for users
  const handleRegenerateAvatarUrls = async () => {
    if (!window.confirm('🔧 This will scan avatar storage and regenerate avatar URLs for all users. Continue?')) {
      return;
    }

    setAvatarUrlFixLoading(true);
    let fixed = 0;
    let errors = 0;

    try {
      console.log('🔧 Starting avatar URL regeneration...');
      
      // Step 1: Scan avatar storage
      console.log('📁 Step 1: Scanning avatar storage...');
      const avatarsStorageRef = storageRef(storage, 'avatars');
      const avatarFiles = await listAll(avatarsStorageRef);
      
      const avatarMap = new Map<string, string>(); // userId -> avatarURL
      
      // Process direct avatar files (e.g., userId.jpg)
      for (const file of avatarFiles.items) {
        if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const userId = file.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
          try {
            const downloadURL = await getDownloadURL(file);
            avatarMap.set(userId, downloadURL);
            console.log(`📸 Found avatar for user: ${userId}`);
          } catch (e) {
            console.log(`❌ Failed to get URL for ${file.name}`);
          }
        }
      }
      
      // Process avatar folders (e.g., userId/avatar.jpg)
      for (const folder of avatarFiles.prefixes) {
        const userId = folder.name.split('/').pop();
        if (!userId) continue;
        
        try {
          const userAvatarFiles = await listAll(folder);
          if (userAvatarFiles.items.length > 0) {
            // Get the most recent avatar file
            const sortedFiles = userAvatarFiles.items.sort((a, b) => b.name.localeCompare(a.name));
            const latestAvatar = sortedFiles[0];
            
            if (latestAvatar.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              try {
                const downloadURL = await getDownloadURL(latestAvatar);
                avatarMap.set(userId, downloadURL);
                console.log(`📸 Found avatar for user: ${userId} (from folder)`);
              } catch (e) {
                console.log(`❌ Failed to get URL for ${latestAvatar.fullPath}`);
              }
            }
          }
        } catch (e) {
          console.log(`❌ Error scanning avatar folder for ${userId}`);
        }
      }
      
      console.log(`📊 Avatar scan complete: Found avatars for ${avatarMap.size} users`);
      
      // Step 2: Update user profiles with avatar URLs
      console.log('💾 Step 2: Updating user profiles...');
      
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      console.log(`👥 Found ${usersSnapshot.docs.length} users in database`);
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData = userDoc.data();
          const userId = userDoc.id;
          const currentAvatarURL = userData.avatarURL;
          const foundAvatarURL = avatarMap.get(userId);
          
          console.log(`👤 Checking user: ${userData.username || userData.email || userId}`);
          
          if (foundAvatarURL) {
            if (!currentAvatarURL || currentAvatarURL !== foundAvatarURL) {
              await updateDoc(userDoc.ref, {
                avatarURL: foundAvatarURL,
                avatarUpdatedAt: new Date().toISOString()
              });
              
              fixed++;
              console.log(`  ✅ Updated avatar URL`);
            } else {
              console.log(`  ℹ️ Avatar URL already correct`);
            }
          } else {
            console.log(`  ⚠️ No avatar found in storage`);
          }
        } catch (error) {
          console.error(`❌ Failed to process user ${userDoc.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Avatar URL regeneration completed!`);
      console.log(`   Fixed: ${fixed} users`);
      console.log(`   Errors: ${errors}`);
      
      if (fixed > 0) {
        alert(`✅ Successfully updated avatar URLs for ${fixed} users!`);
      } else if (errors > 0) {
        alert(`⚠️ Avatar regeneration completed with ${errors} errors. Check console for details.`);
      } else {
        alert('ℹ️ All users already have correct avatar URLs.');
      }
      
    } catch (error) {
      console.error('❌ Avatar URL regeneration failed:', error);
      alert('❌ Avatar URL regeneration failed. Check console for details.');
    } finally {
      setAvatarUrlFixLoading(false);
    }
  };

  const searchForDocument = async (docId: string) => {
    try {
      console.log(`🔍 Searching for document: ${docId}`);
      
      // Check vostcards collection
      const vostcardRef = doc(db, 'vostcards', docId);
      const vostcardSnap = await getDoc(vostcardRef);
      
      if (vostcardSnap.exists()) {
        console.log(`✅ Found in vostcards:`, vostcardSnap.data());
        alert(`✅ Found in vostcards collection: ${JSON.stringify(vostcardSnap.data(), null, 2)}`);
      } else {
        console.log(`❌ Not found in vostcards collection`);
      }
      
      // Check if there are similar IDs in vostcards
      const vostcardsQuery = query(collection(db, 'vostcards'));
      const vostcardsSnapshot = await getDocs(vostcardsQuery);
      
             let similarDocs: Array<{ id: string; collection: string; data: any }> = [];
       vostcardsSnapshot.docs.forEach(doc => {
         if (doc.id.includes('6212fd87') || doc.id.includes(docId.substring(0, 8))) {
           similarDocs.push({ id: doc.id, collection: 'vostcards', data: doc.data() });
         }
       });
      
      if (similarDocs.length > 0) {
        console.log(`🔍 Found ${similarDocs.length} similar documents:`, similarDocs);
        alert(`🔍 Found ${similarDocs.length} similar documents: ${JSON.stringify(similarDocs.map(d => ({id: d.id, title: d.data.title})), null, 2)}`);
      } else {
        alert(`❌ No documents found with ID: ${docId}`);
      }
      
    } catch (error) {
      console.error('❌ Error searching for document:', error);
      alert(`❌ Error searching: ${error}`);
    }
  };

  const forceDeleteDocument = async (docId: string) => {
    try {
      console.log(`🗑️ Force deleting document: ${docId}`);
      
      // Try to delete from vostcards
      const vostcardRef = doc(db, 'vostcards', docId);
      await deleteDoc(vostcardRef);
      console.log(`✅ Deleted from vostcards`);
      
      // Also check and delete from any metadata collections
      try {
        const metadataRef = doc(db, 'vostcardMetadata', docId);
        await deleteDoc(metadataRef);
        console.log(`✅ Deleted from vostcardMetadata`);
      } catch (e) {
        console.log(`ℹ️ No metadata document found`);
      }
      
      alert(`✅ Force delete completed for: ${docId}`);
      
    } catch (error) {
      console.error('❌ Error force deleting:', error);
      alert(`❌ Error force deleting: ${error}`);
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

      {/* 3. Quickcard Cleanup (Admin) */}
      <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffeaa7' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#856404' }}>
          🗑️ Quickcard Cleanup
        </h2>
        
        <div style={{ marginBottom: '15px', color: '#856404' }}>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Warning:</strong> This action will permanently delete ALL remaining quickcards from the Firebase database.
          </p>
          <p style={{ margin: '0 0 10px 0' }}>
            Use this only if quickcards have been migrated to vostcards and should no longer exist.
          </p>
        </div>
        
        <button
          onClick={handleCleanupQuickcards}
          disabled={cleanupLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: cleanupLoading ? '#6c757d' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: cleanupLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!cleanupLoading) {
              e.currentTarget.style.backgroundColor = '#c82333';
            }
          }}
          onMouseLeave={(e) => {
            if (!cleanupLoading) {
              e.currentTarget.style.backgroundColor = '#dc3545';
            }
          }}
        >
          {cleanupLoading ? '🔄 Cleaning up...' : '🗑️ Delete All Quickcards'}
        </button>
      </div>

      {/* 4. Invalid Posts Cleanup (Admin) */}
      <div style={{ backgroundColor: '#ffe6e6', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffb3b3' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#cc0000' }}>
          🧹 Invalid Posts Cleanup
        </h2>
        
        <div style={{ marginBottom: '15px', color: '#cc0000' }}>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Warning:</strong> This will delete all posts that are missing critical data.
          </p>
          <p style={{ margin: '0 0 10px 0' }}>
            Posts will be deleted if they're missing: title, userID, or location data.
          </p>
          <p style={{ margin: '0 0 10px 0' }}>
            This should fix "vostcard not found" errors caused by corrupted posts.
          </p>
        </div>
        
        <button
          onClick={handleCleanupInvalidPosts}
          disabled={invalidPostsCleanupLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: invalidPostsCleanupLoading ? '#6c757d' : '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: invalidPostsCleanupLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!invalidPostsCleanupLoading) {
              e.currentTarget.style.backgroundColor = '#cc0000';
            }
          }}
          onMouseLeave={(e) => {
            if (!invalidPostsCleanupLoading) {
              e.currentTarget.style.backgroundColor = '#ff4444';
            }
          }}
        >
          {invalidPostsCleanupLoading ? '🔄 Cleaning up...' : '🧹 Delete Invalid Posts'}
        </button>
      </div>

      {/* 4.5. Fix Orphaned Jay Bond Posts */}
      <div style={{ backgroundColor: '#fff8e1', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffcc02' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#f57c00' }}>
          🔧 Fix Orphaned Jay Bond Posts
        </h2>
        <p style={{ marginBottom: '15px', color: '#555' }}>
          <strong>Found 11 posts with invalid data?</strong> This will assign all orphaned vostcards (missing userID) to Jay Bond and add missing dates so they show up properly.
        </p>
        <button
          onClick={handleFixOrphanedJayBondPosts}
          disabled={orphanedPostsFixLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: orphanedPostsFixLoading ? '#6c757d' : '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: orphanedPostsFixLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!orphanedPostsFixLoading) {
              e.currentTarget.style.backgroundColor = '#f57c00';
            }
          }}
          onMouseLeave={(e) => {
            if (!orphanedPostsFixLoading) {
              e.currentTarget.style.backgroundColor = '#ff9800';
            }
          }}
        >
          {orphanedPostsFixLoading ? '🔄 Fixing...' : '🔧 Fix Jay Bond Posts'}
        </button>
      </div>

      {/* 4.6. Global Quickcard to Vostcard Migration */}
      <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #9c27b0' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#7b1fa2' }}>
          🔄 Global Quickcard Migration
        </h2>
        <p style={{ marginBottom: '15px', color: '#555' }}>
          <strong>⚠️ MAJOR DATABASE CHANGE:</strong> This will globally convert ALL quickcard references to proper vostcard format:
        </p>
        <ul style={{ marginBottom: '15px', color: '#555', paddingLeft: '20px' }}>
          <li>Remove <code>isQuickcard: true</code> flags</li>
          <li>Convert <code>quickcard_</code> IDs to <code>vostcard_</code> format</li>
          <li>Add missing dates (createdAt, postedAt)</li>
          <li>Set proper vostcard properties</li>
        </ul>
        <button
          onClick={handleQuickcardToVostcardMigration}
          disabled={quickcardMigrationLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: quickcardMigrationLoading ? '#6c757d' : '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: quickcardMigrationLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!quickcardMigrationLoading) {
              e.currentTarget.style.backgroundColor = '#7b1fa2';
            }
          }}
          onMouseLeave={(e) => {
            if (!quickcardMigrationLoading) {
              e.currentTarget.style.backgroundColor = '#9c27b0';
            }
          }}
        >
          {quickcardMigrationLoading ? '🔄 Migrating...' : '🔄 Migrate All Quickcards'}
        </button>
      </div>

      {/* 4.7. Fix Jay Bond UserRole */}
      <div style={{ backgroundColor: '#e8f5e8', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #28a745' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#155724' }}>
          🎯 Fix Jay Bond UserRole
        </h2>
        <p style={{ marginBottom: '15px', color: '#555' }}>
          <strong>Data Cleanup:</strong> This will update ALL vostcards created by Jay Bond to have the correct <code>userRole: "guide"</code> instead of <code>userRole: "user"</code>.
        </p>
        <ul style={{ marginBottom: '15px', color: '#555', paddingLeft: '20px' }}>
          <li>Find all vostcards with <code>userID: "9byLf32ls0gF2nzF17vnv9RhLiJ2"</code> (Jay Bond)</li>
          <li>Update <code>userRole</code> from <code>"user"</code> to <code>"guide"</code></li>
          <li>Ensure <code>username: "Jay Bond"</code> is correct</li>
          <li>This will make Jay Bond's content show with guide pins and styling</li>
        </ul>
        <button
          onClick={handleFixJayBondUserRole}
          disabled={jayBondRoleFixLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: jayBondRoleFixLoading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: jayBondRoleFixLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!jayBondRoleFixLoading) {
              e.currentTarget.style.backgroundColor = '#1e7e34';
            }
          }}
          onMouseLeave={(e) => {
            if (!jayBondRoleFixLoading) {
              e.currentTarget.style.backgroundColor = '#28a745';
            }
          }}
        >
          {jayBondRoleFixLoading ? '🔄 Fixing...' : '🎯 Fix Jay Bond UserRole'}
        </button>
      </div>

      {/* 4.8. Regenerate Photo URLs */}
      <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ff9800' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#e65100' }}>
          📸 Regenerate Photo URLs
        </h2>
        <p style={{ marginBottom: '15px', color: '#555' }}>
          <strong>🔧 Smart Photo Recovery:</strong> This will scan ALL storage folders to find orphaned photos and reconnect them to vostcards. Fixes database/storage mismatches.
        </p>
        <ul style={{ marginBottom: '15px', color: '#555', paddingLeft: '20px' }}>
          <li><strong>Step 1:</strong> Scan all storage folders to build a map of existing photos</li>
          <li><strong>Step 2:</strong> Match photos to vostcards by ID (ignores userID mismatches)</li>
          <li><strong>Step 3:</strong> Generate fresh download URLs with current tokens</li>
          <li><strong>Step 4:</strong> Update database with correct <code>photoURLs</code></li>
          <li>This fixes HTTP 412 errors AND database/storage mismatches</li>
        </ul>
        <div style={{ backgroundColor: '#ffecb3', padding: '10px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #ffc107' }}>
          <strong>⚠️ Note:</strong> This process may take several minutes for large numbers of vostcards.
        </div>
        <button
          onClick={handleRegeneratePhotoUrls}
          disabled={photoUrlFixLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: photoUrlFixLoading ? '#6c757d' : '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: photoUrlFixLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!photoUrlFixLoading) {
              e.currentTarget.style.backgroundColor = '#f57c00';
            }
          }}
          onMouseLeave={(e) => {
            if (!photoUrlFixLoading) {
              e.currentTarget.style.backgroundColor = '#ff9800';
            }
          }}
        >
          {photoUrlFixLoading ? '🔄 Regenerating URLs...' : '📸 Regenerate All Photo URLs'}
        </button>
      </div>

      {/* 5. Music Library (Admin) */}
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

      {/* 4. Convert User to Admin Section */}
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

    </div>
  );
};

export default AdminPanel;
