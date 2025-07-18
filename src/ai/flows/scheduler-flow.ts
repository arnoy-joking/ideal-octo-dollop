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
import type { GenerateScheduleInput, GenerateScheduleOutput, AiScheduledLesson } from '@/lib/types';
import { GenerateScheduleInputSchema, GenerateScheduleOutputSchema, AiScheduledLessonSchema } from '@/lib/types';


const AiScheduleListOutputSchema = z.object({
    scheduledLessons: z.array(AiScheduledLessonSchema)
});

const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: AiScheduleListOutputSchema },
    prompt: `You are an expert academic scheduler. Your task is to create a realistic, well-paced study schedule for a user based on their selected lessons, timeframe, and personal preferences.

Analyze the user's input carefully:
-   **Lessons**: A list of lessons to be scheduled, including their course context.
-   **Date Range**: The schedule must fit between the start and end dates, inclusive.
-   **User Traits**:
    -   Lazy: If true, schedule fewer lessons per day and create a more relaxed pace. Avoid cramming.
    -   Prefers Multiple Lessons: If true, you can schedule more than one lesson from the same course on a single day. If false, try to vary the subjects.
-   **Custom Instructions**: These are very important. Adhere to any constraints the user provides, such as "I am busy on weekdays before 5 PM" or "I want to finish all Math lessons first."

Your goal is to distribute all the selected lessons across the available days.

Instructions:
1.  For EACH lesson provided in the input, you MUST assign a 'date' (in YYYY-MM-DD format) and a 'time' (in HH:MM 24-hour format).
2.  The 'date' for each lesson must be within the provided Start and End Date range.
3.  Distribute the lessons evenly across the available days, respecting the user's 'lazy' preference and custom instructions.
4.  If custom instructions are provided, they take high priority.
5.  Ensure every single lesson from the input is present in the final output array. Do not omit any lessons.
6.  The final output MUST be a JSON object with a single key "scheduledLessons" which is an array of all the scheduled lessons.

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
            structuredSchedule[date].sort((a, b) => a.time.localeCompare(b.time));
        }

        return structuredSchedule;
    }
);

export async function generateStudySchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    return await generateStudyScheduleFlow(input);
}
