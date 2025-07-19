<<<<<<< HEAD
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import type { GenerateScheduleOutput } from '@/lib/types';

const scheduleCollectionName = 'aiSchedules';

export async function getSchedule(userId: string): Promise<GenerateScheduleOutput | null> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    const docSnap = await getDoc(scheduleDocRef);
    if (docSnap.exists()) {
        return docSnap.data().schedule as GenerateScheduleOutput;
=======

import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import type { Schedule } from './types';

const scheduleCollectionName = 'schedules';

export async function getSchedule(userId: string): Promise<Schedule | null> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    const docSnap = await getDoc(scheduleDocRef);
    if (docSnap.exists()) {
        return docSnap.data().schedule as Schedule;
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
    }
    return null;
}

<<<<<<< HEAD
export async function saveSchedule(userId: string, schedule: GenerateScheduleOutput): Promise<void> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    await setDoc(scheduleDocRef, { userId, schedule });
=======
export async function saveSchedule(userId: string, schedule: Schedule): Promise<void> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    await setDoc(scheduleDocRef, { userId, schedule }, { merge: true });
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
}

export async function deleteSchedule(userId: string): Promise<void> {
    const scheduleDocRef = doc(db, scheduleCollectionName, userId);
    await deleteDoc(scheduleDocRef);
}
