
'use server';

import { revalidatePath } from 'next/cache';
import * as schedulerDb from '@/lib/scheduler';
import type { Schedule } from '@/lib/types';
import { z } from 'zod';
import { ScheduleSchema } from '@/lib/types';

// Helper to transform the new structure to the old one for DB compatibility
function transformToDbFormat(schedule: Schedule): Record<string, any> {
    if (!schedule || !Array.isArray(schedule.schedule)) {
        return {};
    }
    const dbSchedule: Record<string, any> = {};
    schedule.schedule.forEach(day => {
        dbSchedule[day.date] = day.lessons;
    });
    return dbSchedule;
}

// Helper to transform the old DB structure to the new one
function transformFromDbFormat(dbData: any): Schedule | null {
    // If it's already in the new format, just return it after validation
    if (dbData && dbData.schedule && Array.isArray(dbData.schedule)) {
        try {
            return ScheduleSchema.parse(dbData);
        } catch (e) {
            console.error("Could not parse schedule from DB, it might be the old format.", e);
            // Fallback to old format conversion if parsing fails
        }
    }

    if (!dbData || typeof dbData !== 'object' || Array.isArray(dbData)) {
         return null;
    }
    
    // This handles the old format where keys are dates
    if (dbData && !dbData.schedule) {
        const dailyPlans = Object.keys(dbData).map(date => ({
            date: date,
            lessons: dbData[date]
        }));
        return { schedule: dailyPlans };
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
