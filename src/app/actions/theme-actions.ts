
'use server';

import { revalidatePath } from 'next/cache';
import * as themeDb from '@/lib/theme';
import type { ThemeSettings } from '@/lib/types';

export async function getThemeSettingsAction(userId: string): Promise<ThemeSettings | null> {
    return await themeDb.getThemeSettings(userId);
}

export async function saveThemeSettingsAction(userId: string, settings: ThemeSettings): Promise<{ success: true }> {
    await themeDb.saveThemeSettings(userId, settings);
    revalidatePath('/(app)', 'layout'); // Revalidate the entire app layout
    return { success: true };
}
