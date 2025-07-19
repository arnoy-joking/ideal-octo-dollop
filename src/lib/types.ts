import type { Timestamp } from "firebase/firestore";
import { z } from "zod";

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoId: string;
  pdfUrl?: string;
  courseId?: string; // This will be added when processing
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


// Types for AI Scheduler
export const ScheduledLessonSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  title: z.string(),
  time: z.string().describe("The time for the lesson in 'hh:mm a' 12-hour format, e.g., '09:00 AM' or '02:30 PM'."),
});
export type ScheduledLesson = z.infer<typeof ScheduledLessonSchema>;

export const GenerateScheduleOutputSchema = z.record(
  z.string().describe("The date in YYYY-MM-DD format."),
  z.array(ScheduledLessonSchema)
).describe("The full study schedule, with dates as keys.");
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;
// For database storage, we'll use the same type as the output.
export type Schedule = GenerateScheduleOutput;


export const GenerateScheduleInputSchema = z.object({
  lessons: z.array(z.object({
      id: z.string(),
      title: z.string(),
      courseId: z.string(),
  })).describe("A list of lessons the user wants to schedule, already in sequential order."),
  startDate: z.string().describe("The start date for the schedule in YYYY-MM-DD format."),
  endDate: z.string().describe("The end date for the schedule in YYYY-MM-DD format."),
  isLazy: z.boolean().describe("User self-identifies as lazy. This implies longer breaks and fewer lessons per day."),
  prefersMultipleLessons: z.boolean().describe("User is okay with scheduling multiple lessons from the same course on the same day."),
  customInstructions: z.string().optional().describe("Any additional custom instructions or constraints from the user, like 'I am free in the evenings' or 'I have a job on Tuesdays'."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;
