
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Course } from '@/lib/types';
import { getCoursesAction } from '@/app/actions/course-actions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, FileText, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PdfHubPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function loadCourses() {
            setIsLoading(true);
            const fetchedCourses = await getCoursesAction();
            setCourses(fetchedCourses);
            setIsLoading(false);
        }
        loadCourses();
    }, []);

    const filteredCourses = useMemo(() => {
        const coursesWithPdfs = courses.map(course => ({
            ...course,
            lessons: course.lessons.filter(lesson => lesson.pdfUrl)
        })).filter(course => course.lessons.length > 0);

        if (!searchTerm) {
            return coursesWithPdfs;
        }

        const lowercasedFilter = searchTerm.toLowerCase();
        
        return coursesWithPdfs.map(course => {
            const filteredLessons = course.lessons.filter(lesson => 
                lesson.title.toLowerCase().includes(lowercasedFilter)
            );
            return { ...course, lessons: filteredLessons };
        }).filter(course => course.lessons.length > 0 || course.title.toLowerCase().includes(lowercasedFilter));

    }, [courses, searchTerm]);

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                            <FileText className="w-8 h-8" />
                            PDF Hub
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Find all your course materials in one place.
                        </p>
                    </div>
                </div>

                <div className="mb-8 max-w-lg">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search for a PDF by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                           <Card key={i} className="overflow-hidden">
                                <Skeleton className="h-40 w-full" />
                                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                                <CardContent className="space-y-4">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-8 w-full" />
                                </CardContent>
                           </Card>
                        ))}
                    </div>
                ) : filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => (
                            <Card key={course.id} className="flex flex-col">
                                <Image 
                                    src={course.thumbnail}
                                    alt={course.title}
                                    width={400}
                                    height={225}
                                    className="w-full aspect-video object-cover"
                                    data-ai-hint="online course"
                                />
                                <CardHeader>
                                    <CardTitle>{course.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col">
                                    <ScrollArea className="h-48 pr-3 -mr-3 flex-grow">
                                        <ul className="space-y-2">
                                            {course.lessons.map((lesson) => (
                                                <li key={lesson.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 text-sm">
                                                    <span className="flex-1 pr-2">{lesson.title}</span>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                                            <Download className="mr-2 h-4 w-4" />
                                                            PDF
                                                        </a>
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 rounded-lg border-2 border-dashed">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No PDFs Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {searchTerm ? `No PDFs match your search for "${searchTerm}".` : "There are no PDFs available in your courses yet."}
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
