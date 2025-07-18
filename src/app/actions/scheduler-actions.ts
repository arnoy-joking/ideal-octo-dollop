'use server';

import { revalidatePath } from 'next/cache';
import * as schedulerDb from '@/lib/scheduler';
import type { GenerateScheduleOutput } from '@/ai/flows/scheduler-flow';

export async function getScheduleAction(userId: string): Promise<GenerateScheduleOutput | null> {
    return await schedulerDb.getSchedule(userId);
}

export async function saveScheduleAction(userId: string, schedule: GenerateScheduleOutput): Promise<{ success: true }> {
    await schedulerDb.saveSchedule(userId, schedule);
    revalidatePath('/ai-scheduler');
    return { success: true };
}

export async function deleteScheduleAction(userId: string): Promise<{ success: true }> {
    await schedulerDb.deleteSchedule(userId);
    revalidatePath('/ai-scheduler');
    return { success: true };
}
