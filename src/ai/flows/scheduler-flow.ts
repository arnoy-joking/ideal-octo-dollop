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


const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: GenerateScheduleOutputSchema },
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
1.  Calculate the total number of days available in the date range.
2.  Calculate the total number of lessons to schedule.
3.  Determine an average number of lessons per day. Adjust this based on the 'isLazy' flag.
4.  Iterate through the available dates and assign lessons. Assign a reasonable time (e.g., '09:00', '14:30', '19:00') for each lesson.
5.  If custom instructions are provided, they take high priority.
6.  The final output MUST be a JSON object where keys are dates in 'YYYY-MM-DD' format and values are arrays of scheduled lessons for that day.
7.  Ensure every selected lesson is scheduled exactly once. Do not omit any lessons.

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
    - Lesson ID: {{id}}, Title: "{{title}}", Course: "{{courseTitle}}" (ID: {{courseId}})
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
        return output!;
    }
);

export async function generateStudySchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    return await generateStudyScheduleFlow(input);
}
