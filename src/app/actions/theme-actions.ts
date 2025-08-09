
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

export async function getPexelsImageAction(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('Pexels API key is not configured.');
    return null;
  }

  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Pexels API error: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.photos?.[0]?.src?.large2x || null;
  } catch (error) {
    console.error('Failed to fetch image from Pexels', error);
    return null;
  }
}
