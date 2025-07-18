'use server';
/**
 * @fileOverview An AI flow for generating a personalized study schedule.
 *
 * - generateStudySchedule - A function that creates a study schedule based on user inputs.
 * - GenerateScheduleInput - The input type for the generateStudySchedule function.
 * - GenerateScheduleOutput - The return type for the generateStudySchedule function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { GenerateScheduleInput, GenerateScheduleOutput } from '@/lib/types';
import { GenerateScheduleInputSchema, GenerateScheduleOutputSchema, AiScheduledLessonSchema } from '@/lib/types';
import { parse } from 'date-fns';


const AiScheduleListOutputSchema = z.object({
    scheduledLessons: z.array(AiScheduledLessonSchema)
});

const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: AiScheduleListOutputSchema },
    prompt: `You are an expert academic scheduler. Your primary goal is to create a realistic, **balanced**, and **varied** study schedule that promotes effective learning.

Analyze the user's input carefully:
-   **Lessons**: A list of lessons to be scheduled, with their course context.
-   **Date Range**: The schedule must fit between the start and end dates, inclusive.
-   **User Traits**:
    -   Lazy: If true, schedule fewer lessons per day and create a more relaxed pace. Introduce more breaks and avoid cramming.
    -   Prefers Multiple Lessons: 
        - If 'false', you MUST schedule lessons from different courses on the same day. Do not schedule multiple lessons from the same course on the same day.
        - If 'true', you are allowed to schedule more than one lesson from the same course on a single day, but you should still prioritize variety when possible to create a balanced plan. Avoid scheduling many difficult topics together.
-   **Custom Instructions**: These are very important. Adhere to any constraints the user provides.

Your goal is to distribute all the selected lessons across the available days.

Instructions:
1.  **PRIORITIZE BALANCE AND VARIETY**: This is the most important rule. Mix different subjects. Do not schedule multiple heavy technical subjects back-to-back. Instead, interleave them with lighter topics. For example, after a Math lesson, schedule a Literature or Language lesson. The goal is to create a well-paced, varied schedule that keeps the user engaged and prevents burnout.
2.  **MAINTAIN SEQUENCE**: When you schedule multiple lessons from the same course, you MUST schedule them in the order they are provided in the input. For example, schedule 'Course A - Lesson 1' before 'Course A - Lesson 2'.
3.  **ASSIGN DATE & TIME**: For EACH lesson provided in the input, you MUST assign a 'date' (in YYYY-MM-DD format) and a 'time' (in HH:MM AM/PM 12-hour format, e.g., '09:00 AM', '02:30 PM').
4.  **USE REASONABLE TIMES**: Schedule lessons with reasonable gaps. Do not schedule lessons back-to-back. There should be at least an hour between study sessions on the same day to allow for breaks and context switching.
5.  **RESPECT DATE RANGE**: The 'date' for each lesson must be within the provided Start and End Date range.
6.  **INCLUDE ALL LESSONS**: Ensure every single lesson from the input is present in the final output array. Do not omit any lessons.
7.  **OUTPUT FORMAT**: The final output MUST be a JSON object with a single key "scheduledLessons" which is an array of all the scheduled lessons.

User Inputs:
-   **Start Date**: {{{startDate}}}
-   **End Date**: {{{endDate}}}
-   **Is Lazy?**: {{{isLazy}}}
-   **Prefers multiple lessons of same course in a day?**: {{{prefersMultipleLessons}}}

{{#if customInstructions}}
-   **Custom Instructions**: {{{customInstructions}}}
{{/if}}

-   **Lessons to Schedule**:
{{#each lessons}}
    - Lesson ID: {{this.id}}, Title: "{{this.title}}", Course: "{{this.courseTitle}}" (ID: {{this.courseId}})
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
        const { output } = await schedulerPrompt(input);

        if (!output || !output.scheduledLessons) {
            throw new Error("AI failed to return a valid schedule list.");
        }

        // Process the flat list from the AI into the structured format the frontend expects.
        const structuredSchedule: GenerateScheduleOutput = {};

        for (const lesson of output.scheduledLessons) {
            const date = lesson.date;
            if (!structuredSchedule[date]) {
                structuredSchedule[date] = [];
            }
            structuredSchedule[date].push({
                lessonId: lesson.lessonId,
                courseId: lesson.courseId,
                time: lesson.time,
                title: lesson.title,
            });
        }
        
        // Sort lessons within each day by time
        for (const date in structuredSchedule) {
            structuredSchedule[date].sort((a, b) => {
                const timeA = parse(a.time, 'h:mm a', new Date());
                const timeB = parse(b.time, 'h:mm a', new Date());
                return timeA.getTime() - timeB.getTime();
            });
        }

        return structuredSchedule;
    }
);

export async function generateStudySchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    return await generateStudyScheduleFlow(input);
}
