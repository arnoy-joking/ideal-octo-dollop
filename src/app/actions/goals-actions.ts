'use server';

import * as goalsDb from '@/lib/goals';
import { revalidatePath } from 'next/cache';

export async function getGoalsAction(userId: string): Promise<string> {
    return await goalsDb.getGoals(userId);
}

export async function saveGoalsAction(userId: string, goals: string): Promise<{ success: true }> {
    await goalsDb.saveGoals(userId, goals);
    revalidatePath('/dashboard');
    return { success: true };
}
