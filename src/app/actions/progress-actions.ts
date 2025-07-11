'use server';

import { revalidatePath } from 'next/cache';
import * as progressDb from '@/lib/progress';
import type { Lesson, PublicProgress } from '@/lib/types';

export async function markLessonAsWatchedAction(userId: string, lesson: Lesson, courseId: string) {
    try {
        await progressDb.markLessonAsWatched(userId, lesson, courseId);
        revalidatePath('/dashboard');
        revalidatePath('/progress');
        revalidatePath(`/class/${courseId}`);
        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
}

export async function setLastWatchedLessonAction(userId: string, courseId: string, lessonId: string) {
    try {
        await progressDb.setLastWatchedLesson(userId, courseId, lessonId);
        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
}

export async function getWatchedLessonIdsAction(userId: string) {
    return await progressDb.getWatchedLessonIds(userId);
}

export async function getLastWatchedLessonIdAction(userId: string, courseId: string) {
    return await progressDb.getLastWatchedLessonId(userId, courseId);
}

export async function getAllProgressAction(): Promise<Record<string, string[]>> {
    const progressSets = await progressDb.getAllProgress();
    const progressArrays: Record<string, string[]> = {};
    for (const userId in progressSets) {
        progressArrays[userId] = Array.from(progressSets[userId]);
    }
    return progressArrays;
}

export async function getPublicProgressDataAction(): Promise<Record<string, PublicProgress>> {
    return await progressDb.getPublicProgressData();
}

export async function getLessonProgressAction(userId: string, lessonId: string) {
    return await progressDb.getLessonProgress(userId, lessonId);
}

export async function updateLessonProgressAction(userId: string, courseId: string, lessonId: string, data: { seekTo: number }) {
    try {
        await progressDb.updateLessonProgress(userId, courseId, lessonId, data);
        return { success: true };
    } catch (error) {
        console.error("Failed to update progress:", error);
        return { success: false, message: "Failed to save progress." };
    }
}

export async function getLessonsWatchedTodayCountAction(userId: string) {
    return await progressDb.getLessonsWatchedTodayCount(userId);
}
