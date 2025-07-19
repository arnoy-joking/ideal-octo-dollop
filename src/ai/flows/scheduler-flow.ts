'use server';
/**
 * @fileOverview An AI flow for generating a personalized study schedule.
 *
 * This file defines the AI flow for creating a personalized study schedule.
 * It takes a list of lessons, a date range, and user preferences, and returns
 * a structured, intelligent study plan. The core logic uses a powerful AI model
 * to suggest dates and times for each lesson individually. The application code

 * then validates this output and structures it into the final schedule format,
 * ensuring reliability and correctness.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { GenerateScheduleInput, GenerateScheduleOutput } from '@/lib/types';
import { GenerateScheduleInputSchema, GenerateScheduleOutputSchema } from '@/lib/types';
import { parse } from 'date-fns';

// This is the schema the AI is expected to return: a simple, flat list of lessons with assigned dates and times.
const AiScheduledLessonSchema = z.object({
    lessonId: z.string(),
    courseId: z.string(),
    title: z.string(),
    date: z.string().describe("The date for the lesson in 'YYYY-MM-DD' format."),
    time: z.string().describe("The time for the lesson in 'hh:mm a' 12-hour format, e.g., '09:00 AM' or '02:30 PM'."),
});

const AiScheduleListOutputSchema = z.object({
    scheduledLessons: z.array(AiScheduledLessonSchema)
});

const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: AiScheduleListOutputSchema },
    prompt: `You are an expert academic scheduler. Your primary goal is to create a realistic, **balanced**, and **varied** study schedule that promotes effective learning and prevents burnout.

Analyze the user's input carefully:
-   **Lessons**: A list of lessons to be scheduled, with their course context. You MUST schedule every single lesson provided.
-   **Date Range**: The schedule must fit between the start and end dates, inclusive.
-   **User Preferences**:
    -   Lazy: If true, schedule fewer lessons per day and create a more relaxed pace. Introduce more breaks and avoid cramming.
    -   Prefers Multiple Lessons:
        - If 'false', you MUST prioritize scheduling lessons from different courses on the same day. Do not schedule multiple lessons from the same course on the same day if other options are available.
        - If 'true', you are allowed to schedule more than one lesson from the same course on a single day, but you should still prioritize variety when possible to create a balanced plan. Avoid scheduling many difficult topics together.
-   **Custom Instructions**: These are very important. Adhere to any constraints the user provides.

Your primary goal is to distribute all the selected lessons across the available days.

**CRITICAL INSTRUCTIONS:**
1.  **MAINTAIN SEQUENCE**: When scheduling lessons from the same course, you MUST maintain their original order. For example, "Physics - Part 1" must always come before "Physics - Part 2". The lessons in the input are already in the correct sequence.
2.  **ASSIGN DATE & TIME**: For EACH lesson provided in the input, you MUST assign a 'date' (in YYYY-MM-DD format) and a 'time' (in hh:mm a 12-hour format, e.g., '09:00 AM', '02:30 PM').
3.  **PRIORITIZE BALANCE AND VARIETY**: Mix different subjects. Do not schedule multiple heavy technical subjects back-to-back. Instead, interleave them with lighter topics.
4.  **USE REASONABLE TIMES**: Schedule lessons with reasonable gaps. Do not schedule lessons back-to-back without at least an hour in between.
5.  **INCLUDE ALL LESSONS**: Ensure every single lesson from the input is present in the final output array. Do not omit any lessons.
6.  **OUTPUT FORMAT**: The final output MUST be a JSON object with a single key "scheduledLessons" which is an array of all the scheduled lessons.

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
    - Lesson ID: {{this.id}}, Title: "{{this.title}}", Course: "{{this.courseId}}"
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
        // The AI is asked to schedule the lessons. We trust it to assign dates and times.
        const { output } = await schedulerPrompt(input);

        if (!output || !output.scheduledLessons || output.scheduledLessons.length !== input.lessons.length) {
            throw new Error("AI failed to return a valid schedule for all lessons.");
        }
        
        // The AI returns a flat list. We now structure it into the nested object the frontend expects.
        // This ensures the structure is always correct, regardless of AI inconsistencies.
        const structuredSchedule: GenerateScheduleOutput = {};
        
        output.scheduledLessons.forEach(aiScheduledLesson => {
            const date = aiScheduledLesson.date;
            if (!structuredSchedule[date]) {
                structuredSchedule[date] = [];
            }
            structuredSchedule[date].push({
                lessonId: aiScheduledLesson.lessonId,
                courseId: aiScheduledLesson.courseId,
                time: aiScheduledLesson.time,
                title: aiScheduledLesson.title, 
            });
        });
        
        // Sort lessons within each day by time. This is a critical step to ensure chronological order.
        for (const date in structuredSchedule) {
            structuredSchedule[date].sort((a, b) => {
                try {
                    // Use a flexible parser to handle 'h:mm a' and 'hh:mm a'
                    const timeA = parse(a.time.toUpperCase(), 'hh:mm a', new Date());
                    const timeB = parse(b.time.toUpperCase(), 'hh:mm a', new Date());
                    return timeA.getTime() - timeB.getTime();
                } catch(e) {
                    try {
                        const timeA = parse(a.time.toUpperCase(), 'h:mm a', new Date());
                        const timeB = parse(b.time.toUpperCase(), 'h:mm a', new Date());
                        return timeA.getTime() - timeB.getTime();
                    } catch (e2) {
                        // Fallback for invalid time formats, though the prompt should prevent this.
                        return a.time.localeCompare(b.time);
                    }
                }
            });
        }

        return structuredSchedule;
    }
);

export async function generateStudySchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    return await generateStudyScheduleFlow(input);
}
