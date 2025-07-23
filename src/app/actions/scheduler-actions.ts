
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
    if (!dbData || typeof dbData !== 'object' || Array.isArray(dbData)) {
         // It might already be in the new format or is invalid
        if (dbData && dbData.schedule) {
            return ScheduleSchema.parse(dbData);
        }
        return null;
    }
    
    const dailyPlans = Object.keys(dbData).map(date => ({
        date: date,
        lessons: dbData[date]
    }));

    return { schedule: dailyPlans };
}


export async function getScheduleAction(userId: string): Promise<Schedule | null> {
    const data = await schedulerDb.getScheduleData(userId);
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
