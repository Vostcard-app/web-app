// Debug specific vostcard: 3a6c5399-37ad-4a86-be94-1ae035961bb9
// Run this in browser console on vostcard.com

async function debugSpecificVostcard() {
  const vostcardId = '3a6c5399-37ad-4a86-be94-1ae035961bb9';
  const projectId = 'vostcard-a3b71';
  
  console.log(`🔍 Debugging vostcard: ${vostcardId}`);
  
  try {
    // Get the specific document
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/vostcards/${vostcardId}`;
    const response = await fetch(docUrl);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch vostcard: ${response.status} ${response.statusText}`);
      return;
    }
    
    const doc = await response.json();
    const fields = doc.fields || {};
    
    console.log('📋 VOSTCARD DETAILS:');
    console.log('   ID:', vostcardId);
    console.log('   Title:', fields.title?.stringValue || 'NO TITLE');
    console.log('   State:', fields.state?.stringValue || 'NO STATE');
    console.log('   Visibility:', fields.visibility?.stringValue || 'NO VISIBILITY');
    console.log('   UserID:', fields.userID?.stringValue || 'NO USER ID');
    console.log('   isQuickcard:', fields.isQuickcard?.booleanValue || 'false/undefined');
    console.log('   CreatedAt:', fields.createdAt?.stringValue || 'NO DATE');
    console.log('   UpdatedAt:', fields.updatedAt?.stringValue || 'NO DATE');
    console.log('   HasPhotos:', fields.hasPhotos?.booleanValue || 'false/undefined');
    console.log('   PhotoURLs:', fields.photoURLs?.arrayValue?.values?.length || 0, 'photos');
    
    // Analyze what's wrong
    console.log('\n🔍 PERSONAL POSTS REQUIREMENTS:');
    console.log('   ✅ Should have: state = "private"');
    console.log('   ✅ Should have: visibility = "private" (or undefined)');
    console.log('   ✅ Should have: isQuickcard = false (or undefined)');
    console.log('   ✅ Should belong to current user');
    
    console.log('\n🔍 DIAGNOSIS:');
    
    const state = fields.state?.stringValue;
    const visibility = fields.visibility?.stringValue;
    const isQuickcard = fields.isQuickcard?.booleanValue;
    const userID = fields.userID?.stringValue;
    
    let issues = [];
    
    if (state !== 'private') {
      issues.push(`❌ State is "${state}" (should be "private")`);
    } else {
      console.log('✅ State is correct: "private"');
    }
    
    if (visibility && visibility !== 'private') {
      issues.push(`❌ Visibility is "${visibility}" (should be "private" or undefined)`);
    } else {
      console.log('✅ Visibility is correct:', visibility || 'undefined');
    }
    
    if (isQuickcard === true) {
      issues.push('❌ isQuickcard flag is true (should be false or undefined)');
    } else {
      console.log('✅ isQuickcard is correct:', isQuickcard || 'undefined');
    }
    
    if (!userID) {
      issues.push('❌ Missing userID (required for personal posts)');
    } else {
      console.log('✅ UserID exists:', userID);
    }
    
    if (issues.length === 0) {
      console.log('\n🤔 ALL FIELDS LOOK CORRECT!');
      console.log('   This suggests a UI filtering or loading issue.');
      console.log('   Try refreshing the personal posts page.');
    } else {
      console.log('\n🔧 ISSUES FOUND:');
      issues.forEach(issue => console.log('   ' + issue));
      
      console.log('\n🛠️ TO FIX IN FIREBASE CONSOLE:');
      console.log(`1. Go to: https://console.firebase.google.com/project/${projectId}/firestore/data/vostcards/${vostcardId}`);
      console.log('2. Edit the document and set:');
      if (state !== 'private') {
        console.log('   - state: "private"');
      }
      if (visibility && visibility !== 'private') {
        console.log('   - visibility: "private" (or delete this field)');
      }
      if (isQuickcard === true) {
        console.log('   - isQuickcard: false (or delete this field)');
      }
      if (!userID) {
        console.log('   - userID: [your user ID]');
      }
    }
    
    // Also show a direct Firebase Console link
    console.log(`\n🔗 Direct Firebase Console link:`);
    console.log(`https://console.firebase.google.com/project/${projectId}/firestore/data/vostcards/${vostcardId}`);
    
  } catch (error) {
    console.error('❌ Error debugging vostcard:', error);
  }
}

debugSpecificVostcard();

