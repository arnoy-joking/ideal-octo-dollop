
import type { Timestamp } from "firebase/firestore";
import { z } from 'zod';

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

// AI Scheduler Types
const ScheduledLessonSchema = z.object({
  lessonId: z.string().describe("The unique ID of the lesson."),
  courseId: z.string().describe("The unique ID of the course this lesson belongs to."),
  time: z.string().describe("The scheduled time for the lesson in HH:MM 24-hour format, e.g., '09:00' or '14:30'."),
  title: z.string().describe("The title of the lesson."),
});

const DailyScheduleSchema = z.array(ScheduledLessonSchema);

export const GenerateScheduleOutputSchema = z.record(
  z.string().describe("The date in YYYY-MM-DD format."),
  DailyScheduleSchema
).describe("The full study schedule, with dates as keys.");

export const GenerateScheduleInputSchema = z.object({
  lessons: z.array(z.object({ 
    id: z.string(), 
    title: z.string(),
    courseId: z.string(),
    courseTitle: z.string(),
  })).describe("A list of lessons the user wants to schedule."),
  startDate: z.string().describe("The start date for the schedule in YYYY-MM-DD format."),
  endDate: z.string().describe("The end date for the schedule in YYYY-MM-DD format."),
  isLazy: z.boolean().describe("User self-identifies as lazy. This implies longer breaks and fewer lessons per day."),
  prefersMultipleLessons: z.boolean().describe("User is okay with scheduling multiple lessons from the same course on the same day."),
  customInstructions: z.string().optional().describe("Any additional custom instructions or constraints from the user, like 'I am free in the evenings' or 'I have a job on Tuesdays'."),
});


export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;
