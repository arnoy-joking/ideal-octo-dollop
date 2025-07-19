<<<<<<< HEAD
=======

>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
'use server';

import { revalidatePath } from 'next/cache';
import * as schedulerDb from '@/lib/scheduler';
<<<<<<< HEAD
import type { GenerateScheduleOutput } from '@/lib/types';

export async function getScheduleAction(userId: string): Promise<GenerateScheduleOutput | null> {
    return await schedulerDb.getSchedule(userId);
}

export async function saveScheduleAction(userId: string, schedule: GenerateScheduleOutput): Promise<{ success: true }> {
=======
import type { Schedule } from '@/lib/types';

export async function getScheduleAction(userId: string): Promise<Schedule | null> {
    return await schedulerDb.getSchedule(userId);
}

export async function saveScheduleAction(userId: string, schedule: Schedule): Promise<{ success: true }> {
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
    await schedulerDb.saveSchedule(userId, schedule);
    revalidatePath('/ai-scheduler');
    return { success: true };
}
<<<<<<< HEAD

export async function deleteScheduleAction(userId: string): Promise<{ success: true }> {
    await schedulerDb.deleteSchedule(userId);
    revalidatePath('/ai-scheduler');
    return { success: true };
}
=======
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
