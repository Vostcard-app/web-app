// Debug visibility issue for vostcard: 3a6c5399-37ad-4a86-be94-1ae035961bb9
// Run this in browser console on vostcard.com

async function debugVisibilityIssue() {
  const vostcardId = '3a6c5399-37ad-4a86-be94-1ae035961bb9';
  const projectId = 'vostcard-a3b71';
  
  console.log(`🔍 Debugging visibility issue for: ${vostcardId}`);
  
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
    console.log('   Visibility:', fields.visibility?.stringValue || 'NO VISIBILITY FIELD');
    console.log('   UserID:', fields.userID?.stringValue || 'NO USER ID');
    console.log('   isQuickcard:', fields.isQuickcard?.booleanValue || 'false/undefined');
    console.log('   CreatedAt:', fields.createdAt?.stringValue || 'NO DATE');
    
    console.log('\n🔍 PERSONAL POSTS QUERY REQUIREMENTS:');
    console.log('   The loadPrivateVostcards() function queries for:');
    console.log('   ✅ userID == [your user ID]');
    console.log('   ✅ visibility == "private"');
    
    console.log('\n🔍 ANALYSIS:');
    
    const state = fields.state?.stringValue;
    const visibility = fields.visibility?.stringValue;
    const userID = fields.userID?.stringValue;
    
    // Check each requirement
    if (!userID) {
      console.log('❌ ISSUE: Missing userID - vostcard won\'t show for any user');
    } else {
      console.log('✅ UserID exists:', userID);
    }
    
    if (visibility !== 'private') {
      console.log(`❌ MAIN ISSUE: visibility is "${visibility || 'undefined'}" (should be "private")`);
      console.log('   This is why it\'s not showing in personal posts!');
      console.log('   Personal posts only show vostcards with visibility="private"');
    } else {
      console.log('✅ Visibility is correct: "private"');
    }
    
    if (state !== 'private') {
      console.log(`⚠️  State is "${state}" (usually should be "private" for personal posts)`);
    } else {
      console.log('✅ State is correct: "private"');
    }
    
    console.log('\n🔧 TO FIX:');
    console.log('1. Go to Firebase Console:');
    console.log(`   https://console.firebase.google.com/project/${projectId}/firestore/data/vostcards/${vostcardId}`);
    console.log('2. Set these fields:');
    console.log('   - visibility: "private"');
    console.log('   - state: "private" (if you want it in personal posts)');
    console.log('   - Remove or set isQuickcard: false');
    
    console.log('\n💡 EXPLANATION:');
    console.log('Since this vostcard shows in "Ronan and Jay do Cali" trip view,');
    console.log('it was probably created as part of a shared trip/itinerary.');
    console.log('Trip vostcards often have visibility="public" or "shared"');
    console.log('which excludes them from personal posts.');
    
  } catch (error) {
    console.error('❌ Error debugging visibility:', error);
  }
}

debugVisibilityIssue();

