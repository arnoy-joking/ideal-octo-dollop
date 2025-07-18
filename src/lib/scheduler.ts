import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import type { GenerateScheduleOutput } from '@/lib/types';

const scheduleCollectionName = 'aiSchedules';

export async function getSchedule(userId: string): Promise<GenerateScheduleOutput | null> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    const docSnap = await getDoc(scheduleDocRef);
    if (docSnap.exists()) {
        return docSnap.data().schedule as GenerateScheduleOutput;
    }
    return null;
}

export async function saveSchedule(userId: string, schedule: GenerateScheduleOutput): Promise<void> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    await setDoc(scheduleDocRef, { userId, schedule });
}

export async function deleteSchedule(userId: string): Promise<void> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    await deleteDoc(scheduleDocRef);
}
