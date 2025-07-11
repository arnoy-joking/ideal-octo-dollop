import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    setDoc,
    getDoc,
    query,
    where,
    Timestamp,
    writeBatch,
    updateDoc
} from "firebase/firestore";
import type { Lesson, ProgressRecord, PublicProgress } from './types';

const progressCollection = collection(db, 'progress');
const userActivityCollection = collection(db, 'userActivity');

export async function getWatchedLessonIds(userId: string): Promise<Set<string>> {
    const q = query(progressCollection, where("userId", "==", userId), where("completed", "==", true));
    const snapshot = await getDocs(q);
    const watchedIds = new Set<string>();
    snapshot.forEach(doc => {
        watchedIds.add(doc.data().lessonId);
    });
    return watchedIds;
}

export async function markLessonAsWatched(userId: string, lesson: Lesson, courseId: string) {
    const progressId = `${userId}_${lesson.id}`;
    const progressRef = doc(db, 'progress', progressId);
    
    const data = {
        userId,
        lessonId: lesson.id,
        courseId,
        videoId: lesson.videoId,
        completed: true,
        seekTo: 0,
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    await setDoc(progressRef, data, { merge: true });
}

export async function getLastWatchedLessonId(userId: string, courseId:string): Promise<string | null> {
    const activityId = `${userId}_${courseId}`;
    const activityRef = doc(db, 'userActivity', activityId);
    const docSnap = await getDoc(activityRef);
    if (docSnap.exists()) {
        return docSnap.data().lastWatchedLessonId;
    }
    return null;
}

export async function setLastWatchedLesson(userId: string, courseId: string, lessonId: string) {
    const activityId = `${userId}_${courseId}`;
    const activityRef = doc(db, 'userActivity', activityId);
    await setDoc(activityRef, {
        userId,
        courseId,
        lastWatchedLessonId: lessonId,
        lastWatchedAt: Timestamp.now(),
    }, { merge: true });
}

export async function getAllProgress(): Promise<Record<string, Set<string>>> {
    const q = query(progressCollection, where("completed", "==", true));
    const snapshot = await getDocs(q);
    const allProgress: Record<string, Set<string>> = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const userId = data.userId;
        const lessonId = data.lessonId;

        if (!allProgress[userId]) {
            allProgress[userId] = new Set();
        }
        allProgress[userId].add(lessonId);
    });

    return allProgress;
}


export async function getPublicProgressData(): Promise<Record<string, PublicProgress>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = Timestamp.fromDate(today);

    const q = query(progressCollection, where("completed", "==", true));
    const snapshot = await getDocs(q);

    const allProgress: Record<string, PublicProgress> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data() as ProgressRecord;
        const { userId, lessonId, completedAt } = data;

        if (!allProgress[userId]) {
            allProgress[userId] = { today: [], all: [] };
        }
        
        allProgress[userId].all.push(lessonId);

        if (completedAt && completedAt >= startOfToday) {
            allProgress[userId].today.push(lessonId);
        }
    });

    return allProgress;
}


export async function deleteProgressForUser(userId: string): Promise<void> {
    const batch = writeBatch(db);

    const progressQuery = query(progressCollection, where("userId", "==", userId));
    const progressSnapshot = await getDocs(progressQuery);
    progressSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    const activityQuery = query(userActivityCollection, where("userId", "==", userId));
    const activitySnapshot = await getDocs(activityQuery);
    activitySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
}

export async function getLessonProgress(userId: string, lessonId: string): Promise<{ seekTo?: number } | null> {
    const progressId = `${userId}_${lessonId}`;
    const progressRef = doc(db, 'progress', progressId);
    const docSnap = await getDoc(progressRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
}

export async function updateLessonProgress(userId: string, courseId: string, lessonId: string, data: { seekTo: number }) {
    const progressId = `${userId}_${lessonId}`;
    const progressRef = doc(db, 'progress', progressId);

    const docSnap = await getDoc(progressRef);
    if (docSnap.exists()) {
        await updateDoc(progressRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });
    } else {
        await setDoc(progressRef, {
            ...data,
            userId,
            courseId,
            lessonId,
            completed: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    }
}

export async function getLessonsWatchedTodayCount(userId: string): Promise<number> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = Timestamp.fromDate(today);

        const q = query(
            progressCollection,
            where("userId", "==", userId),
            where("completed", "==", true),
            where("completedAt", ">=", startOfToday)
        );
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error("Error fetching today's watched lessons count, you might need to create a Firestore index:", error);
        return 0;
    }
}
