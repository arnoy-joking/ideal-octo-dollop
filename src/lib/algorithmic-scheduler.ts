
import { eachDayOfInterval, format, parse, parseISO } from 'date-fns';
import type { GenerateScheduleInput, GenerateScheduleOutput, Lesson } from './types';

interface LessonToSchedule extends Omit<Lesson, 'duration' | 'videoId' | 'pdfUrl'> {
    id: string;
    courseId: string;
}

export function generateScheduleAlgorithmically(input: GenerateScheduleInput): GenerateScheduleOutput {
    const { courses, startDate, endDate, isLazy, prefersMultipleLessons } = input;
    
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

    // Create a correctly ordered queue for each course.
    // This approach is robust and avoids unstable sort issues.
    const courseQueues: Record<string, LessonToSchedule[]> = {};
    courses.forEach(course => {
        // Directly map over the original, ordered lessons to preserve sequence.
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

    // 2. Intelligent `isLazy` handling: Insert rest days
    let studyDays = [...availableDays];
    if (isLazy && availableDays.length > 3) {
        const restDayCount = Math.max(1, Math.floor(availableDays.length / 5)); // e.g., 1 rest day every 5 days
        const studyDayCount = availableDays.length - restDayCount;
        if (studyDayCount >= totalLessons) { 
            // Distribute rest days evenly if possible
            const restDayInterval = Math.floor(availableDays.length / (restDayCount + 1));
            studyDays = [];
            for (let i = 0; i < availableDays.length; i++) {
                if ((i + 1) % (restDayInterval + 1) !== 0 || studyDays.length >= studyDayCount) {
                    studyDays.push(availableDays[i]);
                }
            }
        }
    }
    
    if (studyDays.length === 0) studyDays = availableDays;


    // 3. Calculate daily lesson quotas
    const lessonsPerStudyDay = Math.ceil(totalLessons / studyDays.length);
    const dailyQuotas: Record<string, number> = {};
    let lessonsToDistribute = totalLessons;

    studyDays.forEach(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        const quota = Math.min(lessonsPerStudyDay, lessonsToDistribute);
        dailyQuotas[dayString] = quota;
        lessonsToDistribute -= quota;
    });

    if (lessonsToDistribute > 0) {
        studyDays.forEach(day => {
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

    // Pass 1: Assign one unique course per slot to ensure variety
    studyDays.forEach(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        for (let i = 0; i < dailyQuotas[dayString]; i++) {
            let attempts = 0;
            while (attempts < courseIds.length) {
                const courseId = courseIds[courseIndex % courseIds.length];
                courseIndex++;
                
                if (courseQueues[courseId].length > 0 && !schedule[dayString].some(l => l.courseId === courseId)) {
                    const lesson = courseQueues[courseId].shift()!;
                    const time = studyTimes[schedule[dayString].length % studyTimes.length];
                    schedule[dayString].push({ ...lesson, time });
                    break;
                }
                attempts++;
            }
        }
    });

    // Pass 2: Fill remaining slots if `prefersMultipleLessons` is true or if needed
    studyDays.forEach(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        while (schedule[dayString].length < dailyQuotas[dayString]) {
             let attempts = 0;
             let lessonAdded = false;
             while (attempts < courseIds.length && !lessonAdded) {
                const courseId = courseIds[courseIndex % courseIds.length];
                courseIndex++;
                
                if (courseQueues[courseId].length > 0) {
                    const canAddDuplicate = prefersMultipleLessons || courseIds.filter(id => courseQueues[id].length > 0).length === 1;
                    if(canAddDuplicate) {
                        const lesson = courseQueues[courseId].shift()!;
                        const time = studyTimes[schedule[dayString].length % studyTimes.length];
                        schedule[dayString].push({ ...lesson, time });
                        lessonAdded = true;
                    }
                }
                attempts++;
             }
             if (!lessonAdded) break; 
        }
    });


    // Final cleanup and sorting
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
