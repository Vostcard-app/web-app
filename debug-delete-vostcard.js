// Debug utility to force delete a problematic vostcard
// Usage: Run this in browser console on the vostcard app

async function forceDeleteVostcard(vostcardId) {
  console.log(`🗑️ Starting force delete for vostcard: ${vostcardId}`);
  
  const results = {
    indexedDB: false,
    firebase: false,
    localStorage: false,
    errors: []
  };

  // 1. Delete from IndexedDB
  try {
    console.log('🔍 Attempting IndexedDB deletion...');
    
    // Open IndexedDB
    const dbRequest = indexedDB.open('VostcardDB', 3);
    
    await new Promise((resolve, reject) => {
      dbRequest.onsuccess = async (event) => {
        const db = event.target.result;
        
        try {
          const transaction = db.transaction(['vostcards'], 'readwrite');
          const store = transaction.objectStore('vostcards');
          const deleteRequest = store.delete(vostcardId);
          
          deleteRequest.onsuccess = () => {
            console.log('✅ Deleted from IndexedDB');
            results.indexedDB = true;
            resolve();
          };
          
          deleteRequest.onerror = () => {
            console.log('❌ IndexedDB delete failed:', deleteRequest.error);
            results.errors.push(`IndexedDB: ${deleteRequest.error}`);
            resolve(); // Continue even if this fails
          };
        } catch (error) {
          console.log('❌ IndexedDB transaction error:', error);
          results.errors.push(`IndexedDB transaction: ${error.message}`);
          resolve();
        }
      };
      
      dbRequest.onerror = () => {
        console.log('❌ Could not open IndexedDB:', dbRequest.error);
        results.errors.push(`IndexedDB open: ${dbRequest.error}`);
        resolve();
      };
    });
  } catch (error) {
    console.log('❌ IndexedDB error:', error);
    results.errors.push(`IndexedDB: ${error.message}`);
  }

  // 2. Delete from Firebase (requires Firebase to be available)
  try {
    console.log('🔍 Attempting Firebase deletion...');
    
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      const db = firebase.firestore();
      
      // Try both collections
      await Promise.allSettled([
        db.collection('vostcards').doc(vostcardId).delete(),
        // Also try private collection if user is available
        ...(firebase.auth().currentUser ? [
          db.collection('privateVostcards').doc(firebase.auth().currentUser.uid).collection('vostcards').doc(vostcardId).delete()
        ] : [])
      ]);
      
      console.log('✅ Firebase deletion attempted');
      results.firebase = true;
    } else {
      console.log('⚠️ Firebase not available in global scope');
      results.errors.push('Firebase not available');
    }
  } catch (error) {
    console.log('❌ Firebase error:', error);
    results.errors.push(`Firebase: ${error.message}`);
  }

  // 3. Clean up localStorage references
  try {
    console.log('🔍 Cleaning localStorage...');
    
    // Add to deleted list
    const deletedVostcards = JSON.parse(localStorage.getItem('deleted_vostcards') || '[]');
    if (!deletedVostcards.includes(vostcardId)) {
      deletedVostcards.push(vostcardId);
      localStorage.setItem('deleted_vostcards', JSON.stringify(deletedVostcards));
    }
    
    // Remove from any cached lists
    const cachedKeys = Object.keys(localStorage).filter(key => 
      key.includes('vostcard') || key.includes('saved') || key.includes('posted')
    );
    
    cachedKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(data)) {
          const filtered = data.filter(item => 
            typeof item === 'object' ? item.id !== vostcardId : item !== vostcardId
          );
          if (filtered.length !== data.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
            console.log(`✅ Removed from localStorage key: ${key}`);
          }
        }
      } catch (e) {
        // Skip non-JSON items
      }
    });
    
    results.localStorage = true;
    console.log('✅ localStorage cleaned');
  } catch (error) {
    console.log('❌ localStorage error:', error);
    results.errors.push(`localStorage: ${error.message}`);
  }

  // 4. Force refresh any React state (if possible)
  try {
    console.log('🔍 Attempting to trigger React refresh...');
    
    // Try to trigger a storage event
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'vostcard_deleted',
      newValue: vostcardId,
      url: window.location.href
    }));
    
    // Try to trigger a custom event
    window.dispatchEvent(new CustomEvent('vostcard-deleted', {
      detail: { vostcardId }
    }));
    
    console.log('✅ Refresh events dispatched');
  } catch (error) {
    console.log('❌ Refresh error:', error);
    results.errors.push(`Refresh: ${error.message}`);
  }

  console.log('🏁 Force delete completed:', results);
  
  return results;
}

// Usage instructions
console.log(`
🗑️ VOSTCARD FORCE DELETE UTILITY
================================

To delete the problematic vostcard, run:

forceDeleteVostcard('fdf1678b-ca1d-4466-888d-bb0394dae0c4')

This will attempt to remove it from:
- IndexedDB
- Firebase (both collections)
- localStorage caches
- Trigger React state refresh

After running, refresh the page to see if the vostcard is gone.
`);

// Auto-run for the specific vostcard
console.log('🚀 Auto-running for vostcard: fdf1678b-ca1d-4466-888d-bb0394dae0c4');
forceDeleteVostcard('fdf1678b-ca1d-4466-888d-bb0394dae0c4');
