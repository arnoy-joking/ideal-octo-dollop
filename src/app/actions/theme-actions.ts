
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

export async function getPixabayImageAction(query: string): Promise<string | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.warn('Pixabay API key is not configured.');
    return null;
  }

  try {
    const response = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3`);

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.hits?.[0]?.largeImageURL || data.hits?.[0]?.webformatURL || null;
  } catch (error) {
    console.error('Failed to fetch image from Pixabay', error);
    return null;
  }
}
