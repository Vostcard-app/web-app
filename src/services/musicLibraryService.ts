import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export type MusicTrack = {
  id: string;
  title: string;
  artist?: string;
  url: string;
  durationSec?: number;
  tags?: string[];
  license?: string;
};

export async function getMusicLibrary(): Promise<MusicTrack[]> {
  const snap = await getDocs(collection(db, 'musicLibrary'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MusicTrack, 'id'>) }));
}

export async function addMusicTrack(track: Omit<MusicTrack, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'musicLibrary'), track);
  return docRef.id;
}

export async function deleteMusicTrack(trackId: string): Promise<void> {
  await deleteDoc(doc(db, 'musicLibrary', trackId));
}


