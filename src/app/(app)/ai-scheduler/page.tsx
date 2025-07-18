'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { DateRange } from 'react-day-picker';
import { format, eachDayOfInterval, isToday, parseISO, parse } from 'date-fns';
import type { Course, Lesson, GenerateScheduleOutput } from '@/lib/types';

import { getCoursesAction } from '@/app/actions/course-actions';
import { generateStudySchedule } from '@/ai/flows/scheduler-flow';
import { getScheduleAction, saveScheduleAction, deleteScheduleAction } from '@/app/actions/scheduler-actions';
import { getWatchedLessonIdsAction, markLessonAsWatchedAction } from '@/app/actions/progress-actions';

import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, PlusCircle, Loader2, CalendarPlus, Trash2, CheckCircle } from 'lucide-react';

type LessonSelection = {
    [courseId: string]: Set<string>;
};

function AISchedulerDialog({ courses, onScheduleGenerated }: { courses: Course[], onScheduleGenerated: (schedule: GenerateScheduleOutput) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const [selectedLessons, setSelectedLessons] = useState<LessonSelection>({});
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isLazy, setIsLazy] = useState<"yes" | "no">("no");
    const [prefersMultiple, setPrefersMultiple] = useState<"yes" | "no">("yes");
    const [customInstructions, setCustomInstructions] = useState('');

    const toggleLesson = (courseId: string, lessonId: string) => {
        setSelectedLessons(prev => {
            const newSelection = { ...prev };
            const courseSet = newSelection[courseId] ? new Set(newSelection[courseId]) : new Set<string>();
            
            if (courseSet.has(lessonId)) {
                courseSet.delete(lessonId);
            } else {
                courseSet.add(lessonId);
            }
            newSelection[courseId] = courseSet;
            return newSelection;
        });
    };

    const handleGenerate = async () => {
        const flatSelectedLessons = Object.entries(selectedLessons).flatMap(([courseId, lessonIds]) => 
            Array.from(lessonIds).map(lessonId => {
                const course = courses.find(c => c.id === courseId);
                const lesson = course?.lessons.find(l => l.id === lessonId);
                return { 
                    id: lesson!.id, 
                    title: lesson!.title,
                    courseId: course!.id,
                    courseTitle: course!.title
                };
            })
        );

        if (flatSelectedLessons.length === 0) {
            toast({ title: 'No lessons selected', description: 'Please select at least one lesson to schedule.', variant: 'destructive' });
            return;
        }
        if (!dateRange?.from || !dateRange?.to) {
            toast({ title: 'Date range not selected', description: 'Please select a start and end date.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateStudySchedule({
                lessons: flatSelectedLessons,
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd'),
                isLazy: isLazy === 'yes',
                prefersMultipleLessons: prefersMultiple === 'yes',
                customInstructions: customInstructions,
            });
            onScheduleGenerated(result);
            toast({ title: 'Schedule Generated!', description: 'Your new AI-powered study schedule is ready.' });
            setIsOpen(false);
        } catch (error) {
            console.error("AI Schedule Generation Error: ", error);
            toast({ title: 'Generation Failed', description: 'The AI could not generate a schedule. Please try again.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2" />Create New Schedule</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create AI-Powered Study Schedule</DialogTitle>
                    <DialogDescription>Select lessons, a date range, and your preferences. The AI will handle the rest.</DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2 -mr-6 pl-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">1. Select Lessons</h3>
                            <Card className="max-h-80">
                                <ScrollArea className="h-80">
                                    <CardContent className="p-4">
                                        <Accordion type="multiple" className="w-full">
                                            {courses.map(course => (
                                                <AccordionItem key={course.id} value={course.id}>
                                                    <AccordionTrigger>{course.title}</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="space-y-2 pl-2">
                                                            {course.lessons.map(lesson => (
                                                                <div key={lesson.id} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`lesson-${lesson.id}`}
                                                                        onCheckedChange={() => toggleLesson(course.id, lesson.id)}
                                                                        checked={selectedLessons[course.id]?.has(lesson.id) || false}
                                                                    />
                                                                    <label htmlFor={`lesson-${lesson.id}`} className="text-sm cursor-pointer">{lesson.title}</label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </CardContent>
                                </ScrollArea>
                            </Card>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">2. Select Date Range</h3>
                            <Calendar
                                mode="range"
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={1}
                                className="p-0"
                            />
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">3. Answer Some Questions</h3>
                            <div className="space-y-4">
                                <Card>
                                    <CardContent className="p-4 space-y-2">
                                        <Label>Are you lazy?</Label>
                                        <RadioGroup value={isLazy} onValueChange={(val: "yes" | "no") => setIsLazy(val)}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="lazy-no" />
                                                <Label htmlFor="lazy-no">No, I'm diligent.</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="lazy-yes" />
                                                <Label htmlFor="lazy-yes">Yes, I prefer a relaxed pace.</Label>
                                            </div>
                                        </RadioGroup>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 space-y-2">
                                        <Label>Do you want to watch more than 1 lesson of the same course in a day?</Label>
                                         <RadioGroup value={prefersMultiple} onValueChange={(val: "yes" | "no") => setPrefersMultiple(val)}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="multi-yes" />
                                                <Label htmlFor="multi-yes">Yes, that's fine.</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="multi-no" />
                                                <Label htmlFor="multi-no">No, I prefer variety.</Label>
                                            </div>
                                        </RadioGroup>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">4. Custom Instructions (Optional)</h3>
                            <Textarea 
                                placeholder="e.g., I'm busy on weekdays before 6 PM. I want to study math on weekends..."
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                        Generate Schedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AISchedulerPage() {
    const { currentUser, isInitialLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [schedule, setSchedule] = useState<GenerateScheduleOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [watchedLessons, setWatchedLessons] = useState<Set<string>>(new Set());

    const loadData = useCallback(async (userId: string) => {
        setIsLoading(true);
        const [fetchedCourses, savedSchedule, watchedIds] = await Promise.all([
            getCoursesAction(),
            getScheduleAction(userId),
            getWatchedLessonIdsAction(userId)
        ]);
        setCourses(fetchedCourses);
        setSchedule(savedSchedule);
        setWatchedLessons(watchedIds);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (currentUser && !isUserLoading) {
            loadData(currentUser.id);
        }
    }, [currentUser, isUserLoading, loadData]);

    const handleScheduleGenerated = async (newSchedule: GenerateScheduleOutput) => {
        if (!currentUser) return;
        setSchedule(newSchedule);
        try {
            await saveScheduleAction(currentUser.id, newSchedule);
        } catch (error) {
            toast({ title: 'Error Saving', description: 'Could not save the new schedule.', variant: 'destructive' });
        }
    };
    
    const handleDeleteSchedule = async () => {
        if (!currentUser) return;
        startDeleteTransition(async () => {
            try {
                await deleteScheduleAction(currentUser.id);
                setSchedule(null);
                toast({ title: 'Schedule Deleted', description: 'Your AI schedule has been removed.' });
            } catch (error) {
                 toast({ title: 'Error', description: 'Could not delete the schedule.', variant: 'destructive' });
            }
        });
    };
    
    const handleToggleLessonComplete = async (lessonId: string, courseId: string, isCompleted: boolean) => {
        if (!currentUser || isCompleted) return; // Can't un-complete from here
        
        const lesson = courses.flatMap(c => c.lessons).find(l => l.id === lessonId);
        if (!lesson) return;

        setWatchedLessons(prev => new Set(prev).add(lessonId));

        try {
            await markLessonAsWatchedAction(currentUser.id, lesson, courseId);
            toast({ title: "Progress Saved!", description: `Marked "${lesson.title}" as complete.` });
        } catch (error) {
            setWatchedLessons(prev => {
                const newSet = new Set(prev);
                newSet.delete(lessonId);
                return newSet;
            });
            toast({ title: 'Error', description: 'Failed to save progress.', variant: 'destructive' });
        }
    };

    const courseMap = new Map(courses.map(c => [c.id, c]));

    const formatTime = (timeStr: string) => {
        try {
            // Handles both 'HH:mm' and 'h:mm a'
            const timeFormats = ['HH:mm', 'h:mm a', 'hh:mm a'];
            let parsedDate;
            for (const fmt of timeFormats) {
                const date = parse(timeStr, fmt, new Date());
                if (!isNaN(date.getTime())) {
                    parsedDate = date;
                    break;
                }
            }

            if (parsedDate) {
                return format(parsedDate, 'h:mm a');
            }
            return timeStr; // Fallback to original string if parsing fails
        } catch (error) {
            return timeStr; // Fallback
        }
    };

    const renderSchedule = () => {
        if (!schedule || Object.keys(schedule).length === 0) {
            return (
                 <div className="text-center py-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center">
                    <CalendarPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Schedule Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create a new AI-powered schedule to get started.
                    </p>
                    <div className="mt-6">
                        <AISchedulerDialog courses={courses} onScheduleGenerated={handleScheduleGenerated} />
                    </div>
                </div>
            );
        }

        const sortedDates = Object.keys(schedule).sort();
        const scheduleDays = eachDayOfInterval({
            start: parseISO(sortedDates[0]),
            end: parseISO(sortedDates[sortedDates.length - 1]),
        });

        return (
            <div>
                 <div className="flex justify-end gap-2 mb-4">
                    <Button variant="destructive" onClick={handleDeleteSchedule} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                        Delete Schedule
                    </Button>
                    <AISchedulerDialog courses={courses} onScheduleGenerated={handleScheduleGenerated} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {scheduleDays.map(day => {
                        const dayString = format(day, 'yyyy-MM-dd');
                        const lessonsForDay = schedule[dayString] || [];
                        return (
                            <Card key={dayString} className={cn(isToday(day) && "border-primary border-2")}>
                                <CardHeader>
                                    <CardTitle>{format(day, 'EEEE')}</CardTitle>
                                    <CardDescription>{format(day, 'MMMM d, yyyy')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {lessonsForDay.length > 0 ? lessonsForDay.map(lesson => {
                                        const isCompleted = watchedLessons.has(lesson.lessonId);
                                        return (
                                            <div 
                                                key={lesson.lessonId}
                                                className={cn(
                                                    "flex items-start gap-3 p-3 rounded-md bg-muted/50",
                                                    isCompleted && "bg-green-100 dark:bg-green-900/30"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={isCompleted}
                                                    onCheckedChange={() => handleToggleLessonComplete(lesson.lessonId, lesson.courseId, isCompleted)}
                                                    disabled={isCompleted}
                                                    className="mt-1 h-5 w-5"
                                                    aria-label={`Mark ${lesson.title} as complete`}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold">{formatTime(lesson.time)}</p>
                                                    <p className="text-sm text-muted-foreground">{lesson.title}</p>
                                                    <p className="text-xs text-muted-foreground/80">{courseMap.get(lesson.courseId)?.title}</p>
                                                </div>
                                                {isCompleted && <CheckCircle className="h-5 w-5 text-green-700 mt-1" />}
                                            </div>
                                        )
                                    }) : (
                                        <p className="text-sm text-muted-foreground text-center py-8">No lessons scheduled.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                 <div className="mb-8">
                    <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                        <Sparkles className="w-8 h-8" />
                        AI Target Scheduler
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Create a dynamic study plan to achieve your learning goals on time.
                    </p>
                </div>
                 {isLoading || isUserLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                 ) : renderSchedule()}
            </div>
        </main>
    );
}
