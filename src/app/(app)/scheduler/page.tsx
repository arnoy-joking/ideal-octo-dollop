
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, isToday, parseISO, eachDayOfInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';

import type { Course, Lesson, ScheduledLesson, Schedule } from '@/lib/types';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getScheduleAction, saveScheduleAction, deleteScheduleAction } from '@/actions/scheduler-actions';
import { getWatchedLessonIdsAction, markLessonAsWatchedAction } from '@/app/actions/progress-actions';
import { useUser } from '@/context/user-context';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Sparkles, Loader2, CheckCircle, Download, ListChecks, Info, Trash2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const scheduleRequestSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date({ required_error: "An end date is required." }),
  }),
});

type ScheduleRequestData = z.infer<typeof scheduleRequestSchema>;
type LessonToSchedule = Lesson & { courseId: string };

function generateSchedule(data: ScheduleRequestData, selectedCourses: Course[]): Schedule {
    const { dateRange } = data;
    const { from: startDate, to: endDate } = dateRange;

    // 1. Create correctly ordered queues for each course
    const courseQueues: Record<string, LessonToSchedule[]> = {};
    selectedCourses.forEach(course => {
        courseQueues[course.id] = course.lessons.map(l => ({ ...l, courseId: course.id }));
    });
    
    const totalLessons = selectedCourses.reduce((acc, course) => acc + course.lessons.length, 0);
    const allAvailableDays = eachDayOfInterval({ start: startDate, end: endDate });

    if (allAvailableDays.length === 0 || totalLessons === 0) return {};

    // 2. Determine study days, making "lazy" the default smart behavior
    let studyDays: Date[] = [...allAvailableDays];
    if (allAvailableDays.length > 3) { // Only add rest days for schedules longer than 3 days
        const potentialRestDays = Math.max(1, Math.floor(allAvailableDays.length / 5)); // e.g. 1 rest day per 5 days
        const potentialStudyDays = allAvailableDays.length - potentialRestDays;

        // Ensure we have enough study days for all lessons before adding rest days
        if (potentialStudyDays >= totalLessons) {
            const restDayInterval = Math.floor(allAvailableDays.length / (potentialRestDays + 1));
            const newStudyDays: Date[] = [];
            let dayCounter = 0;
            for (let i = 0; i < allAvailableDays.length; i++) {
                if ((i + 1) % (restDayInterval + 1) !== 0 || newStudyDays.length >= potentialStudyDays) {
                    newStudyDays.push(allAvailableDays[i]);
                }
            }
            studyDays = newStudyDays;
        }
    }
    
    if (studyDays.length === 0) studyDays = [allAvailableDays[0]];

    // 3. Calculate how many lessons to schedule per day, distributing remainder
    const baseLessonsPerDay = Math.floor(totalLessons / studyDays.length);
    let remainingLessons = totalLessons % studyDays.length;

    const dailyQuotas: Record<string, number> = {};
    studyDays.forEach((day) => {
        const dayString = format(day, 'yyyy-MM-dd');
        dailyQuotas[dayString] = baseLessonsPerDay;
        if (remainingLessons > 0) {
            dailyQuotas[dayString]++;
            remainingLessons--;
        }
    });

    // 4. Build the schedule using a robust round-robin with lookahead
    const schedule: Schedule = {};
    allAvailableDays.forEach(day => {
      schedule[format(day, 'yyyy-MM-dd')] = [];
    });

    const studyTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "09:00 PM"];
    const courseLastScheduled: Record<string, number> = {};
    selectedCourses.forEach(c => courseLastScheduled[c.id] = -1);
    
    let lessonIndex = 0;
    studyDays.forEach(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        const quota = dailyQuotas[dayString] || 0;
        
        for(let i=0; i<quota; i++) {
            const availableCourses = selectedCourses.filter(c => courseQueues[c.id]?.length > 0);
            if (availableCourses.length === 0) break;

            // Find courses that were scheduled least recently
            let minIndex = Infinity;
            availableCourses.forEach(c => {
                if (courseLastScheduled[c.id] < minIndex) {
                    minIndex = courseLastScheduled[c.id];
                }
            });

            const leastRecentCourses = availableCourses.filter(c => courseLastScheduled[c.id] === minIndex);
            
            // From the least recent, pick the one with the most lessons left to avoid clumping
            let nextCourseId = leastRecentCourses[0].id;
            if (leastRecentCourses.length > 1) {
                nextCourseId = leastRecentCourses.sort((a, b) => courseQueues[b.id].length - courseQueues[a.id].length)[0].id;
            } else {
                nextCourseId = leastRecentCourses[0].id;
            }
            
            const lesson = courseQueues[nextCourseId].shift();
            if (lesson) {
                schedule[dayString].push({
                    lessonId: lesson.id,
                    courseId: lesson.courseId,
                    title: lesson.title,
                    time: studyTimes[schedule[dayString].length % studyTimes.length],
                });
                // Update the 'last scheduled' index for this course
                courseLastScheduled[nextCourseId] = lessonIndex++;
            }
        }
    });

    // 5. Final cleanup and sort by time
    Object.keys(schedule).forEach(day => {
      if(!schedule[day] || schedule[day].length === 0) {
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


function ScheduleCreatorDialog({ courses, onScheduleGenerated }: { courses: Course[], onScheduleGenerated: (schedule: Schedule) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<Record<string, string[]>>({});
  const [fromIndex, setFromIndex] = useState('');
  const [toIndex, setToIndex] = useState('');
  const { toast } = useToast();
  
  const form = useForm<ScheduleRequestData>({
    resolver: zodResolver(scheduleRequestSchema),
    defaultValues: {
      dateRange: { from: new Date(), to: new Date(new Date().setDate(new Date().getDate() + 7)) },
    },
  });
  
  const dateRange = form.watch('dateRange');

  const toggleLesson = (courseId: string, lessonId: string) => {
    setSelectedLessons(prev => {
      const currentLessons = prev[courseId] || [];
      const newLessons = currentLessons.includes(lessonId)
        ? currentLessons.filter(id => id !== lessonId)
        : [...currentLessons, lessonId];
      
      const newState = { ...prev };
      if (newLessons.length > 0) {
        newState[courseId] = newLessons;
      } else {
        delete newState[courseId];
      }
      return newState;
    });
  };
  
  const handleSelectRange = (course: Course) => {
    const start = parseInt(fromIndex, 10);
    const end = parseInt(toIndex, 10);

    if (isNaN(start) || isNaN(end) || start < 1 || end > course.lessons.length || start > end) {
      toast({
        title: "Invalid Range",
        description: `Please enter a valid range between 1 and ${course.lessons.length}.`,
        variant: "destructive"
      });
      return;
    }

    const lessonsToSelect = course.lessons.slice(start - 1, end).map(l => l.id);
    setSelectedLessons(prev => {
        const currentSelected = new Set(prev[course.id] || []);
        lessonsToSelect.forEach(id => currentSelected.add(id));
        return {
            ...prev,
            [course.id]: Array.from(currentSelected)
        };
    });
    setFromIndex('');
    setToIndex('');
  };


  const selectedCoursesForGeneration: Course[] = useMemo(() => {
    return courses
      .map(course => ({
        ...course,
        lessons: course.lessons.filter(lesson => selectedLessons[course.id]?.includes(lesson.id)),
      }))
      .filter(course => course.lessons.length > 0);
  }, [selectedLessons, courses]);

  const totalSelectedLessons = useMemo(() => {
    return selectedCoursesForGeneration.reduce((acc, course) => acc + course.lessons.length, 0);
  }, [selectedCoursesForGeneration]);

  const onSubmit = (data: ScheduleRequestData) => {
    if (selectedCoursesForGeneration.length === 0) {
      toast({ title: 'No Lessons Selected', description: 'Please select at least one lesson to schedule.', variant: 'destructive' });
      return;
    }
    
    setIsGenerating(true);

    setTimeout(() => {
      try {
        const result = generateSchedule(data, selectedCoursesForGeneration);
        
        if (result && Object.keys(result).length > 0) {
          onScheduleGenerated(result);
          toast({ title: 'Schedule Generated!', description: 'Your new study plan is ready.' });
          setIsOpen(false);
          setSelectedLessons({});
          form.reset();
        } else {
          throw new Error('The algorithm failed to produce a schedule for the given constraints.');
        }
      } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: `An unexpected error occurred: ${(error as Error).message}`, variant: 'destructive' });
      } finally {
        setIsGenerating(false);
      }
    }, 1000);
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
          <DialogTitle>Create a New Schedule</DialogTitle>
          <DialogDescription>Select lessons, set your preferences, and generate a smart study plan.</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 py-4 overflow-y-auto pr-2">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">1. Select Lessons</h3>
                <Accordion type="multiple" className="w-full">
                    {courses.map(course => {
                        const courseSelectedLessons = selectedLessons[course.id] || [];
                        
                        return (
                        <AccordionItem value={course.id} key={course.id}>
                            <AccordionTrigger className="px-2">{course.title}</AccordionTrigger>
                            <AccordionContent>
                               <div className="space-y-2 max-h-60 overflow-y-auto pr-4 pl-4 pt-2">
                                  {course.lessons.map((lesson, index) => {
                                      const isSelected = courseSelectedLessons.includes(lesson.id);
                                      return (
                                          <div key={lesson.id} className="flex items-center space-x-2">
                                              <Checkbox
                                                  id={`${course.id}-${lesson.id}`}
                                                  checked={isSelected}
                                                  onCheckedChange={() => toggleLesson(course.id, lesson.id)}
                                              />
                                              <label htmlFor={`${course.id}-${lesson.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                                 <span className="text-muted-foreground w-6 inline-block mr-2">[{index + 1}]</span>{lesson.title}
                                              </label>
                                          </div>
                                      );
                                  })}
                                </div>
                                <div className="mt-4 pt-4 border-t space-y-2 px-4">
                                  <h4 className="text-sm font-medium">Select Range</h4>
                                  <div className="flex items-center gap-2">
                                      <Input value={fromIndex} onChange={(e) => setFromIndex(e.target.value)} placeholder="From" className="h-8 w-20" />
                                      <Input value={toIndex} onChange={(e) => setToIndex(e.target.value)} placeholder="To" className="h-8 w-20" />
                                      <Button size="sm" onClick={() => handleSelectRange(course)}>Select</Button>
                                  </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )})}
                </Accordion>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">2. Set Preferences</h3>
                <form id="schedule-creator-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                            <CalendarDays className="h-6 w-6 text-primary" />
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
                </form>
            </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center text-sm text-muted-foreground mr-auto">
            <Info className="mr-2 h-4 w-4" />
            {totalSelectedLessons} lessons selected
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

export default function SchedulerPage() {
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
            
            pdf.save('schedule.pdf');
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
                        <h1 className="text-4xl font-headline font-bold text-primary">Scheduler</h1>
                        <p className="text-muted-foreground mt-2">Your personalized study plan.</p>
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
                                       <div className="relative pl-6">
                                            {schedule![day].length > 1 && <div className="absolute left-[2.3rem] top-0 h-full border-l-2 border-border -translate-x-1/2"></div>}
                                            <ul className="space-y-4">
                                                {schedule![day].map((lesson, index) => {
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

    