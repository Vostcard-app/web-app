// Debug script to compare audio data between two vostcards
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZgXdaZGNqGfJhLCKGWKXqhLhFJhOhKgI",
  authDomain: "vostcard-a3b71.firebaseapp.com",
  projectId: "vostcard-a3b71",
  storageBucket: "vostcard-a3b71.firebasestorage.app",
  messagingSenderId: "1012345678901",
  appId: "1:1012345678901:web:abcdef1234567890abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function compareVostcards() {
  const workingId = 'vostcard_1753814140080'; // Working audio
  const brokenId = 'ITRffMnun1iSTvgfVZSJ';   // No audio

  console.log('🔍 Comparing audio data between vostcards...\n');

  try {
    // Fetch working vostcard
    const workingDoc = await getDoc(doc(db, 'vostcards', workingId));
    const workingData = workingDoc.exists() ? workingDoc.data() : null;

    // Fetch broken vostcard  
    const brokenDoc = await getDoc(doc(db, 'vostcards', brokenId));
    const brokenData = brokenDoc.exists() ? brokenDoc.data() : null;

    if (!workingData || !brokenData) {
      console.error('❌ Could not fetch one or both vostcards');
      return;
    }

    console.log('✅ WORKING VOSTCARD (vostcard_1753814140080):');
    console.log('Audio Fields:', {
      hasAudio: workingData.hasAudio,
      audioURL: workingData.audioURL,
      audioURLs: workingData.audioURLs,
      audioURLsLength: workingData.audioURLs?.length || 0,
      _firebaseAudioURL: workingData._firebaseAudioURL,
      _firebaseAudioURLs: workingData._firebaseAudioURLs,
      audio: !!workingData.audio,
      audioFiles: !!workingData.audioFiles,
      audioLabels: workingData.audioLabels,
      isQuickcard: workingData.isQuickcard
    });

    console.log('\n❌ BROKEN VOSTCARD (ITRffMnun1iSTvgfVZSJ):');
    console.log('Audio Fields:', {
      hasAudio: brokenData.hasAudio,
      audioURL: brokenData.audioURL,
      audioURLs: brokenData.audioURLs,
      audioURLsLength: brokenData.audioURLs?.length || 0,
      _firebaseAudioURL: brokenData._firebaseAudioURL,
      _firebaseAudioURLs: brokenData._firebaseAudioURLs,
      audio: !!brokenData.audio,
      audioFiles: !!brokenData.audioFiles,
      audioLabels: brokenData.audioLabels,
      isQuickcard: brokenData.isQuickcard
    });

    console.log('\n🔍 KEY DIFFERENCES:');
    const differences = [];
    
    if (workingData.hasAudio !== brokenData.hasAudio) {
      differences.push(`hasAudio: ${workingData.hasAudio} vs ${brokenData.hasAudio}`);
    }
    if (!!workingData.audioURL !== !!brokenData.audioURL) {
      differences.push(`audioURL: ${!!workingData.audioURL} vs ${!!brokenData.audioURL}`);
    }
    if ((workingData.audioURLs?.length || 0) !== (brokenData.audioURLs?.length || 0)) {
      differences.push(`audioURLs length: ${workingData.audioURLs?.length || 0} vs ${brokenData.audioURLs?.length || 0}`);
    }
    if (!!workingData._firebaseAudioURL !== !!brokenData._firebaseAudioURL) {
      differences.push(`_firebaseAudioURL: ${!!workingData._firebaseAudioURL} vs ${!!brokenData._firebaseAudioURL}`);
    }

    if (differences.length > 0) {
      differences.forEach(diff => console.log(`  - ${diff}`));
    } else {
      console.log('  No obvious differences found in audio fields');
    }

  } catch (error) {
    console.error('❌ Error comparing vostcards:', error);
  }
}

compareVostcards();
