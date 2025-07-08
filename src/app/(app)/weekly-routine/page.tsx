
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toJpeg } from 'html-to-image';
import type { Course, WeeklyRoutine } from '@/lib/types';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getRoutineAction, saveRoutineAction, resetRoutineAction } from '@/app/actions/routine-actions';
import { getGoalsAction } from '@/app/actions/goals-actions';
import { generateWeeklyRoutine } from '@/ai/flows/routine-flow';
import { useUser } from '@/context/user-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { CalendarDays, Save, RotateCcw, Download, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NUM_SLOTS = 4;

const generateInitialRoutine = (): WeeklyRoutine => {
    const routine: WeeklyRoutine = {};
    daysOfWeek.forEach(day => {
        routine[day] = Array.from({ length: NUM_SLOTS }, (_, i) => ({
            id: `${day}-${i}`,
            time: '',
            courseId: '',
        }));
    });
    return routine;
};

export default function WeeklyRoutinePage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [routine, setRoutine] = useState<WeeklyRoutine>(generateInitialRoutine());
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [constraints, setConstraints] = useState('');
    const { toast } = useToast();
    const routineRef = useRef<HTMLDivElement>(null);
    const { currentUser, isLoading: isUserLoading } = useUser();

    const loadRoutine = useCallback(async () => {
        if (!currentUser) return;
        setIsRefreshing(true);
        const savedRoutine = await getRoutineAction(currentUser.id);
        if (savedRoutine) {
            const completeRoutine = generateInitialRoutine();
            for (const day of daysOfWeek) {
                if (savedRoutine[day]) {
                     for(let i = 0; i < NUM_SLOTS; i++) {
                        if (savedRoutine[day][i]) {
                            completeRoutine[day][i] = savedRoutine[day][i];
                        }
                    }
                }
            }
            setRoutine(completeRoutine);
        } else {
            setRoutine(generateInitialRoutine());
        }
        setIsRefreshing(false);
    }, [currentUser]);

    useEffect(() => {
        async function loadInitialData() {
            if (!currentUser) return;
            setIsLoading(true);

            const [fetchedCourses] = await Promise.all([
                getCoursesAction(),
            ]);
            
            setCourses(fetchedCourses);
            await loadRoutine();

            setIsLoading(false);
        }

        if (!isUserLoading) {
            loadInitialData();
        }
    }, [currentUser, isUserLoading, loadRoutine]);

    const handleTimeChange = (day: string, slotIndex: number, newTime: string) => {
        setRoutine(prevRoutine => {
            const newRoutine = { ...prevRoutine };
            newRoutine[day] = [...newRoutine[day]];
            newRoutine[day][slotIndex] = { ...newRoutine[day][slotIndex], time: newTime };
            return newRoutine;
        });
    };

    const handleCourseChange = (day: string, slotIndex: number, courseId: string) => {
        setRoutine(prevRoutine => {
            const newRoutine = { ...prevRoutine };
            newRoutine[day] = [...newRoutine[day]];
            newRoutine[day][slotIndex] = { ...newRoutine[day][slotIndex], courseId: courseId };
            return newRoutine;
        });
    };

    const handleSaveRoutine = async () => {
        if (!currentUser) {
            toast({ title: 'Error', description: 'You must be logged in to save a routine.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            await saveRoutineAction(currentUser.id, routine);
            toast({
                title: 'Routine Saved!',
                description: 'Your weekly study routine has been saved to your profile.',
            });
        } catch (error) {
            toast({
                title: 'Error Saving Routine',
                description: 'Could not save your routine. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleResetRoutine = async () => {
        if (!currentUser) return;
        
        setRoutine(generateInitialRoutine());
        try {
            await resetRoutineAction(currentUser.id);
            toast({
                title: 'Routine Reset!',
                description: 'Your weekly study routine has been cleared.',
            });
        } catch (error) {
             toast({
                title: 'Error Resetting Routine',
                description: 'Could not reset your routine. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleDownloadImage = async () => {
        if (!routineRef.current) return;

        setIsDownloading(true);
        try {
            const dataUrl = await toJpeg(routineRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                // Forcing 4 columns makes for a better-proportioned image
                style: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }
            });

            const link = document.createElement('a');
            link.download = 'weekly-routine.jpg';
            link.href = dataUrl;
            link.click();
        } catch (error) {
            toast({
                title: 'Download Failed',
                description: 'Could not generate the routine image. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleGenerateWithAI = async () => {
        if (!currentUser || courses.length === 0) {
            toast({ title: 'Cannot Generate', description: 'User and courses must be loaded first.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const goals = await getGoalsAction(currentUser.id);
            const courseData = courses.map(({ id, title }) => ({ id, title }));
            const generatedRoutine = await generateWeeklyRoutine({ courses: courseData, goals, constraints });
            setRoutine(generatedRoutine);
            toast({ title: 'Routine Generated!', description: 'The AI created a schedule for you. Review and save it.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not generate a routine. Please try again.', variant: 'destructive' });
            console.error(error);
        } finally {
            setIsGenerating(false);
            setIsAiDialogOpen(false);
        }
    };

    if (isLoading || isUserLoading) {
        return (
             <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                         <Skeleton className="h-16 w-64" />
                         <div className="flex gap-2">
                             <Skeleton className="h-10 w-32" />
                             <Skeleton className="h-10 w-32" />
                             <Skeleton className="h-10 w-32" />
                         </div>
                    </div>
                    <Skeleton className="h-[400px] w-full rounded-lg" />
                </div>
            </main>
        )
    }
    
    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                            <CalendarDays className="w-8 h-8" />
                            Weekly Routine
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Plan your study schedule for the week ahead. Saved to your profile.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                         <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={isGenerating || isLoading}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate with AI
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Generate Routine with AI</DialogTitle>
                                    <DialogDescription>
                                        Provide optional constraints to help the AI build a better schedule for you.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="constraints" className="mb-2 block">Scheduling Constraints (Optional)</Label>
                                    <Textarea
                                        id="constraints"
                                        placeholder="e.g., I'm busy on Friday afternoons.&#10;I want to study React on weekends.&#10;Don't schedule more than 2 classes per day."
                                        value={constraints}
                                        onChange={(e) => setConstraints(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="ghost">Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={handleGenerateWithAI} disabled={isGenerating}>
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={() => loadRoutine()} variant="outline" disabled={isRefreshing || isLoading}>
                            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Refresh
                        </Button>
                        <Button onClick={handleDownloadImage} variant="outline" disabled={isDownloading || isLoading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Download JPG
                        </Button>
                        <Button onClick={handleResetRoutine} variant="destructive" disabled={isLoading}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                        <Button onClick={handleSaveRoutine} disabled={isSaving || isLoading}>
                             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Routine
                        </Button>
                    </div>
                </div>

                <div ref={routineRef} className="bg-background rounded-lg p-1">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {daysOfWeek.map(day => (
                            <Card key={day} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-center text-xl">{day}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-4">
                                    {Array.from({ length: NUM_SLOTS }).map((_, slotIndex) => {
                                        const slot = routine[day]?.[slotIndex] || { id: `${day}-${slotIndex}`, time: '', courseId: '' };
                                        return (
                                            <div key={slot.id} className="space-y-3 rounded-lg border p-4 bg-muted/30 flex-1">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`time-${slot.id}`} className="text-xs text-muted-foreground">Time</Label>
                                                    <Input
                                                        id={`time-${slot.id}`}
                                                        type="time"
                                                        value={slot.time}
                                                        onChange={(e) => handleTimeChange(day, slotIndex, e.target.value)}
                                                        aria-label={`Time for ${day} slot ${slotIndex + 1}`}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`course-${slot.id}`} className="text-xs text-muted-foreground">Course</Label>
                                                    <Select
                                                        value={slot.courseId}
                                                        onValueChange={value => {
                                                            const valueToSet = value === 'clear-selection' ? '' : value;
                                                            handleCourseChange(day, slotIndex, valueToSet);
                                                        }}
                                                    >
                                                        <SelectTrigger id={`course-${slot.id}`} aria-label={`${day} course for slot ${slotIndex + 1}`} className="w-full">
                                                            <SelectValue placeholder="Select course..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="clear-selection">
                                                                <em>None</em>
                                                            </SelectItem>
                                                            {courses.map(course => (
                                                                <SelectItem key={course.id} value={course.id}>
                                                                    {course.title}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
