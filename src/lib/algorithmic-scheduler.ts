import { eachDayOfInterval, format, parseISO } from 'date-fns';
import type { GenerateScheduleInput, GenerateScheduleOutput, Course, Lesson } from './types';

export function generateScheduleAlgorithmically(input: Omit<GenerateScheduleInput, 'customInstructions'>): GenerateScheduleOutput {
    const { lessons, startDate, endDate, isLazy, prefersMultipleLessons } = input;

    const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
    });

    if (days.length === 0 || lessons.length === 0) {
        return {};
    }

    // Determine lessons per day
    const baseLessonsPerDay = Math.ceil(lessons.length / days.length);
    const lessonsPerDay = isLazy ? Math.max(1, Math.floor(baseLessonsPerDay * 0.75)) : Math.min(6, baseLessonsPerDay);
    
    const schedule: GenerateScheduleOutput = {};
    days.forEach(day => {
        schedule[format(day, 'yyyy-MM-dd')] = [];
    });

    const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];
    
    let dayIndex = 0;
    const lastScheduledCourseOnDay: Record<string, string> = {};

    lessons.forEach(lesson => {
        let scheduled = false;
        let startDayIndex = dayIndex; // Remember where we started looking for a slot

        while (!scheduled) {
            const dayString = format(days[dayIndex % days.length], 'yyyy-MM-dd');
            const daySchedule = schedule[dayString];

            // Check if we can add to this day
            if (daySchedule.length < lessonsPerDay) {
                // Check variety rule if needed
                if (!prefersMultipleLessons) {
                    const lastCourseId = lastScheduledCourseOnDay[dayString];
                    if (lastCourseId && lastCourseId === lesson.courseId) {
                        // Can't schedule, move to next day
                    } else {
                        // It's okay to schedule
                        const time = studyTimes[daySchedule.length % studyTimes.length];
                        daySchedule.push({ lessonId: lesson.id, courseId: lesson.courseId, time, title: lesson.title });
                        lastScheduledCourseOnDay[dayString] = lesson.courseId;
                        scheduled = true;
                        // Don't advance dayIndex yet, try to fill this day first
                        continue;
                    }
                } else {
                    // It's always okay to schedule if multiple are preferred
                    const time = studyTimes[daySchedule.length % studyTimes.length];
                    daySchedule.push({ lessonId: lesson.id, courseId: lesson.courseId, time, title: lesson.title });
                    scheduled = true;
                    // Don't advance dayIndex yet
                    continue;
                }
            }
            
            // If we couldn't schedule, move to the next day and try again
            dayIndex++;

            // Failsafe to prevent infinite loops if schedule is too packed
            if (dayIndex % days.length === startDayIndex) {
                 // We've looped through all days and couldn't find a spot.
                 // Force schedule it on the next available day that has the least items.
                 let leastBusyDay = Object.keys(schedule).reduce((a, b) => schedule[a].length < schedule[b].length ? a : b);
                 const daySchedule = schedule[leastBusyDay];
                 const time = studyTimes[daySchedule.length % studyTimes.length];
                 daySchedule.push({ lessonId: lesson.id, courseId: lesson.courseId, time, title: lesson.title });
                 scheduled = true;
            }
        }
    });

    // Remove any empty days from the schedule
    Object.keys(schedule).forEach(day => {
        if (schedule[day].length === 0) {
            delete schedule[day];
        }
    });

    return schedule;
}
