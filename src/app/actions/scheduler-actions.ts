
'use server';

import { revalidatePath } from 'next/cache';
import * as schedulerDb from '@/lib/scheduler';
import type { Schedule } from '@/lib/types';

export async function getScheduleAction(userId: string): Promise<Schedule | null> {
    return await schedulerDb.getSchedule(userId);
}

export async function saveScheduleAction(userId: string, schedule: Schedule): Promise<{ success: true }> {
    await schedulerDb.saveSchedule(userId, schedule);
    revalidatePath('/scheduler');
    revalidatePath('/ai-scheduler');
    return { success: true };
}

export async function deleteScheduleAction(userId: string): Promise<{ success: true }> {
    await schedulerDb.deleteSchedule(userId);
    revalidatePath('/scheduler');
    revalidatePath('/ai-scheduler');
    return { success: true };
}
