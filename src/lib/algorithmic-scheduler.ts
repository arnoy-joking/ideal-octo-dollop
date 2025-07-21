import { eachDayOfInterval, format, parseISO } from 'date-fns';
import type { GenerateScheduleInput, GenerateScheduleOutput, Lesson } from './types';

interface LessonToSchedule extends Omit<Lesson, 'id' | 'duration' | 'videoId' | 'pdfUrl'> {
    id: string;
    courseId: string;
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

    const lessonsPerDay = Math.ceil(lessons.length / days.length);
    const maxLessonsPerDay = isLazy ? Math.max(1, Math.floor(lessonsPerDay * 0.8)) : Math.min(6, lessonsPerDay + 1);

    const schedule: GenerateScheduleOutput = {};
    days.forEach(day => {
        schedule[format(day, 'yyyy-MM-dd')] = [];
    });

    const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];
    
    let lessonQueue: LessonToSchedule[] = [...lessons];
    let dayIndex = 0;
    
    const lessonsByCourse: Record<string, LessonToSchedule[]> = {};
    lessonQueue.forEach(l => {
        if (!lessonsByCourse[l.courseId]) lessonsByCourse[l.courseId] = [];
        lessonsByCourse[l.courseId].push(l);
    });

    while(lessonQueue.length > 0) {
        const dayString = format(days[dayIndex % days.length], 'yyyy-MM-dd');
        const daySchedule = schedule[dayString];

        if (daySchedule.length >= maxLessonsPerDay) {
            dayIndex++;
            continue;
        }
        
        let scheduledLesson = false;
        
        const scheduledCoursesToday = new Set(daySchedule.map(l => l.courseId));
        
        const courseOrder = Object.keys(lessonsByCourse).sort((a,b) => {
            if (scheduledCoursesToday.has(a) && !scheduledCoursesToday.has(b)) return 1;
            if (!scheduledCoursesToday.has(a) && scheduledCoursesToday.has(b)) return -1;
            return (lessonsByCourse[b]?.length || 0) - (lessonsByCourse[a]?.length || 0);
        });
        
        for (const courseId of courseOrder) {
            if (lessonsByCourse[courseId] && lessonsByCourse[courseId].length > 0) {
                 if (!prefersMultipleLessons && scheduledCoursesToday.has(courseId)) {
                    continue; 
                }
                
                const lessonToSchedule = lessonsByCourse[courseId].shift();

                if (lessonToSchedule) {
                    const time = studyTimes[daySchedule.length % studyTimes.length];
                    daySchedule.push({
                        lessonId: lessonToSchedule.id,
                        courseId: lessonToSchedule.courseId,
                        title: lessonToSchedule.title,
                        time
                    });

                    lessonQueue = lessonQueue.filter(l => l.id !== lessonToSchedule.id);
                    scheduledLesson = true;
                    break; 
                }
            }
        }
        
        if (!scheduledLesson) {
             const fallbackCourse = Object.values(lessonsByCourse).find(c => c.length > 0);
             if (fallbackCourse) {
                 const lessonToSchedule = fallbackCourse.shift();
                 if(lessonToSchedule) {
                    const time = studyTimes[daySchedule.length % studyTimes.length];
                    daySchedule.push({
                        lessonId: lessonToSchedule.id,
                        courseId: lessonToSchedule.courseId,
                        title: lessonToSchedule.title,
                        time
                    });
                    lessonQueue = lessonQueue.filter(l => l.id !== lessonToSchedule.id);
                 }
             }
        }

        dayIndex++;
    }

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
