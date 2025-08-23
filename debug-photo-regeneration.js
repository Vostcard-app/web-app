// Debug version of photo URL regeneration
// Run this in browser console to see what's happening

console.log('🔍 Debug: Photo URL Regeneration Process');

async function debugPhotoRegeneration() {
  const projectId = 'vostcard-a3b71';
  
  try {
    console.log('📋 Step 1: Fetching vostcards from database...');
    
    // Get first 10 vostcards to test
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/vostcards?pageSize=10`;
    const response = await fetch(firestoreUrl);
    
    if (!response.ok) {
      console.log('❌ Failed to fetch vostcards from database');
      return;
    }
    
    const data = await response.json();
    const vostcards = data.documents || [];
    
    console.log(`✅ Found ${vostcards.length} vostcards to check`);
    
    let processedCount = 0;
    let hasStorageFiles = 0;
    let hasPhotoURLs = 0;
    let needsRegeneration = 0;
    
    for (const doc of vostcards) {
      const vostcardId = doc.name.split('/').pop();
      const fields = doc.fields || {};
      const title = fields.title?.stringValue || 'NO_TITLE';
      const userID = fields.userID?.stringValue;
      const photoURLs = fields.photoURLs?.arrayValue?.values || [];
      
      processedCount++;
      
      console.log(`\n📄 ${processedCount}. ${title} (${vostcardId})`);
      console.log(`   UserID: ${userID || 'MISSING'}`);
      console.log(`   Current photo URLs: ${photoURLs.length}`);
      
      if (photoURLs.length > 0) {
        hasPhotoURLs++;
        
        // Test if current URLs work
        const firstUrl = photoURLs[0].stringValue;
        try {
          const urlTest = await fetch(firstUrl, { method: 'HEAD' });
          console.log(`   URL test: ${urlTest.status} ${urlTest.statusText}`);
          
          if (urlTest.status !== 200) {
            needsRegeneration++;
            console.log(`   ❌ Needs regeneration`);
          } else {
            console.log(`   ✅ URLs working`);
          }
        } catch (e) {
          needsRegeneration++;
          console.log(`   ❌ URL error: ${e.message}`);
        }
      }
      
      // Check if files exist in storage (simulate what the function does)
      if (userID) {
        console.log(`   🔍 Checking storage path: vostcards/${userID}/${vostcardId}/`);
        
        // Test if we can construct a storage URL
        const storageBaseUrl = 'https://firebasestorage.googleapis.com/v0/b/vostcard-a3b71.firebasestorage.app/o';
        const testPath = `vostcards%2F${userID}%2F${vostcardId}%2Fphoto1.jpg`;
        const testUrl = `${storageBaseUrl}/${testPath}?alt=media`;
        
        try {
          const storageTest = await fetch(testUrl, { method: 'HEAD' });
          console.log(`   Storage test: ${storageTest.status} ${storageTest.statusText}`);
          
          if (storageTest.status === 200) {
            hasStorageFiles++;
            console.log(`   ✅ Files found in storage`);
          } else {
            console.log(`   ❌ No files in storage`);
          }
        } catch (e) {
          console.log(`   ❌ Storage error: ${e.message}`);
        }
      } else {
        console.log(`   ⚠️ No userID - cannot check storage`);
      }
    }
    
    console.log(`\n📊 Debug Summary:`);
    console.log(`   Processed: ${processedCount} vostcards`);
    console.log(`   Have photo URLs: ${hasPhotoURLs}`);
    console.log(`   Have storage files: ${hasStorageFiles}`);
    console.log(`   Need regeneration: ${needsRegeneration}`);
    console.log(`\n💡 The regeneration function only processes vostcards that:`);
    console.log(`   1. Have a userID`);
    console.log(`   2. Have files in storage`);
    console.log(`   3. Need URL updates`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugPhotoRegeneration();
