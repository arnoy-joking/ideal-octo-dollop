
import type { Timestamp } from "firebase/firestore";

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoId: string;
  pdfUrl?: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  lessons: Lesson[];
  order: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface RoutineSlot {
    id: string;
    time: string;
    courseId: string;
}

export type WeeklyRoutine = Record<string, RoutineSlot[]>;

export interface ProgressRecord {
    userId: string;
    lessonId: string;
    courseId: string;
    completed: boolean;
    completedAt: Timestamp;
    updatedAt: Timestamp;
}

export interface PublicProgress {
    today: string[];
    recent: string[];
    all: string[];
}

export type ThemeSettings = {
  [key: string]: {
    imageUrl: string;
    opacity: number;
    blur: number;
  };
};

export interface MonthlyGoal {
    userId: string;
    chapters: string[];
    month: number; // 0-11
    year: number;
}
