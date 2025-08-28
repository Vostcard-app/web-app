// Debug "IN N OUT!!!" not showing in personal posts
// Run this in browser console on vostcard.com

async function debugPersonalPosts() {
  console.log('🔍 Debugging "IN N OUT!!!" personal posts issue...');
  
  const projectId = 'vostcard-a3b71';
  
  try {
    // Get all vostcards
    const vostcardsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/vostcards`;
    const response = await fetch(vostcardsUrl);
    const data = await response.json();
    const documents = data.documents || [];
    
    console.log(`📄 Total vostcards found: ${documents.length}`);
    
    // Look for "IN N OUT!!!" vostcard
    const targetVostcard = documents.find(doc => {
      const title = doc.fields?.title?.stringValue || '';
      return title.toUpperCase().includes('IN N OUT') || 
             title.includes('IN N OUT!!!') ||
             title.toLowerCase().includes('in n out');
    });
    
    if (targetVostcard) {
      const docId = targetVostcard.name.split('/').pop();
      const fields = targetVostcard.fields || {};
      
      console.log('🎯 FOUND "IN N OUT!!!" VOSTCARD:');
      console.log('📋 Document ID:', docId);
      console.log('📋 Title:', fields.title?.stringValue || 'NO TITLE');
      console.log('📋 State:', fields.state?.stringValue || 'NO STATE');
      console.log('📋 Visibility:', fields.visibility?.stringValue || 'NO VISIBILITY');
      console.log('📋 UserID:', fields.userID?.stringValue || 'NO USER ID');
      console.log('📋 isQuickcard:', fields.isQuickcard?.booleanValue || 'false/undefined');
      console.log('📋 CreatedAt:', fields.createdAt?.stringValue || 'NO DATE');
      console.log('📋 UpdatedAt:', fields.updatedAt?.stringValue || 'NO DATE');
      
      // Check what might be wrong
      console.log('\n🔍 DIAGNOSIS:');
      
      const state = fields.state?.stringValue;
      const visibility = fields.visibility?.stringValue;
      const isQuickcard = fields.isQuickcard?.booleanValue;
      
      if (state !== 'private') {
        console.log('❌ ISSUE: State is not "private" - it\'s:', state);
        console.log('   Personal posts only show vostcards with state: "private"');
      }
      
      if (visibility && visibility !== 'private') {
        console.log('❌ ISSUE: Visibility is not "private" - it\'s:', visibility);
        console.log('   Personal posts may filter by visibility: "private"');
      }
      
      if (isQuickcard === true) {
        console.log('❌ ISSUE: isQuickcard flag is still true');
        console.log('   This old flag might be hiding it from personal posts');
      }
      
      if (state === 'private' && (!visibility || visibility === 'private') && !isQuickcard) {
        console.log('✅ All flags look correct - might be a UI filtering issue');
      }
      
      console.log('\n🔧 TO FIX:');
      console.log(`1. Go to Firebase Console → Firestore → vostcards → ${docId}`);
      console.log('2. Set these fields:');
      console.log('   - state: "private"');
      console.log('   - visibility: "private" (or remove this field)');
      console.log('   - isQuickcard: false (or remove this field)');
      
    } else {
      console.log('❌ "IN N OUT!!!" vostcard not found');
      console.log('🔍 Let me show all vostcards with similar titles:');
      
      const similarVostcards = documents.filter(doc => {
        const title = doc.fields?.title?.stringValue || '';
        return title.toLowerCase().includes('in') || 
               title.toLowerCase().includes('out') ||
               title.includes('!!!');
      });
      
      console.log(`📋 Found ${similarVostcards.length} similar vostcards:`);
      similarVostcards.forEach((doc, index) => {
        const docId = doc.name.split('/').pop();
        const title = doc.fields?.title?.stringValue || 'No Title';
        const state = doc.fields?.state?.stringValue || 'NO STATE';
        console.log(`${index + 1}. "${title}" (${state}) - ID: ${docId}`);
      });
    }
    
    // Also check what's actually loading in personal posts
    console.log('\n📱 CHECKING PERSONAL POSTS LOGIC:');
    console.log('Personal posts should show vostcards where:');
    console.log('- state === "private"');
    console.log('- visibility === "private" (or undefined)');
    console.log('- isQuickcard !== true (or undefined)');
    
    const privateVostcards = documents.filter(doc => {
      const state = doc.fields?.state?.stringValue;
      const visibility = doc.fields?.visibility?.stringValue;
      const isQuickcard = doc.fields?.isQuickcard?.booleanValue;
      
      return state === 'private' && 
             (!visibility || visibility === 'private') && 
             isQuickcard !== true;
    });
    
    console.log(`📊 Total vostcards that SHOULD show in personal posts: ${privateVostcards.length}`);
    
  } catch (error) {
    console.error('❌ Error debugging personal posts:', error);
  }
}

debugPersonalPosts();

