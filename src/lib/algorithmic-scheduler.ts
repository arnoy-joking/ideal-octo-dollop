
import { eachDayOfInterval, format, parse, parseISO } from 'date-fns';
import type { GenerateScheduleInput, GenerateScheduleOutput, Lesson } from './types';

interface LessonToSchedule extends Omit<Lesson, 'duration' | 'videoId' | 'pdfUrl'> {
    id: string;
    courseId: string;
}

export function generateScheduleAlgorithmically(input: Omit<GenerateScheduleInput, 'isLazy' | 'prefersMultipleLessons'>): GenerateScheduleOutput {
    const { courses, startDate, endDate } = input;
    
    if (!courses || courses.length === 0) {
        return {};
    }

    const allLessonsFlat = courses.flatMap(course => 
        course.lessons.map(lesson => ({
            ...lesson,
            courseId: course.id,
        }))
    );
    
    if (allLessonsFlat.length === 0) {
        return {};
    }

    const courseQueues: Record<string, LessonToSchedule[]> = {};
    courses.forEach(course => {
        courseQueues[course.id] = course.lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            courseId: course.id,
        }));
    });

    const totalLessons = allLessonsFlat.length;
    let availableDays = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
    });

    if (availableDays.length === 0) return {};

    const lessonsPerDay = Math.ceil(totalLessons / availableDays.length);
    const dailyQuotas: Record<string, number> = {};
    let lessonsToDistribute = totalLessons;

    availableDays.forEach(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        const quota = Math.min(lessonsPerDay, lessonsToDistribute);
        dailyQuotas[dayString] = quota;
        lessonsToDistribute -= quota;
    });

    if (lessonsToDistribute > 0) {
        availableDays.forEach(day => {
            if (lessonsToDistribute > 0) {
                 const dayString = format(day, 'yyyy-MM-dd');
                 dailyQuotas[dayString]++;
                 lessonsToDistribute--;
            }
        });
    }

    const schedule: GenerateScheduleOutput = {};
    availableDays.forEach(day => {
        schedule[format(day, 'yyyy-MM-dd')] = [];
    });
    
    const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];
    const courseIds = courses.map(c => c.id);
    let courseIndex = 0;

    availableDays.forEach(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        for (let i = 0; i < dailyQuotas[dayString]; i++) {
            let attempts = 0;
            while (attempts < courseIds.length) {
                const courseId = courseIds[courseIndex % courseIds.length];
                courseIndex++;
                
                if (courseQueues[courseId].length > 0) {
                    const lesson = courseQueues[courseId].shift()!;
                    const time = studyTimes[schedule[dayString].length % studyTimes.length];
                    schedule[dayString].push({ ...lesson, time });
                    break;
                }
                attempts++;
            }
        }
    });

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
