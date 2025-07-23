
'use server';
/**
 * @fileOverview An AI flow for generating a high-level weekly study plan.
 *
 * This flow takes a list of courses and creates a high-level plan indicating
 * which courses to study on which days. It does not determine the number of
 * lessons, only the subject distribution for each day.
 *
 * - generateStudySchedulePlan - A function that creates the high-level study plan.
 */

import { ai } from '@/ai/genkit';
import { GenerateSchedulePlanInputSchema, ScheduleSchema as CoursePlanSchema, type GenerateSchedulePlanInput, type Schedule as CoursePlan } from '@/lib/types';
import { z } from 'zod';

const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPlannerPrompt',
    input: { schema: GenerateSchedulePlanInputSchema },
    output: { schema: CoursePlanSchema },
    prompt: `You are an expert study planner. Your task is to create a high-level, balanced study plan based on the user's selected courses and date range.

Your output MUST be a plan that specifies which lessons to study on which days, including specific times.

**User Preferences:**
- Start Date: {{{startDate}}}
- End Date: {{{endDate}}}

**Available Courses & Their Lessons (in sequence):**
{{#each courses}}
- Course: "{{title}}" (ID: {{id}})
  Lessons:
  {{#each lessons}}
  - {{title}} (ID: {{id}})
  {{/each}}
{{/each}}

**CRITICAL Instructions:**
1.  **Schedule ALL Lessons:** You MUST schedule ALL lessons for ALL courses provided in the input within the given date range. Do not skip any lessons.
2.  **Strict Sequencing:** You MUST schedule lessons for each course in the exact order they are provided. Never schedule a lesson before its predecessor from the same course is scheduled.
3.  **Balance Subjects & Avoid Monotony:** This is the most important rule. Distribute the courses as evenly as possible throughout the period. A user should not study the same subject at the same time every day. Actively rotate the subjects to keep the schedule interesting and engaging. Avoid creating monotonous, repetitive daily patterns where subjects appear in the same order.
4.  **No Rest Days:** Do NOT include any rest days. Every day in the range should have at least one lesson if there are lessons to be scheduled.
5.  **Assign Realistic Times:** For each scheduled lesson, assign a reasonable time in 'hh:mm a' format (e.g., '09:00 AM', '02:30 PM'). Do not clump all lessons together. Space them out. Times within a single day must be chronological.
6.  **Distribute Long Courses:** If one course has significantly more lessons than others, you must distribute its lessons throughout the entire date range, not just clump them at the end after shorter courses are finished.
7.  **Output Format:** The final output must be a valid JSON object. It should have a single key "schedule" which is an array of daily plan objects. Each daily plan object must contain the 'date' in "YYYY-MM-DD" format and a 'lessons' array. Each lesson object in the array must contain 'lessonId', 'courseId', 'title', and 'time'.
`
});

const generateStudySchedulePlanFlow = ai.defineFlow(
    {
        name: 'generateStudySchedulePlanFlow',
        inputSchema: GenerateSchedulePlanInputSchema,
        outputSchema: CoursePlanSchema,
    },
    async (input) => {
        const { output } = await schedulerPrompt(input);
        if (!output) {
          throw new Error("AI failed to generate a plan.");
        }
        return output;
    }
);

export async function generateStudySchedulePlan(input: GenerateSchedulePlanInput): Promise<CoursePlan> {
    return await generateStudySchedulePlanFlow(input);
}
