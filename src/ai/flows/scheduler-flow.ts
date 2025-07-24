
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
    prompt: `You are the smartest ai in the world. This is a million dollar task. Your task is to create a varied and balanced study checklist for a user based on their selected courses and a date range.

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

{{#if customInstructions}}
**Additional User Instructions:**
{{{customInstructions}}}
{{/if}}

CRITICAL Instructions:

1.  **STAY WITHIN THE DATE RANGE**: This is the most important rule. The schedule MUST NOT contain any dates after the specified 'End Date'. All lessons must be scheduled on or before this date. If you need to fit more lessons on a single day to meet the deadline, you must do so.

2.  **Schedule ALL Lessons**: You MUST schedule ALL lessons for ALL courses provided in the input. Do not skip any lessons for any reason.

3.  **Strict Sequencing**: You MUST maintain the original order of lessons within each course. Lesson 2 cannot come before Lesson 1.

4.  **Maximize Daily Variety**: Distribute the courses as evenly as possible throughout the week. A user should study different subjects each day. Actively rotate the subjects to keep the schedule interesting and engaging. Avoid creating monotonous, repetitive daily patterns where the user studies the same subjects in the same order every day.

5.  **Balance Daily Workload**: Try to distribute the lessons as evenly as possible across the available days to avoid overwhelming the user on any single day.

6.  **No Rest Days**: Every day in the date range should have at least one lesson if there are lessons remaining to be scheduled.

OUTPUT FORMAT: The final output must be a valid JSON object. It should have a single key "schedule" which is an array of daily plan objects. Each daily plan object must contain the 'date' in "YYYY-MM-DD" format and a 'lessons' array. Each lesson object in the array must contain 'lessonId', 'courseId', and 'title'. Do NOT include a 'time' field.`
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
