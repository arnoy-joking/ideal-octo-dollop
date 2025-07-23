
'use server';

import { revalidatePath } from 'next/cache';
import * as schedulerDb from '@/lib/scheduler';
import type { Schedule } from '@/lib/types';
import { z } from 'zod';
import { ScheduleSchema } from '@/lib/types';

// Helper to transform the old DB structure to the new one
function transformFromDbFormat(dbData: any): Schedule | null {
    if (!dbData || typeof dbData !== 'object') {
        // It might already be in the new format or is invalid
        if (dbData && dbData.schedule) {
            try {
                // Ensure it conforms to the schema before returning
                return ScheduleSchema.parse(dbData);
            } catch (e) {
                // If parsing fails, it's not in the new format.
                // Fallback to checking if it's the old format.
            }
        }
    }

    if (dbData && !dbData.schedule && typeof dbData === 'object' && !Array.isArray(dbData)) {
        const dailyPlans = Object.keys(dbData).map(date => ({
            date: date,
            lessons: dbData[date]
        }));
        return { schedule: dailyPlans };
    }
    
    // If it's already in the new format, just return it after validation
    if(dbData && dbData.schedule) {
        try {
            return ScheduleSchema.parse(dbData);
        } catch(e) {
            console.error("Could not parse schedule from DB", e);
            return null;
        }
    }

    return null;
}


export async function getScheduleAction(userId: string): Promise<Schedule | null> {
    const data = await schedulerDb.getScheduleData(userId);
    if (data && data.schedule) {
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
