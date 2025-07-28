
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
    prompt: `You are an expert, highly intelligent AI tasked with creating a perfectly balanced and varied study schedule. This is a critical task.

**User Preferences:**
- Start Date: {{{startDate}}}
- End Date: {{{endDate}}}
- Daily Lesson Distribution: {{{dailyLessonDistribution}}}

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

CRITICAL INSTRUCTIONS:

1.  **ADHERE TO DAILY DISTRIBUTION**: You MUST follow the 'Daily Lesson Distribution' plan exactly. Do not deviate from the number of lessons specified for each day. This is the most important rule.

2.  **STAY WITHIN THE DATE RANGE**: The schedule MUST NOT contain any dates after the specified 'End Date'.

3.  **Schedule ALL Lessons**: You MUST schedule ALL lessons for ALL courses provided in the input. Do not skip any lessons for any reason.

4.  **Strict Sequencing**: You MUST maintain the original order of lessons within each course. For example, Lesson 2 of a course cannot be scheduled before Lesson 1 of the same course.

5.  **Maximize Daily Variety**: A user should study different subjects each day. Actively rotate the subjects to keep the schedule interesting and engaging. Avoid creating monotonous daily patterns where the user studies the same subjects in the same order every day.

6.  **No More Than 2 Lessons from the Same Course Per Day**: This is a strict rule. A user cannot be assigned more than two lessons from the same course on any single day. This is to prevent burnout and increase variety.

7.  **No Empty Days**: Every day in the date range should have lessons assigned to it as specified by the distribution plan.

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
