'use client';

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useUser } from '@/context/user-context';
import { getCompletedChaptersAction, saveCompletedChaptersAction } from '@/app/actions/syllabus-actions';
import { syllabus, type SyllabusChapter } from '@/lib/data/syllabus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookCopy, Save, Loader2 } from 'lucide-react';

const allChapters: SyllabusChapter[] = syllabus.flatMap(subject => 
    subject.papers.flatMap(paper => 
        (paper.sections?.flatMap(section => section.chapters) || []).concat(paper.other || [], paper.chapters || [])
    )
);

export default function SyllabusPage() {
    const { currentUser, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isLoading, setIsLoading] = useState(true);
    const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
    const [initialCompleted, setInitialCompleted] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (currentUser) {
            setIsLoading(true);
            getCompletedChaptersAction(currentUser.id).then(data => {
                const chapterSet = new Set(data);
                setCompletedChapters(chapterSet);
                setInitialCompleted(chapterSet);
                setIsLoading(false);
            });
        }
    }, [currentUser]);

    const handleChapterToggle = (chapterId: string) => {
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

    const handleSaveProgress = () => {
        if (!currentUser) return;

        startTransition(async () => {
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
    
    const isDirty = useMemo(() => {
        if (initialCompleted.size !== completedChapters.size) return true;
        for (const id of initialCompleted) {
            if (!completedChapters.has(id)) return true;
        }
        return false;
    }, [initialCompleted, completedChapters]);

    const overallProgress = useMemo(() => {
        if (allChapters.length === 0) return 0;
        return Math.round((completedChapters.size / allChapters.length) * 100);
    }, [completedChapters]);

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
                        <BookCopy className="w-8 h-8" />
                        Syllabus Tracker
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Track your progress through the entire syllabus. Check off chapters as you complete them.
                    </p>
                </div>

                <Card className="mb-8 sticky top-4 z-10">
                     {isDirty && (
                        <div className="p-4 border-b bg-secondary/50 flex justify-between items-center">
                            <p className="text-sm font-medium">You have unsaved changes.</p>
                            <Button onClick={handleSaveProgress} disabled={isPending} size="sm">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Progress
                            </Button>
                        </div>
                    )}
                    <CardHeader>
                        <CardTitle>Overall Progress</CardTitle>
                        <CardDescription>
                            {completedChapters.size} of {allChapters.length} chapters completed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Progress value={overallProgress} />
                        <p className="text-right text-sm font-medium mt-2">{overallProgress}% Complete</p>
                    </CardContent>
                </Card>

                <Accordion type="multiple" className="w-full space-y-4">
                    {syllabus.map(subject => {
                        const subjectChapters = subject.papers.flatMap(paper => 
                            (paper.sections?.flatMap(section => section.chapters) || []).concat(paper.other || [], paper.chapters || [])
                        );
                        const completedInSubject = subjectChapters.filter(c => completedChapters.has(c.id)).length;
                        const subjectProgress = subjectChapters.length > 0 ? Math.round((completedInSubject / subjectChapters.length) * 100) : 0;

                        return (
                             <AccordionItem value={subject.subject} key={subject.subject} className="border rounded-lg px-4 bg-card">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="w-full flex justify-between items-center pr-4">
                                        <h3 className="font-semibold text-lg text-primary">{subject.subject}</h3>
                                        <div className="flex items-center gap-4 w-1/3">
                                            <Progress value={subjectProgress} className="h-2 w-full" />
                                            <span className="text-sm font-bold w-12 text-right">{subjectProgress}%</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4">
                                    {subject.papers.map(paper => (
                                        <div key={paper.name} className="mt-4 p-4 border rounded-md bg-muted/50">
                                            <h4 className="font-bold mb-2">{paper.name}</h4>
                                            
                                            {paper.sections && paper.sections.map(section => (
                                                <div key={section.title} className="mb-4">
                                                    <h5 className="font-semibold italic text-muted-foreground mb-2">{section.title}</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                        {section.chapters.map(chapter => (
                                                            <div key={chapter.id} className="flex items-center space-x-3">
                                                                <Checkbox
                                                                    id={chapter.id}
                                                                    checked={completedChapters.has(chapter.id)}
                                                                    onCheckedChange={() => handleChapterToggle(chapter.id)}
                                                                />
                                                                <label
                                                                    htmlFor={chapter.id}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                >
                                                                    {chapter.name}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {(paper.other || paper.chapters) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                    {(paper.other || []).concat(paper.chapters || []).map(chapter => (
                                                         <div key={chapter.id} className="flex items-center space-x-3">
                                                            <Checkbox
                                                                id={chapter.id}
                                                                checked={completedChapters.has(chapter.id)}
                                                                onCheckedChange={() => handleChapterToggle(chapter.id)}
                                                            />
                                                            <label
                                                                htmlFor={chapter.id}
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                            >
                                                                {chapter.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </div>
        </main>
    );
}

