
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
    prompt: `You are an expert study planner. Your task is to create a varied and balanced study checklist for a user based on their selected courses and a strict date range.

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

**CRITICAL INSTRUCTIONS:**

1.  **STRICT DATE RANGE:** This is the most important rule. You MUST schedule all lessons strictly between the Start Date and the End Date. **DO NOT schedule ANY lessons after {{{endDate}}}.** If you have many lessons to schedule in a short period, you MUST increase the number of lessons per day to fit everything within the specified timeframe.

2.  **SCHEDULE ALL LESSONS:** You MUST schedule every single lesson from all provided courses. Do not skip any lessons.

3.  **MAINTAIN SEQUENCE:** For each course, you MUST schedule the lessons in the exact order they are provided. Never schedule a lesson before its predecessor from the same course is scheduled.

4.  **MAXIMIZE DAILY VARIETY:** Distribute different subjects as evenly as possible throughout the week. A user should study a mix of subjects each day. Avoid monotonous patterns where the same subjects are studied every single day. Rotate the subjects to keep the schedule engaging.

5.  **NO REST DAYS:** Do NOT include any rest days. Every day in the range must have at least one lesson scheduled until all lessons are assigned.

6.  Dont add more than 2 lessons from a course for a day. 

7.  **OUTPUT FORMAT:** The final output must be a valid JSON object. It should have a single key "schedule" which is an array of daily plan objects. Each daily plan object must contain the 'date' in "YYYY-MM-DD" format and a 'lessons' array. Each lesson object in the array must contain 'lessonId', 'courseId', and 'title'. Do NOT include a 'time' field.
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
