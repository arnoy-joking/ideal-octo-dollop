'use server';
/**
 * @fileOverview An AI flow for generating a weekly study routine.
 *
 * - generateWeeklyRoutine - A function that creates a study schedule.
 * - GenerateRoutineInput - The input type for the generateWeeklyRoutine function.
 * - GenerateRoutineOutput - The return type for the generateWeeklyRoutine function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateRoutineInputSchema = z.object({
  courses: z.array(z.object({ id: z.string(), title: z.string() })).describe('A list of available courses with their IDs and titles.'),
  goals: z.string().describe("The user's learning goals to inform the routine."),
});
export type GenerateRoutineInput = z.infer<typeof GenerateRoutineInputSchema>;

const RoutineSlotSchema = z.object({
    id: z.string().describe("The unique ID for the slot, in 'Day-Index' format, e.g., 'Monday-0'."),
    time: z.string().describe("The scheduled time for the activity in HH:MM 24-hour format, e.g., '09:00' or '14:30'. Leave as empty string if no activity is scheduled."),
    courseId: z.string().describe("The ID of the course scheduled for this slot. Must be one of the provided course IDs. Leave as empty string if no course is scheduled."),
});

const WeeklyRoutineSchema = z.object({
    Sunday: z.array(RoutineSlotSchema).length(4),
    Monday: z.array(RoutineSlotSchema).length(4),
    Tuesday: z.array(RoutineSlotSchema).length(4),
    Wednesday: z.array(RoutineSlotSchema).length(4),
    Thursday: z.array(RoutineSlotSchema).length(4),
    Friday: z.array(RoutineSlotSchema).length(4),
    Saturday: z.array(RoutineSlotSchema).length(4),
}).describe('A full weekly schedule with 4 slots per day.');

export type GenerateRoutineOutput = z.infer<typeof WeeklyRoutineSchema>;

const routinePrompt = ai.definePrompt({
    name: 'routinePrompt',
    input: { schema: GenerateRoutineInputSchema },
    output: { schema: WeeklyRoutineSchema },
    prompt: `You are an expert study planner. Create a balanced weekly study routine based on the user's goals and available courses.

User Goals:
{{{goals}}}

Available Courses:
{{#each courses}}
- {{title}} (id: {{id}})
{{/each}}

Instructions:
1.  Create a schedule for the entire week (Sunday to Saturday).
2.  Each day has exactly 4 available time slots.
3.  Distribute the courses throughout the week to create a balanced schedule. Prioritize courses that seem most relevant to the user's goals.
4.  It's okay to leave some slots empty, but try to schedule at least one or two sessions for each course during the week.
5.  Set reasonable study times for the slots you fill (e.g., '09:00', '14:30', '19:00'). Use 24-hour format.
6.  The output must be a valid JSON object matching the provided schema.
7.  For each slot, provide the correct 'id' (format: 'Day-Index', e.g., 'Sunday-0'), 'time', and 'courseId'.
8.  If a slot is empty, the 'time' and 'courseId' fields MUST be empty strings.
9.  The 'courseId' you use MUST be one of the IDs from the 'Available Courses' list.
`
});


const generateWeeklyRoutineFlow = ai.defineFlow(
    {
        name: 'generateWeeklyRoutineFlow',
        inputSchema: GenerateRoutineInputSchema,
        outputSchema: WeeklyRoutineSchema,
    },
    async (input) => {
        const { output } = await routinePrompt(input);
        return output!;
    }
);

export async function generateWeeklyRoutine(input: GenerateRoutineInput): Promise<GenerateRoutineOutput> {
    return await generateWeeklyRoutineFlow(input);
}
