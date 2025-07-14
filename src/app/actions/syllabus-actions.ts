'use server';

import { revalidatePath } from 'next/cache';
import * as syllabusDb from '@/lib/syllabus';
import type { MonthlyGoal } from '@/lib/types';

export async function getCompletedChaptersAction(userId: string): Promise<string[]> {
    return await syllabusDb.getCompletedChapters(userId);
}

export async function saveCompletedChaptersAction(userId: string, completedChapterIds: string[]): Promise<{ success: true }> {
    await syllabusDb.saveCompletedChapters(userId, completedChapterIds);
    revalidatePath('/syllabus');
    revalidatePath('/monthly-goal');
    return { success: true };
}

export async function getMonthlyGoalAction(userId: string): Promise<MonthlyGoal | null> {
    return await syllabusDb.getMonthlyGoal(userId);
}

export async function saveMonthlyGoalAction(userId: string, chapterIds: string[]): Promise<{ success: true }> {
    await syllabusDb.saveMonthlyGoal(userId, chapterIds);
    revalidatePath('/monthly-goal');
    return { success: true };
}
