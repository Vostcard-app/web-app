// Find Quickcard 8/17/2025 ID
// Run this in your browser console on vostcard.com

async function findQuickcardId() {
  console.log('🔍 Searching for "Quickcard 8/17/2025"...');
  
  const projectId = 'vostcard-a3b71';
  
  try {
    // Search in private vostcards collection
    const privateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/vostcards`;
    const response = await fetch(privateUrl);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch vostcards:', response.status);
      return;
    }
    
    const data = await response.json();
    const documents = data.documents || [];
    
    console.log(`📄 Found ${documents.length} total vostcards`);
    
    // Look for the specific vostcard
    const targetVostcard = documents.find(doc => {
      const title = doc.fields?.title?.stringValue || '';
      const isQuickcard = doc.fields?.isQuickcard?.booleanValue;
      
      return title.includes('Quickcard 8/17/2025') || 
             title.includes('8/17/2025') ||
             (title.toLowerCase().includes('quickcard') && title.includes('8/17'));
    });
    
    if (targetVostcard) {
      const docId = targetVostcard.name.split('/').pop();
      const title = targetVostcard.fields?.title?.stringValue || 'No Title';
      const isQuickcard = targetVostcard.fields?.isQuickcard?.booleanValue;
      const createdAt = targetVostcard.fields?.createdAt?.stringValue;
      
      console.log('🎯 FOUND IT!');
      console.log('📋 Vostcard Details:');
      console.log(`   ID: ${docId}`);
      console.log(`   Title: "${title}"`);
      console.log(`   isQuickcard: ${isQuickcard}`);
      console.log(`   Created: ${createdAt}`);
      console.log('');
      console.log('🔧 To fix manually, update this document:');
      console.log(`   Document ID: ${docId}`);
      console.log('   Set: isQuickcard = false (or remove the field)');
      
      return docId;
    } else {
      console.log('❌ Vostcard not found. Let me show all vostcards with "quickcard" in title:');
      
      const quickcardVostcards = documents.filter(doc => {
        const title = doc.fields?.title?.stringValue || '';
        const isQuickcard = doc.fields?.isQuickcard?.booleanValue;
        return title.toLowerCase().includes('quickcard') || isQuickcard === true;
      });
      
      console.log(`📋 Found ${quickcardVostcards.length} vostcards with quickcard references:`);
      quickcardVostcards.forEach((doc, index) => {
        const docId = doc.name.split('/').pop();
        const title = doc.fields?.title?.stringValue || 'No Title';
        const isQuickcard = doc.fields?.isQuickcard?.booleanValue;
        const createdAt = doc.fields?.createdAt?.stringValue;
        
        console.log(`${index + 1}. ID: ${docId}`);
        console.log(`   Title: "${title}"`);
        console.log(`   isQuickcard: ${isQuickcard}`);
        console.log(`   Created: ${createdAt}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error searching for vostcard:', error);
  }
}

// Run the search
findQuickcardId();

