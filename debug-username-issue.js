// Debug username display issue for vostcard_1756071373296
async function debugUsernameIssue() {
  const vostcardId = 'vostcard_1756071373296';
  const projectId = 'vostcard-a3b71';
  
  console.log(`🔍 Debugging username issue for: ${vostcardId}`);
  
  try {
    // Get the vostcard document
    const vostcardUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/vostcards/${vostcardId}`;
    const vostcardResponse = await fetch(vostcardUrl);
    
    if (vostcardResponse.ok) {
      const vostcardDoc = await vostcardResponse.json();
      const fields = vostcardDoc.fields || {};
      
      console.log('📋 VOSTCARD DETAILS:');
      console.log('   Title:', fields.title?.stringValue || 'NO TITLE');
      console.log('   UserID:', fields.userID?.stringValue || 'NO USER ID');
      console.log('   Creator Name:', fields.creatorName?.stringValue || 'NO CREATOR NAME');
      console.log('   User Role:', fields.userRole?.stringValue || 'NO USER ROLE');
      
      const userId = fields.userID?.stringValue;
      
      if (userId) {
        console.log(`\n👤 Checking user profile for: ${userId}`);
        
        // Get the user profile
        const userUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
        const userResponse = await fetch(userUrl);
        
        if (userResponse.ok) {
          const userDoc = await userResponse.json();
          const userFields = userDoc.fields || {};
          
          console.log('📋 USER PROFILE DETAILS:');
          console.log('   Username:', userFields.username?.stringValue || 'NO USERNAME');
          console.log('   Email:', userFields.email?.stringValue || 'NO EMAIL');
          console.log('   Display Name:', userFields.displayName?.stringValue || 'NO DISPLAY NAME');
          console.log('   First Name:', userFields.firstName?.stringValue || 'NO FIRST NAME');
          console.log('   Last Name:', userFields.lastName?.stringValue || 'NO LAST NAME');
          
          console.log('\n🔍 DIAGNOSIS:');
          if (!userFields.username?.stringValue) {
            console.log('❌ ISSUE: User profile missing username field');
            console.log('   This causes the app to fall back to email display');
          }
          
          if (!userFields.displayName?.stringValue) {
            console.log('❌ ISSUE: User profile missing displayName field');
          }
          
          console.log(`\n🔧 TO FIX: Go to Firebase Console → users → ${userId}`);
          console.log('Set: username = "Proper Display Name"');
          console.log('Set: displayName = "Proper Display Name"');
          
        } else {
          console.log('❌ Could not fetch user profile');
        }
      } else {
        console.log('❌ No userID found in vostcard');
      }
      
    } else {
      console.log('❌ Could not fetch vostcard');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUsernameIssue();
