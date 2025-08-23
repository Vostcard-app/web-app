// Check user profiles for Jay Bond vs Jay N Bond
console.log('🔍 Checking user profiles...');

async function checkUserProfiles() {
  const projectId = 'vostcard-a3b71';
  
  // Jay Bond's user ID
  const jayBondUserId = '9byLf32ls0gF2nzF17vnv9RhLiJ2';
  
  try {
    // Get Jay Bond's profile
    const jayBondUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${jayBondUserId}`;
    const jayBondResponse = await fetch(jayBondUrl);
    
    if (jayBondResponse.ok) {
      const jayBondData = await jayBondResponse.json();
      console.log('👤 Jay Bond Profile:', {
        username: jayBondData.fields?.username?.stringValue,
        email: jayBondData.fields?.email?.stringValue,
        hasAvatarURL: git push origin mainjayBondData.fields?.avatarURL?.stringValue,
        avatarURL: jayBondData.fields?.avatarURL?.stringValue
      });
    } else {
      console.log('❌ Could not fetch Jay Bond profile');
    }
    
    // Search for Jay N Bond by username
    console.log('
🔍 Searching for Jay N Bond...');
    const usersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`;
    const usersResponse = await fetch(usersUrl);
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      const users = usersData.documents || [];
      
      const jayNBond = users.find(user => 
        user.fields?.username?.stringValue?.includes('Jay N Bond')
      );
      
      if (jayNBond) {
        const jayNBondUserId = jayNBond.name.split('/').pop();
        console.log('👤 Jay N Bond Profile:', {
          userId: jayNBondUserId,
          username: jayNBond.fields?.username?.stringValue,
          email: jayNBond.fields?.email?.stringValue,
          hasAvatarURL: git push origin mainjayNBond.fields?.avatarURL?.stringValue,
          avatarURL: jayNBond.fields?.avatarURL?.stringValue
        });
        
        // Test both avatar URLs
        if (jayBondData.fields?.avatarURL?.stringValue) {
          console.log('
🧪 Testing Jay Bond avatar URL...');
          try {
            const response = await fetch(jayBondData.fields.avatarURL.stringValue, { method: 'HEAD' });
            console.log(`Jay Bond avatar: ${response.status} ${response.statusText}`);
          } catch (e) {
            console.log(`Jay Bond avatar error: ${e.message}`);
          }
        }
        
        if (jayNBond.fields?.avatarURL?.stringValue) {
          console.log('
🧪 Testing Jay N Bond avatar URL...');
          try {
            const response = await fetch(jayNBond.fields.avatarURL.stringValue, { method: 'HEAD' });
            console.log(`Jay N Bond avatar: ${response.status} ${response.statusText}`);
          } catch (e) {
            console.log(`Jay N Bond avatar error: ${e.message}`);
          }
        }
      } else {
        console.log('❌ Jay N Bond profile not found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserProfiles();
