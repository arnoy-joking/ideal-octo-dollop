
'use client';

<<<<<<< HEAD
import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { DateRange } from 'react-day-picker';
import { format, eachDayOfInterval, isToday, parseISO, parse } from 'date-fns';
import type { Course, Lesson, GenerateScheduleOutput } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { getCoursesAction } from '@/app/actions/course-actions';
import { generateScheduleAlgorithmically } from '@/lib/algorithmic-scheduler';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, PlusCircle, Loader2, CalendarPlus, Trash2, CheckCircle, FileDown } from 'lucide-react';

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
        const flatSelectedLessons = courses.flatMap(course => 
            course.lessons
                .filter(l => selectedLessons[course.id]?.has(l.id))
                .map(lesson => ({
                    id: lesson.id,
                    title: lesson.title,
                    courseId: course.id,
                    courseTitle: course.title
                }))
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
            const result = generateScheduleAlgorithmically({
                lessons: flatSelectedLessons,
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd'),
                isLazy: isLazy === 'yes',
                prefersMultipleLessons: prefersMultiple === 'yes'
            });
            onScheduleGenerated(result);
            toast({ title: 'Schedule Generated!', description: 'Your new study schedule is ready.' });
            setIsOpen(false);
        } catch (error) {
            console.error("Schedule Generation Error: ", error);
            toast({ title: 'Generation Failed', description: 'The scheduler could not generate a schedule. Please check your inputs.', variant: 'destructive' });
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
                    <DialogTitle>Create Study Schedule</DialogTitle>
                    <DialogDescription>Select lessons, a date range, and your preferences. A smart schedule will be generated for you.</DialogDescription>
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
    const [isDownloading, setIsDownloading] = useState(false);
    const [watchedLessons, setWatchedLessons] = useState<Set<string>>(new Set());
    const scheduleRef = useRef<HTMLDivElement>(null);

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
                toast({ title: 'Schedule Deleted', description: 'Your schedule has been removed.' });
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
=======
import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';

import type { Course, Lesson, ScheduledLesson, Schedule } from '@/lib/types';
import { generateStudySchedule } from '@/ai/flows/scheduler-flow';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getScheduleAction, saveScheduleAction } from '@/app/actions/scheduler-actions';
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
import { Calendar as CalendarIcon, Sparkles, Loader2, CheckCircle, Download, ListChecks, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const scheduleRequestSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date({ required_error: "An end date is required." }),
  }),
  isLazy: z.boolean(),
  prefersMultiple: z.boolean(),
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
      prefersMultiple: false,
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
    return Object.values(selectedLessons).flat();
  }, [selectedLessons]);

  const onSubmit = async (data: ScheduleRequestData) => {
    if (flatSelectedLessons.length === 0) {
      toast({ title: 'No Lessons Selected', description: 'Please select at least one lesson to schedule.', variant: 'destructive' });
      return;
    }
    
    setIsGenerating(true);
    try {
      const result = await generateStudySchedule({
        lessons: flatSelectedLessons.map(l => ({ ...l, courseId: courses.find(c => c.lessons.some(le => le.id === l.id))?.id })),
        startDate: format(data.dateRange.from, 'yyyy-MM-dd'),
        endDate: format(data.dateRange.to, 'yyyy-MM-dd'),
        isLazy: data.isLazy,
        prefersMultiple: data.prefersMultiple,
        customInstructions: data.customInstructions,
      });

      if (result && Object.keys(result.schedule).length > 0) {
        onScheduleGenerated(result.schedule);
        toast({ title: 'Schedule Generated!', description: 'Your new study plan is ready.' });
        setIsOpen(false);
        setSelectedLessons({});
        form.reset();
      } else {
        toast({ title: 'AI Failed to Generate Schedule', description: 'Please try adjusting your request or selected lessons.', variant: 'destructive' });
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
                                    selected={dateRange}
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
                            <Label htmlFor="prefersMultiple" className="font-semibold">Multiple Lessons Per Day</Label>
                            <p className="text-sm text-muted-foreground">Allow scheduling multiple lessons from the same course on one day?</p>
                        </div>
                        <Switch id="prefersMultiple" checked={form.watch('prefersMultiple')} onCheckedChange={(checked) => form.setValue('prefersMultiple', checked)} />
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
                setSchedule(savedSchedule);
                setWatchedLessons(watched);
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

            await markLessonAsWatchedAction(currentUser.id, originalLesson, course.id);
            setWatchedLessons(prev => new Set(prev).add(lesson.lessonId));
            toast({
                title: "Progress Saved!",
                description: `Marked "${lesson.title}" as complete.`,
            });
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
        }
    };

    const handleDownloadPdf = async () => {
        if (!scheduleRef.current) return;
        setIsDownloading(true);
<<<<<<< HEAD

        try {
            const canvas = await html2canvas(scheduleRef.current, {
                scale: 2, // Higher scale for better quality
                backgroundColor: null, // Use transparent background
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4'
            });

=======
        try {
            const canvas = await html2canvas(scheduleRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jspdf('p', 'mm', 'a4');
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
<<<<<<< HEAD
<<<<<<< HEAD

            let finalImgWidth = pdfWidth - 20; // with some margin
            let finalImgHeight = finalImgWidth / ratio;

            let heightLeft = finalImgHeight;
            let position = 10; // top margin
            
            pdf.addImage(imgData, 'PNG', 10, position, finalImgWidth, finalImgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - finalImgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, finalImgWidth, finalImgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save('study-schedule.pdf');
        } catch (error) {
            console.error("PDF generation error: ", error);
            toast({ title: 'Download Failed', description: 'Could not generate the schedule PDF.', variant: 'destructive' });
=======
            const newImgWidth = pdfWidth;
            const newImgHeight = newImgWidth / ratio;
=======
            let newImgWidth = pdfWidth;
            let newImgHeight = newImgWidth / ratio;
>>>>>>> 57caf56 (the date range selector doesnt work properly. just fix it)
            
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
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
        } finally {
            setIsDownloading(false);
        }
    };

<<<<<<< HEAD
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
                        Create a new schedule to get started.
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
                     <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="mr-2 animate-spin" /> : <FileDown className="mr-2" />}
                        Download as PDF
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteSchedule} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                        Delete Schedule
                    </Button>
                    <AISchedulerDialog courses={courses} onScheduleGenerated={handleScheduleGenerated} />
                </div>
                <div ref={scheduleRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-background p-1">
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
=======
    if (isLoading || isUserLoading) {
        return (
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    <Skeleton className="h-10 w-64 mb-4" />
                    <Skeleton className="h-6 w-96 mb-8" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </main>
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
        )
    }

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
<<<<<<< HEAD
            <div className="max-w-7xl mx-auto">
                 <div className="mb-8">
                    <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                        <Sparkles className="w-8 h-8" />
                        Study Scheduler
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
=======
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-bold text-primary">AI Study Scheduler</h1>
                        <p className="text-muted-foreground mt-2">Your personalized, intelligent study plan.</p>
                    </div>
                    <div className="flex items-center gap-2">
                         {schedule && Object.keys(schedule).length > 0 && (
                            <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
                                {isDownloading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                                Download PDF
                            </Button>
                        )}
                        <ScheduleCreatorDialog courses={courses} onScheduleGenerated={handleScheduleGenerated} />
                    </div>
                </div>

                <div ref={scheduleRef} className="p-2 bg-background">
                    {sortedScheduleDays.length > 0 ? (
                         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedScheduleDays.map(day => (
                                <Card key={day}>
                                    <CardHeader>
                                        <CardTitle>{format(parse(day, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-4">
                                            {schedule![day].map(lesson => {
                                                const isWatched = watchedLessons.has(lesson.lessonId);
                                                const lessonTime = parse(lesson.time, 'h:mm a', new Date());

                                                return (
                                                    <li key={lesson.lessonId} className="flex items-start gap-4">
                                                        <div className="text-right flex-shrink-0 w-20">
                                                            <p className="font-bold text-primary">{format(lessonTime, 'h:mm a')}</p>
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
>>>>>>> dbc6be0 (now it hangs when creating schedule. I rolled back to a version. now , u)
            </div>
        </main>
    );
}

    