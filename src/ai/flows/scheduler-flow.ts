
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
- Relaxed Pace: {{isLazy}}

**Available Courses & Their Lessons (in sequence):**
{{#each courses}}
- Course: "{{title}}" (ID: {{id}})
  Lessons:
  {{#each lessons}}
  - {{title}} (ID: {{id}})
  {{/each}}
{{/each}}

**Instructions:**
1.  **Create Daily Plan:** For each day from the start date to the end date (inclusive), create a daily plan object.
2.  **Strict Sequencing:** You MUST schedule lessons for each course in the exact order they are provided. Never schedule a lesson before its predecessor from the same course is scheduled.
3.  **Balance Subjects:** Distribute the courses evenly throughout the period. A user should not study the same subject multiple times a day if other subjects are available and can be scheduled. Rotate subjects to keep it interesting. Avoid creating monotonous, repetitive daily patterns.
4.  **Adhere to Preferences:** If 'isLazy' is true, include some rest days where the array of scheduled lessons is empty. Distribute these rest days realistically (e.g., one every 3-4 days). Don't just put them all at the end.
5.  **Assign Times:** For each scheduled lesson, assign a reasonable time in 'hh:mm a' format (e.g., '09:00 AM', '02:30 PM'). Times within a single day should be chronological.
6.  **Output Format:** The final output must be a valid JSON object. It should have a single key "schedule" which is an array of daily plan objects. Each daily plan object must contain the 'date' in "YYYY-MM-DD" format and a 'lessons' array. Each lesson object in the array must contain 'lessonId', 'courseId', 'title', and 'time'.
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
