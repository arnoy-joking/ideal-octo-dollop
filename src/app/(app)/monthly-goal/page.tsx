
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import { getCompletedChaptersAction, getMonthlyGoalAction, saveMonthlyGoalAction } from '@/app/actions/syllabus-actions';
import { syllabus, type SyllabusChapter } from '@/lib/data/syllabus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Target, Save, Loader2, ListTodo, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const allChapters: SyllabusChapter[] = syllabus.flatMap(subject => 
    subject.papers.flatMap(paper => 
        (paper.sections?.flatMap(section => section.chapters) || []).concat(paper.other || [], paper.chapters || [])
    )
);
const allChaptersMap = new Map(allChapters.map(c => [c.id, c]));

export default function MonthlyGoalPage() {
    const { currentUser, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
    const [monthlyGoalChapters, setMonthlyGoalChapters] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (currentUser) {
            setIsLoading(true);
            Promise.all([
                getCompletedChaptersAction(currentUser.id),
                getMonthlyGoalAction(currentUser.id)
            ]).then(([completed, goal]) => {
                setCompletedChapters(new Set(completed));
                if (goal && goal.month === new Date().getMonth() && goal.year === new Date().getFullYear()) {
                    setMonthlyGoalChapters(new Set(goal.chapters));
                } else {
                    setMonthlyGoalChapters(new Set());
                }
                setIsLoading(false);
            });
        }
    }, [currentUser]);

    const uncompletedChapters = useMemo(() => {
        return allChapters.filter(chapter => !completedChapters.has(chapter.id));
    }, [completedChapters]);

    const handleGoalToggle = (chapterId: string) => {
        setMonthlyGoalChapters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chapterId)) {
                newSet.delete(chapterId);
            } else {
                newSet.add(chapterId);
            }
            return newSet;
        });
    };

    const handleSaveGoal = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await saveMonthlyGoalAction(currentUser.id, Array.from(monthlyGoalChapters));
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
            setIsSaving(false);
        }
    };
    
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

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                        <Target className="w-8 h-8" />
                        Monthly Goal for {currentMonthName}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Select uncompleted chapters to focus on this month. Your progress is tracked from the main Syllabus page.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ListTodo />Select Chapters</CardTitle>
                                <CardDescription>Choose from your remaining chapters to set your goal.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {uncompletedChapters.length === 0 ? (
                                    <div className="text-center py-16">
                                        <CheckCircle2 className="mx-auto h-12 w-12 text-green-700" />
                                        <h3 className="mt-4 text-lg font-semibold">Syllabus Complete!</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            You have completed all chapters. Amazing work!
                                        </p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[60vh]">
                                        <div className="space-y-4 pr-4">
                                            {syllabus.map(subject => {
                                                const subjectChapters = subject.papers.flatMap(paper => 
                                                    (paper.sections?.flatMap(section => section.chapters) || []).concat(paper.other || [], paper.chapters || [])
                                                ).filter(chapter => !completedChapters.has(chapter.id));

                                                if (subjectChapters.length === 0) return null;

                                                return (
                                                    <div key={subject.subject}>
                                                        <h3 className="font-bold text-lg text-primary">{subject.subject}</h3>
                                                        <Separator className="my-2" />
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                        {subjectChapters.map(chapter => (
                                                            <div key={chapter.id} className="flex items-center space-x-3">
                                                                <Checkbox
                                                                    id={`goal-${chapter.id}`}
                                                                    checked={monthlyGoalChapters.has(chapter.id)}
                                                                    onCheckedChange={() => handleGoalToggle(chapter.id)}
                                                                />
                                                                <label
                                                                    htmlFor={`goal-${chapter.id}`}
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
                        <Button className="w-full" onClick={handleSaveGoal} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                            Save Monthly Goal
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
