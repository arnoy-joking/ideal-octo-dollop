'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Compass, User, CheckCircle, Star, History } from 'lucide-react';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getUsersAction } from '@/app/actions/user-actions';
import { getPublicProgressDataAction } from '@/app/actions/progress-actions';
import type { User as UserType, Course, Lesson, PublicProgress } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type ProgressData = Record<string, PublicProgress>;
type CourseMap = Record<string, Course>;
type LessonMap = Record<string, Lesson>;

function ProgressList({ title, lessonIds, lessonMap, courseMap, icon: Icon }: { title: string, lessonIds: string[], lessonMap: LessonMap, courseMap: CourseMap, icon: React.ElementType }) {
    const lessonsByCourse: Record<string, Lesson[]> = {};
    
    lessonIds.forEach(lessonId => {
        const lesson = lessonMap[lessonId];
        if (lesson) {
            const course = Object.values(courseMap).find(c => c.lessons.some(l => l.id === lesson.id));
            if (course) {
                if (!lessonsByCourse[course.id]) {
                    lessonsByCourse[course.id] = [];
                }
                lessonsByCourse[course.id].push(lesson);
            }
        }
    });

    if (Object.keys(lessonsByCourse).length === 0) {
        return (
             <div className="flex items-center gap-4 text-muted-foreground p-4">
                <Icon className="h-5 w-5" />
                <span>No lessons to show for this period.</span>
            </div>
        )
    }

    return (
        <div className="space-y-4">
             {Object.entries(lessonsByCourse).map(([courseId, lessons]) => (
                <Card key={courseId}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{courseMap[courseId]?.title}</CardTitle>
                        <CardDescription>{lessons.length} lesson{lessons.length > 1 ? 's' : ''}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                            {lessons.map(lesson => (
                                <li key={lesson.id} className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>{lesson.title}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


export default function ProgressPage() {
    const [progress, setProgress] = useState<ProgressData>({});
    const [users, setUsers] = useState<UserType[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [courseMap, setCourseMap] = useState<CourseMap>({});
    const [lessonMap, setLessonMap] = useState<LessonMap>({});

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            const [fetchedUsers, fetchedCourses, allProgress] = await Promise.all([
                getUsersAction(), 
                getCoursesAction(),
                getPublicProgressDataAction()
            ]);
            setUsers(fetchedUsers);
            setCourses(fetchedCourses);
            setProgress(allProgress);

            const newCourseMap: CourseMap = {};
            const newLessonMap: LessonMap = {};
            fetchedCourses.forEach(course => {
                newCourseMap[course.id] = course;
                course.lessons.forEach(lesson => {
                    newLessonMap[lesson.id] = lesson;
                });
            });
            setCourseMap(newCourseMap);
            setLessonMap(newLessonMap);

            setIsLoading(false);
        }
        loadData();
    }, []);

    const allLessonsCount = courses.reduce((acc, course) => acc + course.lessons.length, 0);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="p-4 flex justify-between items-center border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Compass className="w-8 h-8" />
                    <span>Course Compass</span>
                </Link>
                <nav className="flex gap-4 items-center">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard">Back to Dashboard</Link>
                    </Button>
                </nav>
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-headline font-bold text-primary">Learner Progress</h1>
                        <p className="text-muted-foreground mt-2">A public overview of everyone's learning journey.</p>
                    </div>

                    {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                         </div>
                    ) : (
                        <Accordion type="multiple" defaultValue={users.map(u => u.id)} className="w-full space-y-4">
                            {users.map(user => {
                                const userProgress = progress[user.id] || { today: [], all: [] };
                                const completedCount = userProgress.all.length;
                                const percentage = allLessonsCount > 0 ? Math.round((completedCount / allLessonsCount) * 100) : 0;
                                
                                return (
                                <Card key={user.id} className="overflow-hidden">
                                <AccordionItem value={user.id} className="border-b-0">
                                    <AccordionTrigger className="p-6 hover:no-underline hover:bg-muted/50">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full pr-4 text-left">
                                            <div className="flex items-center gap-3 flex-1">
                                                <User className="h-6 w-6 text-primary" />
                                                <span className="font-semibold text-lg">{user.name}</span>
                                            </div>
                                            <div className="text-left sm:text-right w-full sm:w-auto">
                                                <div className="font-bold">{percentage}% complete</div>
                                                <div className="text-sm text-muted-foreground">{completedCount} / {allLessonsCount} lessons</div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 pt-0">
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                                    <Star className="text-amber-500" />
                                                    Today's Progress
                                                </h3>
                                                <ProgressList 
                                                    title="Today's Progress"
                                                    lessonIds={userProgress.today}
                                                    lessonMap={lessonMap}
                                                    courseMap={courseMap}
                                                    icon={Star}
                                                />
                                            </div>

                                            <Accordion type="single" collapsible className="w-full">
                                                <AccordionItem value="all-time">
                                                    <AccordionTrigger>
                                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                                            <History />
                                                            All-Time Progress
                                                        </h3>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-4">
                                                         <ProgressList 
                                                            title="All-Time Progress"
                                                            lessonIds={userProgress.all}
                                                            lessonMap={lessonMap}
                                                            courseMap={courseMap}
                                                            icon={History}
                                                        />
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>

                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                </Card>
                            )})}
                        </Accordion>
                    )}
                </div>
            </main>
        </div>
    );
}
