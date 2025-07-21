
/// <reference lib="webworker" />
import { generateStudySchedulePlan, type CoursePlan } from '../ai/flows/scheduler-flow';
import type { GenerateScheduleInput, Schedule } from '../lib/types';
import { parse, eachDayOfInterval, format, parseISO } from 'date-fns';

/**
 * Distributes all lessons evenly across the days provided in the AI's plan.
 * This ensures that every lesson is scheduled and the workload is balanced.
 * @param plan The high-level plan from the AI.
 * @param input The original user input with all lesson details.
 * @returns A new plan with lesson counts per course per day.
 */
function distributeLessonsToPlan(plan: CoursePlan, input: GenerateScheduleInput): Record<string, string[]> {
    const { courses, startDate, endDate } = input;
    const totalLessons = courses.reduce((sum, course) => sum + course.lessons.length, 0);
    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

    // Days where the AI has scheduled at least one course.
    const studyDays = days.filter(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return plan[dayStr] && plan[dayStr].length > 0;
    });

    if (studyDays.length === 0) {
        // If AI planned only rest days, use all days as study days.
        studyDays.push(...days);
    }

    const lessonsPerDay = Math.ceil(totalLessons / studyDays.length);
    const finalPlan: Record<string, string[]> = {};

    // Initialize final plan with empty arrays for all days
    days.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      finalPlan[dayStr] = [];
    });
    
    // Create a mutable copy of lesson counts
    const remainingLessonsByCourse: Record<string, number> = {};
    courses.forEach(course => {
        remainingLessonsByCourse[course.id] = course.lessons.length;
    });

    // Distribute lessons day by day
    for (let i = 0; i < studyDays.length; i++) {
        const day = studyDays[i];
        const dayStr = format(day, 'yyyy-MM-dd');
        const coursesForThisDay = plan[dayStr] || [];

        let scheduledOnThisDay = 0;
        let attempt = 0;
        const maxAttempts = courses.length;

        // Try to fill up to the lessonsPerDay limit
        while (scheduledOnThisDay < lessonsPerDay && attempt < maxAttempts) {
            // Cycle through the courses planned for this day
            const courseId = coursesForThisDay[scheduledOnThisDay % coursesForThisDay.length];

            if (courseId && remainingLessonsByCourse[courseId] > 0) {
                finalPlan[dayStr].push(courseId);
                remainingLessonsByCourse[courseId]--;
                scheduledOnThisDay++;
            }
            attempt++;
        }
    }

    // If any lessons are still left over (due to rounding, etc.),
    // distribute them one by one to the days with the fewest lessons.
    let remainingTotal = Object.values(remainingLessonsByCourse).reduce((a, b) => a + b, 0);
    while (remainingTotal > 0) {
        for (const course of courses) {
            if (remainingLessonsByCourse[course.id] > 0) {
                // Find the study day with the minimum number of lessons
                const dayWithFewestLessons = studyDays.reduce((minDay, currentDay) => {
                    const minDayStr = format(minDay, 'yyyy-MM-dd');
                    const currentDayStr = format(currentDay, 'yyyy-MM-dd');
                    return finalPlan[currentDayStr].length < finalPlan[minDayStr].length ? currentDay : minDay;
                });

                const dayStr = format(dayWithFewestLessons, 'yyyy-MM-dd');
                finalPlan[dayStr].push(course.id);
                remainingLessonsByCourse[course.id]--;
                remainingTotal--;
            }
        }
    }

    return finalPlan;
}


/**
 * Takes a plan with lesson counts and builds the final, sequenced schedule.
 */
function buildFinalSchedule(planWithCounts: Record<string, string[]>, input: GenerateScheduleInput): Schedule {
  const finalSchedule: Schedule = {};
  const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];

  // Create a mutable queue for each course's lessons
  const lessonQueues: Record<string, { id: string, title: string }[]> = {};
  input.courses.forEach(course => {
    lessonQueues[course.id] = [...course.lessons];
  });

  const sortedDays = Object.keys(planWithCounts).sort();

  sortedDays.forEach(day => {
    const courseIdsForDay = planWithCounts[day];
    if (courseIdsForDay.length === 0) {
        finalSchedule[day] = []; // Keep rest days in the final schedule
        return;
    }
    
    if (!finalSchedule[day]) {
      finalSchedule[day] = [];
    }

    courseIdsForDay.forEach(courseId => {
      const lessonToSchedule = lessonQueues[courseId]?.shift();
      if (lessonToSchedule) {
        const time = studyTimes[finalSchedule[day].length % studyTimes.length] || "08:00 PM";
        finalSchedule[day].push({
          lessonId: lessonToSchedule.id,
          courseId: courseId,
          title: lessonToSchedule.title,
          time: time,
        });
      }
    });

    finalSchedule[day].sort((a, b) => {
        const timeA = parse(a.time, 'hh:mm a', new Date());
        const timeB = parse(b.time, 'hh:mm a', new Date());
        return timeA.getTime() - timeB.getTime();
    });
  });

  return finalSchedule;
}


self.onmessage = async (event: MessageEvent<GenerateScheduleInput>) => {
  try {
    // 1. Get the high-level plan from the AI flow
    const aiPlan = await generateStudySchedulePlan(event.data);
    
    // 2. Distribute all lessons across the AI's plan to get exact counts
    const planWithCounts = distributeLessonsToPlan(aiPlan, event.data);

    // 3. Deterministically build the final schedule from the counted plan
    const finalSchedule = buildFinalSchedule(planWithCounts, event.data);

    // 4. Post the result back to the main thread
    self.postMessage(finalSchedule);
  } catch (error) {
    console.error('Error in scheduler worker:', error);
    self.postMessage({ error: (error as Error).message || 'An unknown error occurred in the scheduler.' });
  }
};

export {};
