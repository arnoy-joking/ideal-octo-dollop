
import type { Timestamp } from "firebase/firestore";
<<<<<<< HEAD
import { z } from 'zod';
=======
import { z } from "zod";
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoId: string;
  pdfUrl?: string;
  courseId?: string; // Optional: Can be added when processing
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

<<<<<<< HEAD
// Scheduler Types
const ScheduledLessonSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  time: z.string(),
  title: z.string(),
});

export const GenerateScheduleOutputSchema = z.record(
  z.string().describe("The date in YYYY-MM-DD format."),
  z.array(ScheduledLessonSchema)
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
=======

// Types for AI Scheduler
export interface ScheduledLesson {
    lessonId: string;
    courseId: string;
    title: string;
    time: string; // HH:mm format
}

export type Schedule = Record<string, ScheduledLesson[]>; // Key is 'YYYY-MM-DD'

export const GenerateScheduleInputSchema = z.object({
  lessons: z.array(z.object({
      id: z.string(),
      title: z.string(),
      duration: z.string(),
      videoId: z.string(),
      pdfUrl: z.string().optional(),
      courseId: z.string().optional(),
  })),
  startDate: z.string(),
  endDate: z.string(),
  isLazy: z.boolean(),
  prefersMultiple: z.boolean(),
  customInstructions: z.string().optional(),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


export const GenerateScheduleOutputSchema = z.object({
    schedule: z.record(z.string(), z.array(z.object({
        lessonId: z.string(),
        courseId: z.string(),
        title: z.string(),
        time: z.string(),
    })))
});
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;
