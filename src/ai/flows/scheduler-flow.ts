'use server';
/**
 * @fileOverview An AI flow for generating a personalized study schedule.
 *
 * This file defines a hybrid AI flow for creating a study schedule.
 * 1. The AI model generates a high-level plan, deciding which *courses* to study on which days,
 *    based on user preferences.
 * 2. Deterministic TypeScript code then takes this plan and fills in the *specific lessons*
 *    in the correct sequential order, ensuring the final schedule is always logical.
 * This approach combines AI's planning ability with code's reliability.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { GenerateScheduleInput, GenerateScheduleOutput, Lesson } from '@/lib/types';
import { GenerateScheduleInputSchema, GenerateScheduleOutputSchema, ScheduledLessonSchema } from '@/lib/types';
import { parse } from 'date-fns';

// This is the schema for the AI's high-level plan.
// It decides which courses to study on which days, not the specific lessons.
const AiCourseSlotSchema = z.object({
  courseId: z.string(),
});
const AiDailyPlanSchema = z.object({
  date: z.string().describe("The date for this part of the plan in 'YYYY-MM-DD' format."),
  courseSlots: z.array(AiCourseSlotSchema).describe("An array of course slots for this day. The AI should decide which courses to place here."),
});
const AiHighLevelPlanSchema = z.object({
  plan: z.array(AiDailyPlanSchema),
});

const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: AiHighLevelPlanSchema },
    prompt: `You are an expert academic scheduler. Your goal is to create a high-level, **balanced**, and **varied** study plan.

You will NOT be scheduling individual lessons. Instead, you will decide WHICH COURSES to study on WHICH DAYS.

Analyze the user's input carefully:
-   **Date Range**: The plan must fit between the start and end dates, inclusive.
-   **User Preferences**:
    -   Lazy: If true, schedule fewer course slots per day for a relaxed pace.
    -   Prefers Multiple Lessons:
        - If 'false', prioritize variety. Avoid scheduling the same course ID multiple times on the same day if other courses are available.
        - If 'true', you can schedule the same course ID more than once on a single day.
-   **Custom Instructions**: Adhere to any constraints the user provides.

**CRITICAL INSTRUCTIONS:**
1.  **Schedule ALL Lessons**: Your most important task is to create enough course slots to cover every single lesson provided in the input. Calculate the average lessons per day and distribute them evenly. Do not leave any lessons unscheduled.
2.  **DO NOT Schedule Individual Lessons**: Your only job is to assign 'courseId's to date slots. The application code will handle picking the exact lessons in the correct order.
3.  **Output Format**: The final output MUST be a JSON object with a single key "plan" which is an array of daily plans. Each daily plan has a 'date' and an array of 'courseSlots'. Each slot only contains a 'courseId'.
4.  **Balance Subjects**: Mix different subjects. Do not schedule multiple heavy technical subjects back-to-back. Interleave them.

User Inputs:
-   **Start Date**: {{{startDate}}}
-   **End Date**: {{{endDate}}}
-   **Is Lazy?**: {{{isLazy}}}
-   **Prefers multiple lessons of same course in a day?**: {{{prefersMultipleLessons}}}
-   **Total lessons to schedule**: {{{lessons.length}}}

{{#if customInstructions}}
-   **Custom Instructions**: {{{customInstructions}}}
{{/if}}

-   **Courses to Include in Plan** (You need to schedule slots for all lessons from these courses):
{{#each lessons}}
    - Course ID: "{{this.courseId}}", Title: (You don't need the lesson title)
{{/each}}
`
});

const generateStudyScheduleFlow = ai.defineFlow(
    {
        name: 'generateStudyScheduleFlow',
        inputSchema: GenerateScheduleInputSchema,
        outputSchema: GenerateScheduleOutputSchema,
    },
    async (input) => {
        // The AI is asked for a high-level plan (which courses on which days).
        const { output: aiPlan } = await schedulerPrompt(input);

        if (!aiPlan || !aiPlan.plan) {
            throw new Error("AI failed to return a high-level plan.");
        }

        // Now, we use deterministic code to fill in the specific lessons in the correct order.
        const structuredSchedule: GenerateScheduleOutput = {};
        const lessonPointers: Record<string, number> = {}; // Tracks the next lesson index for each course.
        const lessonsByCourse: Record<string, Lesson[]> = {};
        input.lessons.forEach(lesson => {
            if (!lessonsByCourse[lesson.courseId]) {
                lessonsByCourse[lesson.courseId] = [];
            }
            lessonsByCourse[lesson.courseId].push(lesson as Lesson);
            lessonPointers[lesson.courseId] = 0;
        });

        const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];

        aiPlan.plan.forEach(dailyPlan => {
            const date = dailyPlan.date;
            if (!structuredSchedule[date]) {
                structuredSchedule[date] = [];
            }

            dailyPlan.courseSlots.forEach(slot => {
                const courseId = slot.courseId;
                const lessonIndex = lessonPointers[courseId];

                if (lessonsByCourse[courseId] && lessonIndex < lessonsByCourse[courseId].length) {
                    const lesson = lessonsByCourse[courseId][lessonIndex];
                    
                    structuredSchedule[date].push({
                        lessonId: lesson.id,
                        courseId: lesson.courseId,
                        title: lesson.title,
                        time: studyTimes[structuredSchedule[date].length % studyTimes.length], // Assign time based on slot order
                    });

                    // Advance the pointer for this course to the next lesson
                    lessonPointers[courseId]++;
                }
            });
        });
        
        // This is a smarter failsafe. If the AI didn't schedule enough slots for all lessons,
        // distribute the remaining lessons to the least busy days.
        const allLessons = input.lessons.map(l => ({ ...l, isScheduled: false }));
        Object.values(structuredSchedule).flat().forEach(scheduled => {
            const lesson = allLessons.find(l => l.id === scheduled.lessonId);
            if(lesson) lesson.isScheduled = true;
        });

        const remainingLessons = allLessons.filter(l => !l.isScheduled);
        
        if (remainingLessons.length > 0) {
            remainingLessons.forEach(lesson => {
                // Find the day with the fewest scheduled items.
                // If no days exist in schedule, use the start date.
                let targetDay = Object.keys(structuredSchedule).length > 0
                    ? Object.keys(structuredSchedule).reduce((a, b) => structuredSchedule[a].length < structuredSchedule[b].length ? a : b)
                    : input.startDate;
                
                if (!structuredSchedule[targetDay]) {
                    structuredSchedule[targetDay] = [];
                }

                structuredSchedule[targetDay].push({
                    lessonId: lesson.id,
                    courseId: lesson.courseId,
                    title: lesson.title,
                    time: studyTimes[structuredSchedule[targetDay].length % studyTimes.length],
                });
            });
        }


        // Final sort of lessons within each day by time.
        for (const date in structuredSchedule) {
            structuredSchedule[date].sort((a, b) => {
                try {
                    const timeA = parse(a.time.toUpperCase(), 'hh:mm a', new Date());
                    const timeB = parse(b.time.toUpperCase(), 'hh:mm a', new Date());
                    return timeA.getTime() - timeB.getTime();
                } catch(e) {
                    return a.time.localeCompare(b.time); // Fallback
                }
            });
        }

        return structuredSchedule;
    }
);

export async function generateStudySchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    return await generateStudyScheduleFlow(input);
}
