import { db } from './firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

const goalsCollectionName = 'userGoals';

export async function getGoals(userId: string): Promise<string> {
    const goalsDocRef = doc(db, goalsCollectionName, userId);
    const docSnap = await getDoc(goalsDocRef);
    if (docSnap.exists()) {
        return docSnap.data().goals || '';
    }
    return '';
}

export async function saveGoals(userId: string, goals: string): Promise<void> {
    const goalsDocRef = doc(db, goalsCollectionName, userId);
    await setDoc(goalsDocRef, { userId, goals }, { merge: true });
}
