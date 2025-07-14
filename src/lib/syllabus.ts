import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import type { MonthlyGoal } from './types';

const syllabusProgressCollectionName = 'syllabusProgress';
const monthlyGoalCollectionName = 'monthlyGoals';

export async function getCompletedChapters(userId: string): Promise<string[]> {
    const docRef = doc(db, syllabusProgressCollectionName, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data().completedChapterIds || [];
    }
    return [];
}

export async function saveCompletedChapters(userId: string, completedChapterIds: string[]): Promise<void> {
    const docRef = doc(db, syllabusProgressCollectionName, userId);
    await setDoc(docRef, { completedChapterIds }, { merge: true });
}

export async function getMonthlyGoal(userId: string): Promise<MonthlyGoal | null> {
    const docRef = doc(db, monthlyGoalCollectionName, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Check if the goal is for the current month
        const now = new Date();
        if (data.month === now.getMonth() && data.year === now.getFullYear()) {
            return data as MonthlyGoal;
        }
    }
    return null;
}

export async function saveMonthlyGoal(userId: string, chapterIds: string[]): Promise<void> {
    const docRef = doc(db, monthlyGoalCollectionName, userId);
    const now = new Date();
    const goal: MonthlyGoal = {
        userId,
        chapters: chapterIds,
        month: now.getMonth(),
        year: now.getFullYear(),
    };
    await setDoc(docRef, goal);
}
