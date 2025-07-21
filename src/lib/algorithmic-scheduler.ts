import { eachDayOfInterval, format, parseISO, parse } from 'date-fns';
import type { GenerateScheduleInput, GenerateScheduleOutput, Lesson } from './types';

interface LessonToSchedule extends Omit<Lesson, 'duration' | 'videoId' | 'pdfUrl'> {
    id: string;
    courseId: string;
}

export function generateScheduleAlgorithmically(input: GenerateScheduleInput): GenerateScheduleOutput {
    const { lessons, startDate, endDate, isLazy, prefersMultipleLessons } = input;

    const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
    });

    if (days.length === 0 || lessons.length === 0) {
        return {};
    }

    // 1. Group lessons by course and create queues
    const courseQueues: Record<string, LessonToSchedule[]> = {};
    lessons.forEach(lesson => {
        if (!courseQueues[lesson.courseId]) {
            courseQueues[lesson.courseId] = [];
        }
        courseQueues[lesson.courseId].push(lesson);
    });
    
    const courseIds = Object.keys(courseQueues);
    const totalLessons = lessons.length;
    const schedule: GenerateScheduleOutput = {};
    const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];
    
    // Initialize schedule object for all possible days
    days.forEach(day => {
        schedule[format(day, 'yyyy-MM-dd')] = [];
    });

    // 2. Calculate ideal lessons per day and max slots
    let lessonsPerDay = Math.ceil(totalLessons / days.length);
    if (isLazy) {
        lessonsPerDay = Math.max(1, Math.floor(lessonsPerDay * 0.8));
    }
    const maxSlotsPerDay = prefersMultipleLessons ? Math.min(6, lessonsPerDay + 2) : lessonsPerDay;

    let totalScheduled = 0;
    let dayIndex = 0;
    const courseLastScheduled: Record<string, number> = {};
    courseIds.forEach(id => courseLastScheduled[id] = -1);

    // 3. Fill the schedule day by day
    while(totalScheduled < totalLessons) {
        const dayString = format(days[dayIndex % days.length], 'yyyy-MM-dd');
        
        if (schedule[dayString].length >= maxSlotsPerDay) {
            dayIndex++;
            continue;
        }

        // Find the next course to schedule (round-robin style, prioritizing least recently used)
        let nextCourseId: string | undefined = undefined;
        let minLastScheduled = Infinity;
        
        courseIds.forEach(id => {
            if (courseQueues[id].length > 0) {
                 // Don't schedule the same course twice in a row on the same day unless it's the only option left
                const lastCourseOnThisDay = schedule[dayString][schedule[dayString].length - 1]?.courseId;
                if (!prefersMultipleLessons && lastCourseOnThisDay === id) {
                    return;
                }
                
                if (courseLastScheduled[id] < minLastScheduled) {
                    minLastScheduled = courseLastScheduled[id];
                    nextCourseId = id;
                }
            }
        });
        
        // Failsafe if the preferred course logic filters everything out
        if (!nextCourseId) {
             nextCourseId = courseIds.find(id => courseQueues[id].length > 0);
        }

        if (nextCourseId) {
            const lessonToSchedule = courseQueues[nextCourseId].shift();
            if (lessonToSchedule) {
                const time = studyTimes[schedule[dayString].length % studyTimes.length];
                schedule[dayString].push({
                    lessonId: lessonToSchedule.id,
                    courseId: lessonToSchedule.courseId,
                    title: lessonToSchedule.title,
                    time
                });
                
                courseLastScheduled[nextCourseId] = dayIndex;
                totalScheduled++;
            }
        } else {
            // No more lessons to schedule
            break;
        }

        dayIndex++;
    }


    // 4. Final cleanup: remove empty days and sort lessons by time
    Object.keys(schedule).forEach(day => {
        if (schedule[day].length === 0) {
            delete schedule[day];
        } else {
             schedule[day].sort((a, b) => {
                const timeA = parse(a.time, 'hh:mm a', new Date());
                const timeB = parse(b.time, 'hh:mm a', new Date());
                return timeA.getTime() - timeB.getTime();
            });
        }
    });

    return schedule;
}
