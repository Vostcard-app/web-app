// Firebase Storage Diagnostic Tool
// Run this in browser console on your live site

console.log('🔍 Starting Firebase Storage Diagnostic...');

// Test function to check storage
async function checkFirebaseStorage() {
  try {
    // Check if Firebase is available
    if (typeof window.firebase === 'undefined') {
      console.error('❌ Firebase not available in window object');
      return;
    }

    const storage = window.firebase.storage();
    const db = window.firebase.firestore();
    
    console.log('✅ Firebase Storage and Firestore initialized');

    // 1. Check storage root folders
    console.log('\n📁 Checking storage structure...');
    
    const rootRef = storage.ref();
    
    try {
      const rootList = await rootRef.listAll();
      console.log('📂 Root folders found:', rootList.prefixes.map(p => p.name));
      
      // Check each folder
      for (const folderRef of rootList.prefixes) {
        try {
          const folderList = await folderRef.listAll();
          console.log(`📁 ${folderRef.name}/: ${folderList.items.length} files, ${folderList.prefixes.length} subfolders`);
          
          // Show first few files as examples
          if (folderList.items.length > 0) {
            const firstFiles = folderList.items.slice(0, 3);
            for (const fileRef of firstFiles) {
              try {
                const metadata = await fileRef.getMetadata();
                const url = await fileRef.getDownloadURL();
                console.log(`  📄 ${fileRef.name}: ${metadata.size} bytes, created: ${metadata.timeCreated}`);
                console.log(`      URL: ${url.substring(0, 100)}...`);
              } catch (e) {
                console.log(`  ❌ ${fileRef.name}: Error getting metadata - ${e.message}`);
              }
            }
          }
        } catch (e) {
          console.log(`❌ Error listing ${folderRef.name}: ${e.message}`);
        }
      }
    } catch (e) {
      console.log('❌ Error listing root storage:', e.message);
    }

    // 2. Check a specific vostcard's photos from database
    console.log('\n🔍 Checking specific vostcard photos...');
    
    try {
      const vostcardRef = db.collection('vostcards').doc('0567819b-4721-45dc-a0ce-6772ccb159ee');
      const vostcardDoc = await vostcardRef.get();
      
      if (vostcardDoc.exists) {
        const data = vostcardDoc.data();
        console.log('📋 Vostcard data found:', {
          title: data.title,
          hasPhotoURLs: !!data.photoURLs,
          photoURLsCount: data.photoURLs?.length || 0,
          hasFirebasePhotoURLs: !!data._firebasePhotoURLs,
          firebasePhotoURLsCount: data._firebasePhotoURLs?.length || 0,
          photoURLs: data.photoURLs,
          _firebasePhotoURLs: data._firebasePhotoURLs
        });

        // Test accessibility of each photo URL
        if (data.photoURLs && data.photoURLs.length > 0) {
          console.log('\n🧪 Testing photo URL accessibility...');
          for (let i = 0; i < data.photoURLs.length; i++) {
            const url = data.photoURLs[i];
            try {
              const response = await fetch(url, { method: 'HEAD' });
              console.log(`📸 Photo ${i + 1}: ${response.status} ${response.statusText}`);
              if (response.status !== 200) {
                console.log(`   URL: ${url}`);
              }
            } catch (e) {
              console.log(`❌ Photo ${i + 1}: Network error - ${e.message}`);
              console.log(`   URL: ${url}`);
            }
          }
        }

        if (data._firebasePhotoURLs && data._firebasePhotoURLs.length > 0) {
          console.log('\n🧪 Testing Firebase photo URL accessibility...');
          for (let i = 0; i < data._firebasePhotoURLs.length; i++) {
            const url = data._firebasePhotoURLs[i];
            try {
              const response = await fetch(url, { method: 'HEAD' });
              console.log(`📸 Firebase Photo ${i + 1}: ${response.status} ${response.statusText}`);
              if (response.status !== 200) {
                console.log(`   URL: ${url}`);
              }
            } catch (e) {
              console.log(`❌ Firebase Photo ${i + 1}: Network error - ${e.message}`);
              console.log(`   URL: ${url}`);
            }
          }
        }
      } else {
        console.log('❌ Vostcard not found in database');
      }
    } catch (e) {
      console.log('❌ Error checking vostcard:', e.message);
    }

    // 3. Test storage permissions
    console.log('\n🔐 Testing storage permissions...');
    
    try {
      // Try to access a storage reference directly
      const testRef = storage.ref('vostcards/test.txt');
      await testRef.getDownloadURL();
      console.log('✅ Storage read permissions working');
    } catch (e) {
      console.log('❌ Storage read permissions failed:', e.message);
      console.log('   This might indicate a permissions or authentication issue');
    }

    console.log('\n✅ Firebase Storage diagnostic complete!');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Run the diagnostic
checkFirebaseStorage();
