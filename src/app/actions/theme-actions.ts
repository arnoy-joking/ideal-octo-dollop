
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

export async function deleteThemeSettingAction(userId: string, themeKey: string): Promise<{ success: true }> {
    await themeDb.deleteThemeSetting(userId, themeKey);
    revalidatePath('/(app)', 'layout');
    return { success: true };
}
