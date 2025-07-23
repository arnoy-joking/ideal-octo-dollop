
'use server';

import { revalidatePath } from 'next/cache';
import * as schedulerDb from '@/lib/scheduler';
import type { Schedule } from '@/lib/types';
import { z } from 'zod';
import { ScheduleSchema } from '@/lib/types';

// Helper to transform the old DB structure (object with date keys) to the new one (object with a schedule array)
function transformFromDbFormat(dbData: any): Schedule | null {
    // If it's already in the new format, just return it after validation
    if (dbData && dbData.schedule && Array.isArray(dbData.schedule)) {
        try {
            return ScheduleSchema.parse(dbData);
        } catch (e) {
            console.error("Could not parse schedule from DB. It might be malformed.", e);
            return null; // Return null if it's in the new format but invalid
        }
    }

    // Handle the old format where keys are dates
    if (dbData && typeof dbData === 'object' && !Array.isArray(dbData) && !dbData.schedule) {
        const dailyPlans = Object.keys(dbData).map(date => ({
            date: date,
            lessons: dbData[date]
        }));
        return { schedule: dailyPlans };
    }

    // Return null for any other invalid or empty data
    return null;
}


export async function getScheduleAction(userId: string): Promise<Schedule | null> {
    const data = await schedulerDb.getScheduleData(userId);
    // The `data` from the DB is the raw object, which might contain the `schedule` property.
    // We pass the entire `data` object to the transformer.
    if (data) {
        return transformFromDbFormat(data.schedule);
    }
    return null;
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
