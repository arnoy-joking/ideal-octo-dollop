
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
    prompt: `**User Preferences:**
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

Instructions:

Keep the sequences of the lessons. Make this schedule smart as possible, dont make it boring and dull. Dont make any day overwhelmed. Divide lessons for days as-even-as-possible,  . Dont skip any lessons, I repeat, dont skip. The user cant study more than 2 lessons of same chapter in a day. Dont do any mistakes. the user is very lazy and he cant study if you do any mistake. I will destroy you if you do any mistake. you are an fucking ai. dont forget it. please do it smartly. please. please. and please.

Maximize variety for days. Dont do like {

      "date": "2025-07-29",

      "lessons": [

        {

          "lessonId": "c2d2b6c8-e06a-46a2-8480-b61a5cebcc56",

          "courseId": "SsVlqjdi5ghzi4jK13o3",

          "title": "সমন্বয় ও নিয়ন্ত্রণ - পর্ব ০৪"

        },

        {

          "lessonId": "9e17d590-094d-48ce-806c-3adf2657b089",

          "courseId": "SsVlqjdi5ghzi4jK13o3",

          "title": "সমন্বয় ও নিয়ন্ত্রণ - পর্ব ০৫"

        },

        {

          "lessonId": "f00e2109-34c6-47e0-ab68-3cc5c557efe3",

          "courseId": "SsVlqjdi5ghzi4jK13o3",

          "title": "সমন্বয় ও নিয়ন্ত্রণ - পর্ব ০৬"

        },

        {

          "lessonId": "7dcdfece-ee3f-4a1d-bb45-b9a71a7cd102",

          "courseId": "SsVlqjdi5ghzi4jK13o3",

          "title": "সমন্বয় ও নিয়ন্ত্রণ - পর্ব ০৭"

        }

      ]

three or four lessons of a same course in a day makes it super boring.



If needed add break day for the same lessons of a course for variety.



Handle smartly. 



**OUTPUT FORMAT:** The final output must be a valid JSON object. It should have a single key "schedule" which is an array of daily plan objects. Each daily plan object must contain the 'date' in "YYYY-MM-DD" format and a 'lessons' array. Each lesson object in the array must contain 'lessonId', 'courseId', and 'title'. Do NOT include a 'time' field.`
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
