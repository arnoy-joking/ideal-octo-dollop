
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
    prompt: `You are an expert study planner. Your task is to create a varied, balanced, and realistic daily study checklist for a user based on their selected courses and a strict date range.

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

**CRITICAL INSTRUCTIONS – FOLLOW EXACTLY:**

1.  **STRICT DATE RANGE:**
    - You MUST schedule all lessons between {{{startDate}}} and {{{endDate}}} (inclusive).
    - DO NOT schedule ANY lesson before {{{startDate}}} or after {{{endDate}}}.
    - If there are many lessons, you MUST add more lessons per day — but never go outside the date range.

2.  **SCHEDULE ALL LESSONS:**
    - You MUST include every single lesson from every course.
    - Do NOT skip, merge, or omit any lesson — no exceptions.

3.  **MAINTAIN SEQUENCE:**
    - For each course, lessons must be scheduled in the exact order listed.
    - You CANNOT schedule Lesson 2 before Lesson 1 of the same course.

4.  **MAXIMIZE DAILY VARIETY & AVOID BORING PATTERNS:**
    - Each day must include lessons from **at least 2–3 different subjects**.
    - Rotate courses daily — do NOT do the same subject every morning or every day.
    - Avoid predictable or monotonous patterns (e.g., "Physics every Monday").
    - Mix heavy topics (like Physics, Biology) with lighter/interactive ones (like ICT, Bangla).

5.  **BALANCE DAILY WORKLOAD:**
    - Distribute lessons so no single day feels overwhelming.
    - Aim for **4–5 lessons per day** on average.
    - NEVER put more lessons on the last day than earlier days.
    - Do NOT save long or hard topics (e.g., final Biology chapters) for the end.

6.  **NO REST DAYS:**
    - Every day from {{{startDate}}} to {{{endDate}}} must have at least one lesson.
    - Keep going until all lessons are assigned.

7.  **OUTPUT FORMAT:** The final output must be a valid JSON object. It should have a single key "schedule" which is an array of daily plan objects. Each daily plan object must contain the 'date' in "YYYY-MM-DD" format and a 'lessons' array. Each lesson object in the array must contain 'lessonId', 'courseId', and 'title'. Do NOT include a 'time' field.

**GOAL:**  
Create a schedule that feels **smart, engaging, and sustainable** — not robotic, not crammed, and never boring. The user should feel motivated every day, not burned out on the last day.`
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
