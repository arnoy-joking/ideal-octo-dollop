import type { Course } from "./types";
import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    limit,
    writeBatch
} from "firebase/firestore";

const coursesCollection = collection(db, 'courses');

export async function getCourses(): Promise<Course[]> {
  const snapshot = await getDocs(coursesCollection);
  const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
  return courses.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export async function getCourseBySlug(slug: string): Promise<Course | undefined> {
  const q = query(coursesCollection, where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return undefined;
  }
  
  const courseDoc = snapshot.docs[0];
  return { id: courseDoc.id, ...courseDoc.data() } as Course;
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  const courseDocRef = doc(db, 'courses', id);
  const docSnap = await getDoc(courseDocRef);

  if (!docSnap.exists()) {
    return undefined;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as Course;
}

export async function addCourse(courseData: Omit<Course, 'id'>): Promise<Course> {
    const docRef = await addDoc(coursesCollection, { ...courseData });
    
    // We get the data back to ensure we have a consistent object
    const newDoc = await getDoc(docRef);
    const newCourse = { id: newDoc.id, ...newDoc.data() } as Course;

    return newCourse;
}

export async function updateCourse(courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<Course | undefined> {
    const courseDocRef = doc(db, 'courses', courseId);
    
    const docSnap = await getDoc(courseDocRef);
    if (!docSnap.exists()) {
        return undefined;
    }
    
    await updateDoc(courseDocRef, courseData);
    
    const updatedDoc = await getDoc(courseDocRef);
    return { id: courseId, ...updatedDoc.data() } as Course;
}

export async function updateCourseOrder(courseIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    courseIds.forEach((id, index) => {
        const courseRef = doc(db, 'courses', id);
        batch.update(courseRef, { order: index });
    });
    await batch.commit();
}


export async function deleteCourse(courseId: string): Promise<boolean> {
    const courseDocRef = doc(db, 'courses', courseId);
    
    const docSnap = await getDoc(courseDocRef);
    if (!docSnap.exists()) {
        return false;
    }
    
    await deleteDoc(courseDocRef);
    return true;
}
