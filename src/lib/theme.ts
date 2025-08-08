
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, FieldValue, deleteField } from "firebase/firestore";
import type { ThemeSettings } from './types';

const themeSettingsCollectionName = 'themeSettings';

export async function getThemeSettings(userId: string): Promise<ThemeSettings | null> {
    const settingsDocRef = doc(db, themeSettingsCollectionName, userId);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as ThemeSettings;
    }
    return null;
}

export async function saveThemeSettings(userId: string, settings: ThemeSettings): Promise<void> {
    const settingsDocRef = doc(db, themeSettingsCollectionName, userId);
    await setDoc(settingsDocRef, settings, { merge: true });
}

export async function deleteThemeSetting(userId: string, themeKey: string): Promise<void> {
    const settingsDocRef = doc(db, themeSettingsCollectionName, userId);
    await updateDoc(settingsDocRef, {
        [themeKey]: deleteField()
    });
}
