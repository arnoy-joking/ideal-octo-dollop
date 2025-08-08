
'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Course, Lesson, Schedule } from "@/lib/types";
import { getCourseByIdAction } from "@/app/actions/course-actions";
import { getScheduleAction } from "@/actions/scheduler-actions";
import {
  getLastWatchedLessonIdAction,
  setLastWatchedLessonAction,
  getWatchedLessonIdsAction,
  markLessonAsWatchedAction,
  getLessonProgressAction,
  updateLessonProgressAction
} from "@/app/actions/progress-actions";
import { VideoPlayer } from "@/components/video-player";
import { LessonList } from "@/components/lesson-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/user-context";
import { format, isToday, parseISO } from 'date-fns';
import { BookCheck, CalendarX } from "lucide-react";


export default function DailyClassPage() {
  const { currentUser, isLoading: isUserLoading } = useUser();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [todaysLessons, setTodaysLessons] = useState<Lesson[]>([]);
  const [courseMap, setCourseMap] = useState<Map<string, Course>>(new Map());
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [watchedLessons, setWatchedLessons] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(0);


  const loadInitialData = useCallback(async (userId: string) => {
    setIsLoading(true);

    const [savedSchedule, watchedLessonIds] = await Promise.all([
      getScheduleAction(userId),
      getWatchedLessonIdsAction(userId)
    ]);

    setSchedule(savedSchedule);
    setWatchedLessons(watchedLessonIds);
    
    if (savedSchedule?.schedule) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const dayData = savedSchedule.schedule.find(d => d.date === todayStr);

        if (dayData?.lessons) {
            const lessonPromises = dayData.lessons.map(async (scheduledLesson) => {
                let course = courseMap.get(scheduledLesson.courseId);
                if (!course) {
                    course = await getCourseByIdAction(scheduledLesson.courseId);
                    if (course) {
                        setCourseMap(prev => new Map(prev).set(course!.id, course!));
                    }
                }
                if (course) {
                    return course.lessons.find(l => l.id === scheduledLesson.lessonId);
                }
                return null;
            });
            const lessons = (await Promise.all(lessonPromises)).filter(Boolean) as Lesson[];
            setTodaysLessons(lessons);

            if (lessons.length > 0) {
              // Find the last watched among today's lessons or default to the first
              let lastWatchedId: string | null = null;
              for (const lesson of lessons) {
                  const courseForLesson = Array.from(courseMap.values()).find(c => c.lessons.some(l => l.id === lesson.id));
                  if(courseForLesson) {
                    const lw = await getLastWatchedLessonIdAction(userId, courseForLesson.id);
                    if(lessons.some(l => l.id === lw)) {
                        lastWatchedId = lw;
                    }
                  }
              }

              const initialLesson = lessons.find(l => l.id === lastWatchedId) || lessons[0];
              if (initialLesson) {
                const progress = await getLessonProgressAction(userId, initialLesson.id);
                setStartTime(progress?.seekTo || 0);
                setCurrentLesson(initialLesson);
              }
            }
        }
    }
    setIsLoading(false);
  }, [currentUser?.id, courseMap]);

  useEffect(() => {
    if (!isUserLoading && currentUser) {
      loadInitialData(currentUser.id);
    }
  }, [currentUser, isUserLoading, loadInitialData]);

  const handleSelectLesson = useCallback(async (lesson: Lesson) => {
    if (!currentUser) return;
    const course = Array.from(courseMap.values()).find(c => c.lessons.some(l => l.id === lesson.id));
    if (!course) return;
    
    setCurrentLesson(null);
    await setLastWatchedLessonAction(currentUser.id, course.id, lesson.id);

    const progress = await getLessonProgressAction(currentUser.id, lesson.id);

    setStartTime(progress?.seekTo || 0);
    setCurrentLesson(lesson);
  }, [currentUser, courseMap]);

  const handleVideoEnd = useCallback(() => {
    if (!currentUser || !currentLesson) return;
    const course = Array.from(courseMap.values()).find(c => c.lessons.some(l => l.id === currentLesson.id));
    if (!course) return;

    if (watchedLessons.has(currentLesson.id)) return;

    setWatchedLessons(prev => new Set(prev).add(currentLesson.id));
    markLessonAsWatchedAction(currentUser.id, currentLesson, course.id);
  }, [currentUser, currentLesson, courseMap, watchedLessons]);

  const handleProgress = useCallback((time: number) => {
    if (!currentUser || !currentLesson || time === 0) return;
     const course = Array.from(courseMap.values()).find(c => c.lessons.some(l => l.id === currentLesson.id));
    if (!course) return;
    updateLessonProgressAction(currentUser.id, course.id, currentLesson.id, { seekTo: time });
  }, [currentUser, currentLesson, courseMap]);


  if (isLoading || isUserLoading) {
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-8">
              <Skeleton className="w-full aspect-video rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <div className="md:sticky md:top-24">
              <Skeleton className="h-[480px] w-full rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
         <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3 mb-8">
            <BookCheck className="w-8 h-8" />
            Today's Classes
        </h1>
        {todaysLessons.length > 0 && currentLesson ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-4">
              <VideoPlayer
                key={currentLesson.id}
                videoId={currentLesson.videoId}
                title={currentLesson.title}
                onVideoEnd={handleVideoEnd}
                startTime={startTime}
                onProgress={handleProgress}
              />
              <Card>
                <CardHeader>
                  <CardTitle>{currentLesson.title}</CardTitle>
                   <CardDescription>
                      Course: {courseMap.get(Array.from(courseMap.values()).find(c => c.lessons.some(l => l.id === currentLesson.id))!.id)?.title}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
            <div className="md:sticky md:top-24">
              <LessonList
                lessons={todaysLessons}
                activeLessonId={currentLesson?.id || ""}
                onLessonClick={handleSelectLesson}
                watchedLessons={watchedLessons}
              />
            </div>
          </div>
        ) : (
             <Card className="text-center py-24">
                <CardHeader>
                    <CalendarX className="mx-auto h-12 w-12 text-muted-foreground" />
                    <CardTitle className="mt-4">No Classes Today</CardTitle>
                    <CardDescription>There are no classes scheduled for today. Check the AI Scheduler to create a plan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/ai-scheduler">Go to AI Scheduler</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
      </div>
    </main>
  );
}
