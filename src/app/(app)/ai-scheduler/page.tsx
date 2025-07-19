
'use client';

import { useState, useEffect, useRef, useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, isToday, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';

import type { Course, Lesson, ScheduledLesson, Schedule } from '@/lib/types';
import { generateStudySchedule } from '@/ai/flows/scheduler-flow';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getScheduleAction, saveScheduleAction, deleteScheduleAction } from '@/app/actions/scheduler-actions';
import { getWatchedLessonIdsAction, markLessonAsWatchedAction } from '@/app/actions/progress-actions';
import { useUser } from '@/context/user-context';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Sparkles, Loader2, CheckCircle, Download, ListChecks, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const scheduleRequestSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date({ required_error: "An end date is required." }),
  }),
  isLazy: z.boolean(),
  prefersMultipleLessons: z.boolean(),
  customInstructions: z.string().optional(),
});

type ScheduleRequestData = z.infer<typeof scheduleRequestSchema>;

function ScheduleCreatorDialog({ courses, onScheduleGenerated }: { courses: Course[], onScheduleGenerated: (schedule: Schedule) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<Record<string, Lesson[]>>({});
  const { toast } = useToast();

  const form = useForm<ScheduleRequestData>({
    resolver: zodResolver(scheduleRequestSchema),
    defaultValues: {
      dateRange: {
        from: undefined,
        to: undefined,
      },
      isLazy: false,
      prefersMultipleLessons: false,
      customInstructions: '',
    },
  });
  
  const dateRange = form.watch('dateRange');

  const toggleLesson = (course: Course, lesson: Lesson) => {
    setSelectedLessons(prev => {
        const currentCourseLessons = prev[course.id] ? [...prev[course.id]] : [];
        const lessonIndex = currentCourseLessons.findIndex(l => l.id === lesson.id);

        if (lessonIndex > -1) {
            currentCourseLessons.splice(lessonIndex, 1);
        } else {
            currentCourseLessons.push(lesson);
            // Sort to maintain original lesson order
            currentCourseLessons.sort((a, b) => 
                course.lessons.findIndex(l => l.id === a.id) - course.lessons.findIndex(l => l.id === b.id)
            );
        }

        const newSelected = { ...prev };
        if (currentCourseLessons.length > 0) {
            newSelected[course.id] = currentCourseLessons;
        } else {
            delete newSelected[course.id];
        }
        
        return newSelected;
    });
  };
  
  const toggleCourse = (course: Course, isChecked: boolean) => {
    setSelectedLessons(prev => {
      const newSelected = { ...prev };
      if (isChecked) {
        newSelected[course.id] = [...course.lessons]; // Add all lessons
      } else {
        delete newSelected[course.id]; // Remove all lessons
      }
      return newSelected;
    });
  };

  const flatSelectedLessons = useMemo(() => {
    const lessonsWithCourseId = Object.entries(selectedLessons).flatMap(([courseId, lessons]) => 
      lessons.map(lesson => ({ ...lesson, courseId }))
    );
    // Finally, sort all lessons globally based on their original position in their respective courses
    const allOriginalLessons = courses.flatMap(c => c.lessons);
    lessonsWithCourseId.sort((a, b) => allOriginalLessons.findIndex(l => l.id === a.id) - allOriginalLessons.findIndex(l => l.id === b.id));
    return lessonsWithCourseId;
  }, [selectedLessons, courses]);

  const onSubmit = async (data: ScheduleRequestData) => {
    if (flatSelectedLessons.length === 0) {
      toast({ title: 'No Lessons Selected', description: 'Please select at least one lesson to schedule.', variant: 'destructive' });
      return;
    }
    
    setIsGenerating(true);
    try {
      const result = await generateStudySchedule({
        lessons: flatSelectedLessons.map(l => ({ id: l.id, title: l.title, courseId: l.courseId })),
        startDate: format(data.dateRange.from, 'yyyy-MM-dd'),
        endDate: format(data.dateRange.to, 'yyyy-MM-dd'),
        isLazy: data.isLazy,
        prefersMultipleLessons: data.prefersMultipleLessons,
        customInstructions: data.customInstructions,
      });

      if (result && Object.keys(result).length > 0) {
        onScheduleGenerated(result);
        toast({ title: 'Schedule Generated!', description: 'Your new study plan is ready.' });
        setIsOpen(false);
        setSelectedLessons({});
        form.reset();
      } else {
        toast({ title: 'AI Failed to Generate Schedule', description: 'The AI may have had an issue. Please try adjusting your request or selected lessons.', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'An unexpected error occurred while generating the schedule.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="mr-2" />
          Create New Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] grid grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>AI Powered Scheduler</DialogTitle>
          <DialogDescription>Select lessons, set your preferences, and let AI create a smart study plan for you.</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 py-4 overflow-y-auto pr-2">
            {/* Left side: Lesson Selection */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">1. Select Lessons</h3>
                <Accordion type="multiple" className="w-full">
                    {courses.map(course => {
                        const allCourseLessonsSelected = course.lessons.length > 0 && selectedLessons[course.id]?.length === course.lessons.length;
                        return (
                            <AccordionItem value={course.id} key={course.id}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-4 w-full">
                                        <Checkbox
                                            id={`select-all-${course.id}`}
                                            checked={allCourseLessonsSelected}
                                            onCheckedChange={(checked) => toggleCourse(course, !!checked)}
                                            onClick={(e) => e.stopPropagation()} // Prevent accordion from toggling
                                            aria-label={`Select all lessons from ${course.title}`}
                                        />
                                        <span>{course.title}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-4">
                                        {course.lessons.map(lesson => (
                                            <div key={lesson.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${course.id}-${lesson.id}`}
                                                    checked={selectedLessons[course.id]?.some(l => l.id === lesson.id) || false}
                                                    onCheckedChange={() => toggleLesson(course, lesson)}
                                                />
                                                <label htmlFor={`${course.id}-${lesson.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {lesson.title}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </div>

            {/* Right side: Preferences */}
            <div className="space-y-6">
                <h3 className="font-semibold text-lg">2. Set Preferences</h3>
                <form id="schedule-creator-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <Label>Date Range</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateRange?.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date range</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange ?? { from: undefined, to: undefined }}
                                    onSelect={(range) => form.setValue('dateRange', range as DateRange)}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        {form.formState.errors.dateRange?.from && <p className="text-sm text-destructive mt-1">{form.formState.errors.dateRange.from.message}</p>}
                        {form.formState.errors.dateRange?.to && <p className="text-sm text-destructive mt-1">{form.formState.errors.dateRange.to.message}</p>}
                    </div>

                    <div className="flex items-center space-x-4 rounded-md border p-4">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="isLazy" className="font-semibold">Relaxed Pace</Label>
                            <p className="text-sm text-muted-foreground">Prefer a more spread-out, relaxed schedule?</p>
                        </div>
                        <Switch id="isLazy" checked={form.watch('isLazy')} onCheckedChange={(checked) => form.setValue('isLazy', checked)} />
                    </div>

                     <div className="flex items-center space-x-4 rounded-md border p-4">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="prefersMultipleLessons" className="font-semibold">Multiple Lessons Per Day</Label>
                            <p className="text-sm text-muted-foreground">Allow scheduling multiple lessons from the same course on one day?</p>
                        </div>
                        <Switch id="prefersMultipleLessons" checked={form.watch('prefersMultipleLessons')} onCheckedChange={(checked) => form.setValue('prefersMultipleLessons', checked)} />
                    </div>
                    
                    <div>
                        <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
                        <Textarea
                            id="customInstructions"
                            placeholder="e.g., I am free on weekends after 2 PM. Don't schedule anything on Monday mornings."
                            {...form.register('customInstructions')}
                        />
                    </div>
                </form>
            </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center text-sm text-muted-foreground mr-auto">
            <Info className="mr-2 h-4 w-4" />
            {flatSelectedLessons.length} lessons selected
          </div>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button type="submit" form="schedule-creator-form" disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
            Generate Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AISchedulerPage() {
    const { currentUser, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const scheduleRef = useRef(null);

    const [courses, setCourses] = useState<Course[]>([]);
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [watchedLessons, setWatchedLessons] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, startDeleteTransition] = useTransition();

    const sortedScheduleDays = useMemo(() => {
        if (!schedule) return [];
        return Object.keys(schedule).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }, [schedule]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    useEffect(() => {
        if (!currentUser) return;
        
        async function loadData() {
            setIsLoading(true);
            try {
                const [fetchedCourses, savedSchedule, watched] = await Promise.all([
                    getCoursesAction(),
                    getScheduleAction(currentUser!.id),
                    getWatchedLessonIdsAction(currentUser!.id)
                ]);
                setCourses(fetchedCourses);
                if (savedSchedule) {
                    setSchedule(savedSchedule);
                }
                if (watched) {
                    setWatchedLessons(watched);
                }
            } catch(error) {
                console.error("Failed to load initial data", error);
                toast({ title: 'Error', description: 'Could not load page data.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [currentUser, toast]);

    const handleScheduleGenerated = async (newSchedule: Schedule) => {
        if (!currentUser) return;
        setSchedule(newSchedule);
        await saveScheduleAction(currentUser.id, newSchedule);
    };

    const handleLessonToggle = async (lesson: ScheduledLesson) => {
        if (!currentUser) return;

        const course = courses.find(c => c.id === lesson.courseId);
        if (!course) return;

        const isWatched = watchedLessons.has(lesson.lessonId);
        
        if (!isWatched) {
            const originalLesson = course.lessons.find(l => l.id === lesson.lessonId);
            if (!originalLesson) return;
            
            setWatchedLessons(prev => new Set(prev).add(lesson.lessonId));
            await markLessonAsWatchedAction(currentUser.id, originalLesson, course.id);
            toast({
                title: "Progress Saved!",
                description: `Marked "${lesson.title}" as complete.`,
            });
        }
    };
    
    const handleDeleteSchedule = async () => {
        if (!currentUser) return;
        startDeleteTransition(async () => {
            try {
                await deleteScheduleAction(currentUser.id);
                setSchedule(null);
                toast({ title: 'Schedule Deleted', description: 'Your schedule has been removed.' });
            } catch (error) {
                 toast({ title: 'Error', description: 'Could not delete the schedule.', variant: 'destructive' });
            }
        });
    };

    const handleDownloadPdf = async () => {
        if (!scheduleRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(scheduleRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jspdf('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            let newImgWidth = pdfWidth;
            let newImgHeight = newImgWidth / ratio;
            
            let heightLeft = newImgHeight;
            let position = 0;

            if (newImgHeight < pdfHeight) {
                 pdf.addImage(imgData, 'PNG', 0, position, newImgWidth, newImgHeight);
            } else {
                 while (heightLeft > 0) {
                    pdf.addImage(imgData, 'PNG', 0, position, newImgWidth, newImgHeight);
                    heightLeft -= pdfHeight;
                    position -= pdfHeight;
                    if (heightLeft > 0) {
                        pdf.addPage();
                    }
                }
            }
            
            pdf.save('schedule.pdf');
        } catch (error) {
            console.error(error);
            toast({ title: 'PDF Download Failed', variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };
    
    // This function attempts to parse time flexibly
    const parseFlexibleTime = (timeStr: string) => {
        const now = new Date();
        const formatsToTry = ['hh:mm a', 'h:mm a', 'HH:mm'];
        for (const fmt of formatsToTry) {
            try {
                const parsed = parse(timeStr.toUpperCase(), fmt, now);
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            } catch (e) {
                // Ignore parsing errors and try the next format
            }
        }
        return new Date('invalid'); // Return an invalid date if all fail
    };

    if (isLoading || isUserLoading) {
        return (
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    <Skeleton className="h-10 w-64 mb-4" />
                    <Skeleton className="h-6 w-96 mb-8" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </main>
        )
    }

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-bold text-primary">AI Study Scheduler</h1>
                        <p className="text-muted-foreground mt-2">Your personalized, intelligent study plan.</p>
                    </div>
                    <div className="flex items-center gap-2">
                         {schedule && Object.keys(schedule).length > 0 && (
                            <>
                                <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                                    Download PDF
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteSchedule} disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                                    Delete Schedule
                                </Button>
                            </>
                        )}
                        <ScheduleCreatorDialog courses={courses} onScheduleGenerated={handleScheduleGenerated} />
                    </div>
                </div>

                <div ref={scheduleRef} className="p-2 bg-background">
                    {sortedScheduleDays.length > 0 ? (
                         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedScheduleDays.map(day => (
                                <Card key={day} className={cn(isToday(parseISO(day)) && "border-primary border-2")}>
                                    <CardHeader>
                                        <CardTitle>{format(parseISO(day), 'EEEE, MMMM d')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-4">
                                            {schedule![day].map(lesson => {
                                                const isWatched = watchedLessons.has(lesson.lessonId);
                                                const lessonTime = parseFlexibleTime(lesson.time);
                                                const formattedTime = !isNaN(lessonTime.getTime()) ? format(lessonTime, 'h:mm a') : 'Invalid Time';

                                                return (
                                                    <li key={lesson.lessonId} className="flex items-start gap-4">
                                                        <div className="text-right flex-shrink-0 w-20">
                                                            <p className="font-bold text-primary">{formattedTime}</p>
                                                        </div>
                                                        <div className="relative flex-grow pl-6">
                                                            <div className="absolute left-0 top-1 h-full border-l-2 border-border"></div>
                                                            <button 
                                                                className="absolute -left-[11px] top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:border-muted-foreground"
                                                                onClick={() => handleLessonToggle(lesson)}
                                                                disabled={isWatched}
                                                                aria-label={`Mark ${lesson.title} as complete`}
                                                            >
                                                                {isWatched && <CheckCircle className="h-5 w-5 text-green-700 bg-background rounded-full" />}
                                                            </button>
                                                            <p className={cn("font-semibold", isWatched && "line-through text-muted-foreground")}>{lesson.title}</p>
                                                            <p className={cn("text-sm text-muted-foreground", isWatched && "line-through")}>{courseMap.get(lesson.courseId)?.title}</p>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="text-center py-24">
                            <CardHeader>
                                <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
                                <CardTitle className="mt-4">No Schedule Found</CardTitle>
                                <CardDescription>Click "Create New Schedule" to generate your study plan.</CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    );
}
