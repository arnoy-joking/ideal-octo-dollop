'use client';

import { useEffect, useState, useCallback } from "react";
import type { Course, Lesson } from "@/lib/types";
import { getCourseBySlug } from "@/lib/courses";
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
import { Badge } from "@/components/ui/badge";
import { Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/user-context";


export default function ClassPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [watchedLessons, setWatchedLessons] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const { currentUser, isLoading: isUserLoading } = useUser();

  const loadInitialData = useCallback(async (userId: string) => {
    setIsLoading(true);
    
    const [fetchedCourse, watchedLessonIds] = await Promise.all([
        getCourseBySlug(slug),
        getWatchedLessonIdsAction(userId)
    ]);
    
    setWatchedLessons(watchedLessonIds);

    if (fetchedCourse) {
      setCourse(fetchedCourse);
      
      const lastWatchedLessonId = await getLastWatchedLessonIdAction(userId, fetchedCourse.id);
      const initialLesson = fetchedCourse.lessons.find(l => l.id === lastWatchedLessonId) || fetchedCourse.lessons[0];
      
      if (initialLesson) {
        const progress = await getLessonProgressAction(userId, initialLesson.id);
        setStartTime(progress?.seekTo || 0);
        setCurrentLesson(initialLesson);
      }
    }
    setIsLoading(false);
  }, [slug]);


  useEffect(() => {
    if (!isUserLoading && currentUser) {
        loadInitialData(currentUser.id);
    }
  }, [currentUser, isUserLoading, loadInitialData]);

  const handleSelectLesson = useCallback(async (lesson: Lesson) => {
    if (!currentUser || !course) return;
    setCurrentLesson(null); 
    await setLastWatchedLessonAction(currentUser.id, course.id, lesson.id);

    const progress = await getLessonProgressAction(currentUser.id, lesson.id);
    
    setStartTime(progress?.seekTo || 0);
    setCurrentLesson(lesson);
  }, [currentUser, course]);

  const handleVideoEnd = useCallback(() => {
    if (!currentUser || !currentLesson || !course) return;

    if (watchedLessons.has(currentLesson.id)) return;

    setWatchedLessons(prev => new Set(prev).add(currentLesson.id));
    markLessonAsWatchedAction(currentUser.id, currentLesson, course.id);
  }, [currentUser, currentLesson, course, watchedLessons]);

  const handleProgress = useCallback((time: number) => {
    if (!currentUser || !currentLesson || !course || time === 0) return;
    updateLessonProgressAction(currentUser.id, course.id, currentLesson.id, { seekTo: time });
  }, [currentUser, currentLesson, course]);


  if (isLoading || isUserLoading) {
     return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-2 space-y-8">
                        <Skeleton className="w-full aspect-video rounded-lg" />
                         <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-64 w-full rounded-lg" />
                    </div>
                    <div className="md:sticky md:top-24">
                       <Skeleton className="h-[480px] w-full rounded-lg" />
                    </div>
                </div>
            </div>
        </main>
     )
  }

  if (!course) {
    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto text-center">
                <h1 className="text-2xl font-bold">Course not found</h1>
                <p className="text-muted-foreground">The course you are looking for does not exist.</p>
                 <Button asChild className="mt-4">
                    <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        </main>
    )
  }

  const totalDuration = course.lessons.reduce((acc, lesson) => {
    const parts = lesson.duration.split(':').map(Number);
    let lessonSeconds = 0;
    if (parts.length === 3) {
      lessonSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    } else if (parts.length === 2) {
      lessonSeconds = (parts[0] * 60) + parts[1];
    } else if (parts.length === 1) {
      lessonSeconds = parts[0];
    }
    return acc + lessonSeconds;
  }, 0);

  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);


  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-2 space-y-4">
            {currentLesson && (
              <VideoPlayer
                key={currentLesson.id}
                videoId={currentLesson.videoId}
                title={currentLesson.title}
                onVideoEnd={handleVideoEnd}
                startTime={startTime}
                onProgress={handleProgress}
              />
            )}
            {currentLesson?.pdfUrl && (
                 <Button asChild>
                    <a href={currentLesson.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF for current lesson
                    </a>
                </Button>
            )}
            <Card>
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <Badge variant="outline">{course.lessons.length} Lessons</Badge>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{hours > 0 ? `${hours}h ` : ''}{minutes}m total</span>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2 text-lg">About this course</h3>
                <p className="text-muted-foreground">{course.description}</p>
              </CardContent>
            </Card>
          </div>
          <div className="md:sticky md:top-24">
            <LessonList
              lessons={course.lessons}
              activeLessonId={currentLesson?.id || ""}
              onLessonClick={handleSelectLesson}
              watchedLessons={watchedLessons}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
