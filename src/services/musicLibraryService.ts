import { collection, getDocs } from 'firebase/firestore';
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


