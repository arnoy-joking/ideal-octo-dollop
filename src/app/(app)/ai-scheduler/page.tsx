
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, isToday, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';

import type { Course, ScheduledLesson, Schedule } from '@/lib/types';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getScheduleAction, saveScheduleAction, deleteScheduleAction } from '@/actions/scheduler-actions';
import { getWatchedLessonIdsAction, markLessonAsWatchedAction } from '@/app/actions/progress-actions';
import { useUser } from '@/context/user-context';
import { generateStudySchedulePlan } from '@/ai/flows/scheduler-flow';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Sparkles, Loader2, CheckCircle, Download, ListChecks, Info, Trash2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const scheduleRequestSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date({ required_error: "An end date is required." }),
  }),
  isLazy: z.boolean(),
});

type ScheduleRequestData = z.infer<typeof scheduleRequestSchema>;

function AIScheduleCreatorDialog({ courses, onScheduleGenerated }: { courses: Course[], onScheduleGenerated: (schedule: Schedule) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<Record<string, Set<string>>>({});
  const { toast } = useToast();
  
  const form = useForm<ScheduleRequestData>({
    resolver: zodResolver(scheduleRequestSchema),
    defaultValues: {
      dateRange: { from: new Date(), to: new Date(new Date().setDate(new Date().getDate() + 13)) },
      isLazy: true,
    },
  });
  
  const dateRange = form.watch('dateRange');

  const handleLessonToggle = (courseId: string, lessonId: string) => {
    setSelectedLessons(prev => {
        const newSelected = { ...prev };
        if (!newSelected[courseId]) {
            newSelected[courseId] = new Set();
        }

        if (newSelected[courseId].has(lessonId)) {
            newSelected[courseId].delete(lessonId);
            if (newSelected[courseId].size === 0) {
                delete newSelected[courseId];
            }
        } else {
            newSelected[courseId].add(lessonId);
        }
        return newSelected;
    });
  };

  const handleSelectAllInCourse = (course: Course, shouldSelect: boolean) => {
      setSelectedLessons(prev => {
          const newSelected = { ...prev };
          if (shouldSelect) {
              newSelected[course.id] = new Set(course.lessons.map(l => l.id));
          } else {
              delete newSelected[course.id];
          }
          return newSelected;
      });
  };


  const selectedCoursesForGeneration: Course[] = useMemo(() => {
    return courses
      .map(course => ({
        ...course,
        lessons: course.lessons.filter(lesson => selectedLessons[course.id]?.has(lesson.id)),
      }))
      .filter(course => course.lessons.length > 0);
  }, [selectedLessons, courses]);


  const totalSelectedLessons = useMemo(() => {
    return selectedCoursesForGeneration.reduce((acc, course) => acc + course.lessons.length, 0);
  }, [selectedCoursesForGeneration]);

  const onSubmit = async (data: ScheduleRequestData) => {
    if (selectedCoursesForGeneration.length === 0) {
      toast({ title: 'No Lessons Selected', description: 'Please select at least one lesson to schedule.', variant: 'destructive' });
      return;
    }
    
    setIsGenerating(true);

    try {
        const result = await generateStudySchedulePlan({
            courses: selectedCoursesForGeneration,
            startDate: format(data.dateRange.from, 'yyyy-MM-dd'),
            endDate: format(data.dateRange.to, 'yyyy-MM-dd'),
            isLazy: data.isLazy
        });

        if (result && result.schedule && result.schedule.length > 0) {
            onScheduleGenerated(result);
            toast({ title: 'AI Schedule Generated!', description: 'Your new smart study plan is ready.' });
            setIsOpen(false);
            setSelectedLessons({});
            form.reset();
        } else {
            throw new Error('The AI failed to produce a schedule.');
        }
    } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: `An unexpected error occurred: ${(error as Error).message}`, variant: 'destructive' });
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wand2 className="mr-2" />
          Create AI Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] grid grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Create a New AI-Powered Schedule</DialogTitle>
          <DialogDescription>Select courses and lessons, set your preferences, and let AI generate a smart study plan.</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 py-4 overflow-y-auto pr-2">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">1. Select Lessons</h3>
                <Card>
                    <CardContent className="p-2 max-h-96 overflow-y-auto">
                        <Accordion type="multiple" className="w-full">
                            {courses.map(course => {
                                const courseSelectedLessons = selectedLessons[course.id] || new Set();
                                const isAllSelected = course.lessons.length > 0 && courseSelectedLessons.size === course.lessons.length;
                                const isIndeterminate = courseSelectedLessons.size > 0 && !isAllSelected;

                                return (
                                <AccordionItem value={course.id} key={course.id}>
                                    <AccordionTrigger className="px-2 hover:no-underline">
                                        <div className="flex items-center space-x-3 flex-1">
                                            <Checkbox
                                                id={`course-${course.id}`}
                                                checked={isAllSelected}
                                                aria-label={isIndeterminate ? "Some lessons selected" : isAllSelected ? "All lessons selected" : "No lessons selected"}
                                                onCheckedChange={(checked) => handleSelectAllInCourse(course, !!checked)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <label htmlFor={`course-select-trigger-${course.id}`} className="font-medium leading-none flex-1 cursor-pointer text-left">
                                                {course.title}
                                                <p className="text-xs text-muted-foreground">{courseSelectedLessons.size} / {course.lessons.length} lessons selected</p>
                                            </label>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-4 pl-8 pt-2">
                                            {course.lessons.map((lesson, index) => (
                                                <div key={lesson.id} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={`${course.id}-${lesson.id}`}
                                                        checked={courseSelectedLessons.has(lesson.id)}
                                                        onCheckedChange={() => handleLessonToggle(course.id, lesson.id)}
                                                    />
                                                    <label htmlFor={`${course.id}-${lesson.id}`} className="text-sm font-medium leading-none flex-1 cursor-pointer">
                                                        <span className="text-muted-foreground w-8 inline-block mr-2">[{index + 1}]</span>{lesson.title}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">2. Set Preferences</h3>
                <form id="schedule-creator-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                            <CalendarIcon className="h-6 w-6 text-primary" />
                             <div>
                                <CardTitle className="text-base">Date Range</CardTitle>
                                <CardDescription className="text-xs">Pick a start and end date for your plan.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
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
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Pacing</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center space-x-2">
                                <Switch id="is-lazy" checked={form.watch('isLazy')} onCheckedChange={(checked) => form.setValue('isLazy', checked)} />
                                <Label htmlFor="is-lazy">Prefer a relaxed pace (includes rest days)</Label>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center text-sm text-muted-foreground mr-auto">
            <Info className="mr-2 h-4 w-4" />
            {totalSelectedLessons} lessons in {selectedCoursesForGeneration.length} courses
          </div>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button type="submit" form="schedule-creator-form" disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
            Generate with AI
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
    const [isDeleting, setIsDeleting] = useState(false);

    const sortedScheduleDays = useMemo(() => {
        if (!schedule || !schedule.schedule) return [];
        return schedule.schedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
        setIsDeleting(true);
        try {
            await deleteScheduleAction(currentUser.id);
            setSchedule(null);
            toast({ title: 'Schedule Deleted', description: 'Your schedule has been removed.' });
        } catch (error) {
             toast({ title: 'Error', description: 'Could not delete the schedule.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
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
            
            pdf.save('ai-schedule.pdf');
        } catch (error) {
            console.error(error);
            toast({ title: 'PDF Download Failed', variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };
    
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
            }
        }
        return new Date('invalid');
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
                        <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-2"><Sparkles className="w-8 h-8" /> AI Scheduler</h1>
                        <p className="text-muted-foreground mt-2">Let AI create a balanced, personalized study plan for you.</p>
                    </div>
                    <div className="flex items-center gap-2">
                         {schedule && schedule.schedule && schedule.schedule.length > 0 && (
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
                        <AIScheduleCreatorDialog courses={courses} onScheduleGenerated={handleScheduleGenerated} />
                    </div>
                </div>

                <div ref={scheduleRef} className="p-2 bg-background">
                    {sortedScheduleDays.length > 0 ? (
                         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedScheduleDays.map(day => (
                                <Card key={day.date} className={cn(isToday(parseISO(day.date)) && "border-primary border-2")}>
                                    <CardHeader>
                                        <CardTitle>{format(parseISO(day.date), 'EEEE, MMMM d')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                       <div className="relative pl-6">
                                            {day.lessons.length > 1 && <div className="absolute left-[2.3rem] top-0 h-full border-l-2 border-border -translate-x-1/2"></div>}
                                            <ul className="space-y-4">
                                                {day.lessons.map((lesson) => {
                                                    const isWatched = watchedLessons.has(lesson.lessonId);
                                                    const lessonTime = parseFlexibleTime(lesson.time);
                                                    const formattedTime = !isNaN(lessonTime.getTime()) ? format(lessonTime, 'h:mm a') : 'Invalid Time';
                                                    const course = courseMap.get(lesson.courseId);

                                                    return (
                                                        <li key={lesson.lessonId} className="relative flex items-start gap-4">
                                                            <div className="text-right flex-shrink-0 w-20">
                                                                <p className="font-bold text-primary">{formattedTime}</p>
                                                            </div>
                                                            <div className="relative flex-grow pl-6">
                                                                <button
                                                                    className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:border-muted-foreground"
                                                                    onClick={() => handleLessonToggle(lesson)}
                                                                    disabled={isWatched}
                                                                    aria-label={`Mark ${lesson.title} as complete`}
                                                                >
                                                                    {isWatched && <CheckCircle className="h-5 w-5 text-green-700 bg-background rounded-full" />}
                                                                </button>
                                                                <p className={cn("font-semibold", isWatched && "line-through text-muted-foreground")}>{lesson.title}</p>
                                                                {course && <p className={cn("text-sm text-muted-foreground", isWatched && "line-through")}>{course.title}</p>}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="text-center py-24">
                            <CardHeader>
                                <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
                                <CardTitle className="mt-4">No AI Schedule Found</CardTitle>
                                <CardDescription>Click "Create AI Schedule" to generate your smart study plan.</CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    );
}
