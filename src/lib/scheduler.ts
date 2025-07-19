
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import type { Schedule } from './types';

const scheduleCollectionName = 'schedules';

export async function getSchedule(userId: string): Promise<Schedule | null> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    const docSnap = await getDoc(scheduleDocRef);
    if (docSnap.exists()) {
        return docSnap.data().schedule as Schedule;
    }
    return null;
}

export async function saveSchedule(userId: string, schedule: Schedule): Promise<void> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    await setDoc(scheduleDocRef, { userId, schedule }, { merge: true });
}

export async function deleteSchedule(userId: string): Promise<void> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    await deleteDoc(scheduleDocRef);
}
