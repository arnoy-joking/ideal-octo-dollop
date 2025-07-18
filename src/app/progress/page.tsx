
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Compass, User, CheckCircle, Star, History, BarChart, BookOpen } from 'lucide-react';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getUsersAction } from '@/app/actions/user-actions';
import { getPublicProgressDataAction } from '@/app/actions/progress-actions';
import type { User as UserType, Course, Lesson, PublicProgress } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type ProgressData = Record<string, PublicProgress>;
type CourseMap = Record<string, Course>;
type LessonMap = Record<string, Lesson>;

function ProgressList({ lessonIds, lessonMap, courseMap, emptyMessage = "No lessons to show." }: { lessonIds: string[], lessonMap: LessonMap, courseMap: CourseMap, emptyMessage?: string }) {
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
             <div className="flex flex-col items-center justify-center gap-4 text-center text-muted-foreground p-8 h-96">
                <BookOpen className="h-8 w-8" />
                <p>{emptyMessage}</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-96 pr-4">
            <div className="space-y-4">
                {Object.entries(lessonsByCourse).map(([courseId, lessons]) => (
                    <div key={courseId} className="space-y-2">
                        <h4 className="font-semibold">{courseMap[courseId]?.title}</h4>
                        <ul className="space-y-1">
                            {lessons.map(lesson => (
                                <li key={lesson.id} className="flex items-center gap-3 text-sm text-muted-foreground ml-2">
                                    <CheckCircle className="h-4 w-4 text-green-700" />
                                    <span>{lesson.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </ScrollArea>
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
            try {
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
            } catch (error) {
                console.error("Failed to load progress data:", error);
            } finally {
                setIsLoading(false);
            }
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
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8 text-center">
                        <h1 className="text-4xl font-headline font-bold text-primary">Learner Progress</h1>
                        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                            A public overview of everyone's learning journey. See who's making strides and get inspired!
                        </p>
                    </div>

                    {isLoading ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <Card key={i}>
                                    <CardHeader className="flex flex-row items-center gap-4">
                                        <Skeleton className="h-14 w-14 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-3 w-20 ml-auto" />
                                        </div>
                                        <Skeleton className="h-48 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                         </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-10">
                            <User className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Users Found</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Add a profile from the login page to start tracking progress.
                            </p>
                            <Button asChild className="mt-4">
                                <Link href="/login">Go to Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.map(user => {
                                const userProgress = progress[user.id] || { today: [], recent: [], all: [] };
                                const completedCount = userProgress.all.length;
                                const percentage = allLessonsCount > 0 ? Math.round((completedCount / allLessonsCount) * 100) : 0;
                                
                                return (
                                <Card key={user.id} className="flex flex-col">
                                    <CardHeader className="flex flex-row items-center gap-4">
                                        <Avatar className="h-14 w-14 border-2 border-primary">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle>{user.name}</CardTitle>
                                            <CardDescription>Overall Progress</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow flex flex-col">
                                       <div className="space-y-2 mb-6">
                                            <Progress value={percentage} aria-label={`${percentage}% complete`} />
                                            <p className="text-sm text-muted-foreground text-right font-medium">
                                                {completedCount} / {allLessonsCount} lessons ({percentage}%)
                                            </p>
                                       </div>

                                        <Tabs defaultValue="today" className="w-full flex-grow flex flex-col">
                                            <TabsList className="grid w-full grid-cols-3">
                                                <TabsTrigger value="today"><Star className="mr-2 h-4 w-4" />Today</TabsTrigger>
                                                <TabsTrigger value="recent"><BarChart className="mr-2 h-4 w-4" />Recent</TabsTrigger>
                                                <TabsTrigger value="all"><History className="mr-2 h-4 w-4" />All Time</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="today" className="pt-4 flex-grow">
                                                 <ProgressList 
                                                    lessonIds={userProgress.today}
                                                    lessonMap={lessonMap}
                                                    courseMap={courseMap}
                                                    emptyMessage="No lessons completed today."
                                                />
                                            </TabsContent>
                                            <TabsContent value="recent" className="pt-4 flex-grow">
                                                 <ProgressList 
                                                    lessonIds={userProgress.recent}
                                                    lessonMap={lessonMap}
                                                    courseMap={courseMap}
                                                    emptyMessage="No lessons completed in the last 3 days."
                                                />
                                            </TabsContent>
                                            <TabsContent value="all" className="pt-4 flex-grow">
                                                 <ProgressList 
                                                    lessonIds={userProgress.all}
                                                    lessonMap={lessonMap}
                                                    courseMap={courseMap}
                                                    emptyMessage="No lessons completed yet."
                                                />
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            )})}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
