import { eachDayOfInterval, format, parseISO } from 'date-fns';
import type { GenerateScheduleInput, GenerateScheduleOutput, Course, Lesson } from './types';

// Helper function to group lessons by course
function groupLessonsByCourse(lessons: GenerateScheduleInput['lessons']) {
    const courseLessonMap: Record<string, any[]> = {};
    for (const lesson of lessons) {
        if (!courseLessonMap[lesson.courseId]) {
            courseLessonMap[lesson.courseId] = [];
        }
        courseLessonMap[lesson.courseId].push(lesson);
    }
    return courseLessonMap;
}

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
    
    // Group lessons by course to maintain order
    const courseLessonMap = groupLessonsByCourse(lessons);
    const courseQueues: Record<string, any[]> = { ...courseLessonMap };
    
    // Sort courses by number of lessons to help with distribution
    const courseOrder = Object.keys(courseQueues).sort((a, b) => courseQueues[b].length - courseQueues[a].length);

    const schedule: GenerateScheduleOutput = {};
    const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];

    let courseOrderIndex = 0;
    
    for (const day of days) {
        const dayString = format(day, 'yyyy-MM-dd');
        schedule[dayString] = [];

        const scheduledCoursesToday = new Set<string>();

        while (schedule[dayString].length < lessonsPerDay) {
            let scheduledSomething = false;

            // Loop through courses to pick a lesson
            for (let i = 0; i < courseOrder.length; i++) {
                if (schedule[dayString].length >= lessonsPerDay) break;

                const courseId = courseOrder[courseOrderIndex % courseOrder.length];
                courseOrderIndex++;

                if (courseQueues[courseId] && courseQueues[courseId].length > 0) {
                     // If we don't prefer multiple and we've already scheduled this course today, skip it
                    if (!prefersMultipleLessons && scheduledCoursesToday.has(courseId)) {
                        continue;
                    }
                    
                    const lessonToSchedule = courseQueues[courseId].shift(); // Get next lesson in sequence
                    if (lessonToSchedule) {
                        schedule[dayString].push({
                            lessonId: lessonToSchedule.id,
                            courseId: lessonToSchedule.courseId,
                            time: studyTimes[schedule[dayString].length % studyTimes.length],
                            title: lessonToSchedule.title,
                        });
                        scheduledCoursesToday.add(courseId);
                        scheduledSomething = true;
                    }
                }
            }

            // If we couldn't schedule anything in a full loop, break to avoid infinite loop
            if (!scheduledSomething) {
                break;
            }
        }
    }
    
    // If there are still lessons left (e.g. from strict no-multiple-lessons rule), distribute them
    const remainingLessons = Object.values(courseQueues).flat();
    if (remainingLessons.length > 0) {
        let dayIndex = 0;
        for (const lesson of remainingLessons) {
            const dayString = format(days[dayIndex % days.length], 'yyyy-MM-dd');
            if (schedule[dayString].length < lessonsPerDay + 2) { // Allow some overflow
                 schedule[dayString].push({
                    lessonId: lesson.id,
                    courseId: lesson.courseId,
                    time: studyTimes[schedule[dayString].length % studyTimes.length],
                    title: lesson.title,
                });
            }
            dayIndex++;
        }
    }

    return schedule;
}
