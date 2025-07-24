
import type { Timestamp } from "firebase/firestore";
import { z } from "zod";

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


// Types for Scheduler
export const ScheduledLessonSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  title: z.string(),
});
export type ScheduledLesson = z.infer<typeof ScheduledLessonSchema>;

const DailyPlanSchema = z.object({
  date: z.string().describe("The date in YYYY-MM-DD format."),
  lessons: z.array(ScheduledLessonSchema).describe("An array of lessons scheduled for this day."),
});

export const ScheduleSchema = z.object({
    schedule: z.array(DailyPlanSchema).describe("The full study schedule, as an array of daily plans."),
});
export type Schedule = z.infer<typeof ScheduleSchema>;


const LessonInputSchema = z.object({
  id: z.string(),
  title: z.string(),
});
const CourseInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  lessons: z.array(LessonInputSchema),
});

export const GenerateSchedulePlanInputSchema = z.object({
  courses: z.array(CourseInputSchema).describe("A list of courses the user wants to schedule, including their lessons."),
  startDate: z.string().describe("The start date for the schedule in YYYY-MM-DD format."),
  endDate: z.string().describe("The end date for the schedule in YYYY-MM-DD format."),
  customInstructions: z.string().optional().describe("Optional user-provided instructions to guide the AI."),
});
export type GenerateSchedulePlanInput = z.infer<typeof GenerateSchedulePlanInputSchema>;
