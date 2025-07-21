
/// <reference lib="webworker" />
import { generateSchedulePlan } from '../ai/flows/scheduler-flow';
import type { GenerateScheduleInput, Schedule } from '../lib/types';
import { parse } from 'date-fns';

// This function takes the AI's high-level plan and deterministically
// builds the final, perfectly-sequenced schedule.
function buildFinalSchedule(plan: Record<string, string[]>, input: GenerateScheduleInput): Schedule {
  const finalSchedule: Schedule = {};
  const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];

  // Create a mutable queue for each course's lessons
  const lessonQueues: Record<string, { id: string, title: string }[]> = {};
  input.courses.forEach(course => {
    lessonQueues[course.id] = [...course.lessons];
  });

  const sortedDays = Object.keys(plan).sort();

  sortedDays.forEach(day => {
    const courseIdsForDay = plan[day];
    if (!finalSchedule[day]) {
      finalSchedule[day] = [];
    }

    courseIdsForDay.forEach(courseId => {
      // Pull the next lesson from the correct course queue
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

    // Sort the lessons for the day by time
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
    const plan = await generateSchedulePlan(event.data);
    
    // 2. Deterministically build the final schedule from the plan
    const finalSchedule = buildFinalSchedule(plan, event.data);

    // 3. Post the result back to the main thread
    self.postMessage(finalSchedule);
  } catch (error) {
    console.error('Error in scheduler worker:', error);
    self.postMessage({ error: (error as Error).message || 'An unknown error occurred in the scheduler.' });
  }
};

export {};
