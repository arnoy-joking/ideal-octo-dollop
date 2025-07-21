
'use server';
/**
 * @fileOverview An AI flow for generating a high-level weekly study plan.
 *
 * This flow takes a list of courses and lessons and outputs a plan
 * indicating how many lessons from which course to study on each day.
 * It does not handle the specific lesson sequencing, only the daily distribution.
 *
 * - generateStudyScheduleFlow - A function that creates the high-level study plan.
 * - GenerateScheduleInput - The input type for the function.
 * - CoursePlan - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

const CourseInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  lessons: z.array(z.object({ id: z.string(), title: z.string() })),
});

const GenerateScheduleInputSchema = z.object({
  courses: z.array(CourseInfoSchema).describe("A list of courses the user wants to schedule, including their lessons."),
  startDate: z.string().describe("The start date for the schedule in YYYY-MM-DD format."),
  endDate: z.string().describe("The end date for the schedule in YYYY-MM-DD format."),
  isLazy: z.boolean().describe("User self-identifies as lazy. This implies longer breaks and fewer lessons per day."),
  prefersMultipleLessons: z.boolean().describe("User is okay with scheduling multiple lessons from the same course on the same day."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

// The AI's output is a high-level plan, not a detailed schedule.
const CoursePlanSchema = z.record(
    z.string().describe("A date string in YYYY-MM-DD format."),
    z.array(z.string()).describe("An array of course IDs to be studied on this date. The number of times an ID appears determines how many lessons of that course to study.")
).describe("A high-level plan mapping dates to a list of course IDs for study on that day.");
export type CoursePlan = z.infer<typeof CoursePlanSchema>;


const schedulerPrompt = ai.definePrompt({
    name: 'schedulerPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: CoursePlanSchema },
    prompt: `You are an expert study planner. Your task is to create a high-level, balanced study plan based on the user's selected courses and preferences.

Your output MUST be a plan that specifies which courses to study on which days. You do NOT need to select specific lessons or times.

**User Preferences:**
- Start Date: {{{startDate}}}
- End Date: {{{endDate}}}
- Relaxed Pace: {{isLazy}}
- Allow Multiple Lessons from Same Course per Day: {{prefersMultipleLessons}}

**Available Courses and Lessons:**
{{#each courses}}
- Course: "{{title}}" (ID: {{id}}) - {{lessons.length}} lessons total
{{/each}}

**Instructions:**
1.  **Calculate Distribution:** Determine the total number of lessons to be scheduled. Calculate the number of available days between the start and end date. Figure out the average number of lessons to schedule per day to create a balanced plan.
2.  **Ensure Full Coverage:** Your final plan MUST include exactly one entry for every single lesson provided in the input. Sum of all lessons in your output plan must equal the total number of lessons provided.
3.  **Create Daily Plan:** For each day from the start date to the end date, create a list of course IDs to study.
    - If you decide 2 lessons from "React" (id: course-1) and 1 from "TypeScript" (id: course-2) should be studied on a given day, the entry for that day should be: \`["course-1", "course-1", "course-2"]\`.
4.  **Balance Subjects:** Distribute the courses evenly throughout the week. Avoid scheduling the same subject on too many consecutive days if possible.
5.  **Adhere to Preferences:**
    - If 'isLazy' is true, schedule fewer lessons per day and spread them out more. Maybe include a rest day with no lessons.
    - If 'prefersMultipleLessons' is false, try to schedule only one lesson from any given course per day, unless it's impossible to fit all lessons otherwise.
6.  **Output Format:** The final output must be a valid JSON object where keys are dates in "YYYY-MM-DD" format and values are arrays of course ID strings. Only include dates that have lessons scheduled.
`
});

const generateStudyScheduleFlow = ai.defineFlow(
    {
        name: 'generateStudyScheduleFlow',
        inputSchema: GenerateScheduleInputSchema,
        outputSchema: CoursePlanSchema,
    },
    async (input) => {
        // Step 1: Get the high-level plan from the AI
        const { output: aiPlan } = await schedulerPrompt(input);
        
        if (!aiPlan) {
          throw new Error("AI failed to generate a plan.");
        }

        // Step 2: Failsafe and Verification
        // Count total lessons in AI plan and compare with input
        const totalLessonsInInput = input.courses.reduce((sum, course) => sum + course.lessons.length, 0);
        const totalLessonsInAIPlan = Object.values(aiPlan).flat().length;

        // If the AI missed some lessons, distribute them intelligently.
        if (totalLessonsInAIPlan < totalLessonsInInput) {
            const allLessonSlots = Object.values(aiPlan).flat();
            const lessonCountsByCourseInAIPlan = allLessonSlots.reduce((acc, courseId) => {
                acc[courseId] = (acc[courseId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const availableDays = Object.keys(aiPlan).sort();
            if (availableDays.length === 0 && totalLessonsInInput > 0) {
              // AI returned empty plan, create a basic one.
              const days = eachDayOfInterval({start: parseISO(input.startDate), end: parseISO(input.endDate)});
              days.forEach(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                if (!aiPlan[dayStr]) aiPlan[dayStr] = [];
              })
            }


            for (const course of input.courses) {
                const needed = course.lessons.length;
                const planned = lessonCountsByCourseInAIPlan[course.id] || 0;
                let missing = needed - planned;

                while (missing > 0) {
                    // Find the day with the fewest lessons to add the missing one
                    let dayWithFewestLessons = Object.keys(aiPlan).reduce((a, b) => aiPlan[a].length <= aiPlan[b].length ? a : b);
                    aiPlan[dayWithFewestLessons].push(course.id);
                    missing--;
                }
            }
        }
        
        return aiPlan;
    }
);

export async function generateSchedulePlan(input: GenerateScheduleInput): Promise<CoursePlan> {
    return await generateStudyScheduleFlow(input);
}
