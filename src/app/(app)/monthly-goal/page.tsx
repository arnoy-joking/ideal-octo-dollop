
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useUser } from '@/context/user-context';
import { getCompletedChaptersAction, getMonthlyGoalAction, saveMonthlyGoalAction, saveCompletedChaptersAction } from '@/app/actions/syllabus-actions';
import { syllabus, type SyllabusChapter } from '@/lib/data/syllabus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Target, Save, Loader2, ListTodo, CheckCircle2, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';

const allChapters: SyllabusChapter[] = syllabus.flatMap(subject => 
    subject.papers.flatMap(paper => 
        (paper.sections?.flatMap(section => section.chapters) || []).concat(paper.other || [], paper.chapters || [])
    )
);
const allChaptersMap = new Map(allChapters.map(c => [c.id, c]));


function GoalSelectorDialog({ uncompletedChapters, currentGoal, onSave, children }: { uncompletedChapters: SyllabusChapter[], currentGoal: Set<string>, onSave: (newGoal: Set<string>) => Promise<void>, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(currentGoal);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelected(currentGoal);
        }
    }, [isOpen, currentGoal]);

    const handleToggle = (chapterId: string) => {
        setSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chapterId)) {
                newSet.delete(chapterId);
            } else {
                newSet.add(chapterId);
            }
            return newSet;
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        await onSave(selected);
        setIsSaving(false);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><ListTodo />Select Goal Chapters</DialogTitle>
                    <DialogDescription>Choose from your remaining chapters to set your goal for this month.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] -mx-6 px-6">
                     <div className="space-y-4">
                        {syllabus.map(subject => {
                            const subjectChapters = subject.papers.flatMap(paper => 
                                (paper.sections?.flatMap(section => section.chapters) || []).concat(paper.other || [], paper.chapters || [])
                            ).filter(chapter => uncompletedChapters.some(uc => uc.id === chapter.id));

                            if (subjectChapters.length === 0) return null;

                            return (
                                <div key={subject.subject}>
                                    <h3 className="font-bold text-lg text-primary">{subject.subject}</h3>
                                    <Separator className="my-2" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                    {subjectChapters.map(chapter => (
                                        <div key={chapter.id} className="flex items-center space-x-3">
                                            <Checkbox
                                                id={`goal-select-${chapter.id}`}
                                                checked={selected.has(chapter.id)}
                                                onCheckedChange={() => handleToggle(chapter.id)}
                                            />
                                            <label
                                                htmlFor={`goal-select-${chapter.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {chapter.name}
                                            </label>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2" />}
                        Set Goal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function MonthlyGoalPage() {
    const { currentUser, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [isSavingProgress, startProgressTransition] = useTransition();
    
    const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
    const [initialCompleted, setInitialCompleted] = useState<Set<string>>(new Set());
    const [monthlyGoalChapters, setMonthlyGoalChapters] = useState<Set<string>>(new Set());
    
    const fetchAllData = async (userId: string) => {
        setIsLoading(true);
        const [completed, goal] = await Promise.all([
            getCompletedChaptersAction(userId),
            getMonthlyGoalAction(userId)
        ]);
        
        const completedSet = new Set(completed);
        setCompletedChapters(completedSet);
        setInitialCompleted(completedSet);

        if (goal && goal.month === new Date().getMonth() && goal.year === new Date().getFullYear()) {
            setMonthlyGoalChapters(new Set(goal.chapters));
        } else {
            setMonthlyGoalChapters(new Set());
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (currentUser) {
            fetchAllData(currentUser.id);
        }
    }, [currentUser]);

    const uncompletedChapters = useMemo(() => {
        return allChapters.filter(chapter => !completedChapters.has(chapter.id));
    }, [completedChapters]);

    const handleGoalChapterToggle = (chapterId: string) => {
        setCompletedChapters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chapterId)) {
                newSet.delete(chapterId);
            } else {
                newSet.add(chapterId);
            }
            return newSet;
        });
    };

    const handleSaveGoal = async (newGoalChapterIds: Set<string>) => {
        if (!currentUser) return;
        setIsSavingGoal(true);
        try {
            await saveMonthlyGoalAction(currentUser.id, Array.from(newGoalChapterIds));
            setMonthlyGoalChapters(newGoalChapterIds);
            toast({
                title: 'Goal Saved',
                description: 'Your monthly goal has been updated.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save your monthly goal.',
                variant: 'destructive',
            });
        } finally {
            setIsSavingGoal(false);
        }
    };
    
    const handleSaveProgress = () => {
        if (!currentUser) return;

        startProgressTransition(async () => {
            try {
                await saveCompletedChaptersAction(currentUser.id, Array.from(completedChapters));
                setInitialCompleted(new Set(completedChapters));
                toast({
                    title: 'Progress Saved',
                    description: 'Your syllabus progress has been updated.',
                });
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to save your progress.',
                    variant: 'destructive',
                });
            }
        });
    };

    const isProgressDirty = useMemo(() => {
        if (initialCompleted.size !== completedChapters.size) return true;
        for (const id of initialCompleted) {
            if (!completedChapters.has(id)) return true;
        }
        return false;
    }, [initialCompleted, completedChapters]);

    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    
    const goalProgress = useMemo(() => {
        const goalChapters = Array.from(monthlyGoalChapters);
        if (goalChapters.length === 0) return 0;
        const completedInGoal = goalChapters.filter(id => completedChapters.has(id)).length;
        return Math.round((completedInGoal / goalChapters.length) * 100);
    }, [monthlyGoalChapters, completedChapters]);

    if (isLoading || isUserLoading) {
        return (
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Skeleton className="h-12 w-1/3" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </main>
        );
    }
    
    const chaptersInGoal = Array.from(monthlyGoalChapters).map(id => allChaptersMap.get(id)).filter(Boolean) as SyllabusChapter[];

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                        <Target className="w-8 h-8" />
                        Monthly Goal for {currentMonthName}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Track your monthly focus. Mark chapters as complete and save your progress.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                        <Card>
                            {isProgressDirty && (
                                <div className="p-4 border-b bg-secondary/50 flex justify-between items-center rounded-t-lg">
                                    <p className="text-sm font-medium">You have unsaved progress.</p>
                                    <Button onClick={handleSaveProgress} disabled={isSavingProgress} size="sm">
                                        {isSavingProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Progress
                                    </Button>
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ListTodo />Monthly Goal Checklist</CardTitle>
                                <CardDescription>Check off chapters as you complete them this month.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chaptersInGoal.length === 0 ? (
                                    <div className="text-center py-16">
                                        <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-semibold">No Goal Set</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click the "Set / Edit Goal" button to select chapters for this month.
                                        </p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[50vh]">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            {chaptersInGoal.map(chapter => (
                                                <div key={chapter.id} className="flex items-center space-x-4 p-3 rounded-md hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`goal-check-${chapter.id}`}
                                                        checked={completedChapters.has(chapter.id)}
                                                        onCheckedChange={() => handleGoalChapterToggle(chapter.id)}
                                                        className="h-5 w-5"
                                                    />
                                                    <label
                                                        htmlFor={`goal-check-${chapter.id}`}
                                                        className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {chapter.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:sticky top-24 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Goal Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-muted-foreground">Chapters in Goal</span>
                                            <span className="font-bold">{monthlyGoalChapters.size}</span>
                                        </div>
                                         <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-muted-foreground">Completed</span>
                                            <span className="font-bold">{Array.from(monthlyGoalChapters).filter(id => completedChapters.has(id)).length}</span>
                                        </div>
                                    </div>
                                    <Progress value={goalProgress} />
                                    <p className="text-center font-bold text-2xl text-primary">{goalProgress}%</p>
                                </div>
                            </CardContent>
                        </Card>

                        <GoalSelectorDialog uncompletedChapters={uncompletedChapters} currentGoal={monthlyGoalChapters} onSave={handleSaveGoal}>
                             <Button className="w-full">
                                <Edit className="mr-2" />
                                Set / Edit Goal
                            </Button>
                        </GoalSelectorDialog>
                    </div>
                </div>
            </div>
        </main>
    );
}

    