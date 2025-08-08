'use server';

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as bcrypt from 'bcryptjs';

const configCollectionName = 'config';
const passwordDocId = 'appPassword';

async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

export async function setPasswordAction(password: string): Promise<void> {
    const hashedPassword = await hashPassword(password);
    const passwordDocRef = doc(db, configCollectionName, passwordDocId);
    await setDoc(passwordDocRef, { hash: hashedPassword });
}

export async function getPasswordAction(): Promise<string | null> {
    const passwordDocRef = doc(db, configCollectionName, passwordDocId);
    const docSnap = await getDoc(passwordDocRef);
    if (docSnap.exists()) {
        return docSnap.data().hash;
    }
    return null;
}

export async function verifyPasswordAction(password: string): Promise<boolean> {
    const storedHash = await getPasswordAction();
    if (!storedHash) {
        // If no password is set, any attempt is technically invalid.
        // The UI should handle the case where there is no password.
        return false;
    }
    return await bcrypt.compare(password, storedHash);
}
