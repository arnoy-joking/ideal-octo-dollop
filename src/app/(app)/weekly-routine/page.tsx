
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toJpeg } from 'html-to-image';
import type { Course, WeeklyRoutine } from '@/lib/types';
import { getCoursesAction } from '@/app/actions/course-actions';
import { getRoutineAction, saveRoutineAction, resetRoutineAction } from '@/app/actions/routine-actions';
import { getGoalsAction } from '@/app/actions/goals-actions';
import { generateWeeklyRoutine } from '@/ai/flows/routine-flow';
import { useUser } from '@/context/user-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

    const handleSlotChange = (day: string, slotIndex: number, value: string) => {
        setRoutine(prevRoutine => {
            const newRoutine = { ...prevRoutine };
            newRoutine[day] = [...newRoutine[day]];
            newRoutine[day][slotIndex] = { ...newRoutine[day][slotIndex], courseId: value };
            return newRoutine;
        });
    };

    const handleTimeChange = (day: string, slotIndex: number, time: string) => {
        setRoutine(prevRoutine => {
            const newRoutine = { ...prevRoutine };
            newRoutine[day] = [...newRoutine[day]];
            newRoutine[day][slotIndex] = { ...newRoutine[day][slotIndex], time: time };
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
                style: { width: '1400px', padding: '1rem' }
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
            const generatedRoutine = await generateWeeklyRoutine({ courses: courseData, goals });
            setRoutine(generatedRoutine);
            toast({ title: 'Routine Generated!', description: 'The AI created a schedule for you. Review and save it.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not generate a routine. Please try again.', variant: 'destructive' });
            console.error(error);
        } finally {
            setIsGenerating(false);
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
                        <Button onClick={handleGenerateWithAI} variant="outline" disabled={isGenerating || isLoading}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate with AI
                        </Button>
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

                <div ref={routineRef} className="bg-background rounded-lg">
                    <div className="overflow-x-auto border rounded-lg">
                        <Table className="min-w-[1400px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px] text-center font-semibold text-lg h-14">Slot</TableHead>
                                    {daysOfWeek.map(day => (
                                        <TableHead key={day} className="text-center font-semibold text-lg h-14">{day}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: NUM_SLOTS }).map((_, slotIndex) => (
                                <TableRow key={slotIndex} className="hover:bg-muted/50">
                                    <TableCell className="p-2 font-medium align-middle text-center border-r">
                                        Slot {slotIndex + 1}
                                    </TableCell>
                                    {daysOfWeek.map(day => (
                                    <TableCell key={`${day}-${slotIndex}`} className="p-2 align-top">
                                        {routine[day] && routine[day][slotIndex] ? (
                                            <div className="space-y-2">
                                                <Input
                                                    type="text"
                                                    placeholder="e.g. 09:00"
                                                    value={routine[day][slotIndex].time}
                                                    onChange={(e) => handleTimeChange(day, slotIndex, e.target.value)}
                                                    aria-label={`Time for ${day} slot ${slotIndex + 1}`}
                                                    className="text-center"
                                                />
                                                <Select
                                                    value={routine[day][slotIndex].courseId}
                                                    onValueChange={value => {
                                                        const valueToSet = value === 'clear-selection' ? '' : value;
                                                        handleSlotChange(day, slotIndex, valueToSet);
                                                    }}
                                                >
                                                    <SelectTrigger aria-label={`${day} course for slot ${slotIndex + 1}`}>
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
                                        ) : null}
                                    </TableCell>
                                    ))}
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </main>
    );
}
