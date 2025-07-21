
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
import { GenerateSchedulePlanInputSchema, CoursePlanSchema, type GenerateSchedulePlanInput, type CoursePlan } from '@/lib/types';

const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPlannerPrompt',
    input: { schema: GenerateSchedulePlanInputSchema },
    output: { schema: CoursePlanSchema },
    prompt: `You are an expert study planner. Your task is to create a high-level, balanced study plan based on the user's selected courses and date range.

Your output MUST be a plan that specifies which courses to study on which days. You are ONLY deciding the subjects for each day, NOT how many lessons.

**User Preferences:**
- Start Date: {{{startDate}}}
- End Date: {{{endDate}}}
- Relaxed Pace: {{isLazy}}

**Available Courses:**
{{#each courses}}
- Course: "{{title}}" (ID: {{id}})
{{/each}}

**Instructions:**
1.  **Create Daily Plan:** For each day from the start date to the end date (inclusive), create a list of course IDs to study.
2.  **Balance Subjects:** Distribute the courses evenly throughout the period. A user should not study the same subject every single day if others are available. Rotate subjects to keep it interesting.
3.  **Adhere to Preferences:** If 'isLazy' is true, include some rest days where the array of course IDs is empty.
4.  **Output Format:** The final output must be a valid JSON object where keys are dates in "YYYY-MM-DD" format and values are arrays of UNIQUE course ID strings for that day.
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
