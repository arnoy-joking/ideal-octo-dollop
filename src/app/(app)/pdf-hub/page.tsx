
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
            if (filteredLessons.length > 0) {
                return { ...course, lessons: filteredLessons };
            }
            if (course.title.toLowerCase().includes(lowercasedFilter)) {
                // Keep the course if title matches, but with original pdf lessons
                 return { ...course, lessons: course.lessons.filter(l => l.pdfUrl) };
            }
            return null;
        }).filter(Boolean) as (Course & { lessons: Required<typeof Course.prototype.lessons> })[];

    }, [courses, searchTerm]);

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
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
                            placeholder="Search by course or lesson title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <Card>
                    <CardContent className="p-4 sm:p-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                            </div>
                        ) : filteredCourses.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-2">
                                {filteredCourses.map((course) => (
                                    <AccordionItem value={course.id} key={course.id} className="border rounded-lg px-4 bg-muted/20 hover:bg-muted/50 transition-colors">
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center gap-4">
                                                <Image 
                                                    src={course.thumbnail}
                                                    alt={course.title}
                                                    width={120}
                                                    height={67}
                                                    className="rounded-md aspect-video object-cover"
                                                    data-ai-hint="online course"
                                                />
                                                <div className="text-left">
                                                    <h3 className="font-semibold text-base sm:text-lg">{course.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{course.lessons.length} PDF(s)</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-0">
                                            <ul className="divide-y">
                                                {course.lessons.map((lesson) => (
                                                    <li key={lesson.id} className="flex justify-between items-center py-3">
                                                        <span className="flex-1 pr-4 text-sm text-muted-foreground">{lesson.title}</span>
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="mr-2 h-4 w-4" />
                                                                Download PDF
                                                            </a>
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <div className="text-center py-16 rounded-lg border-2 border-dashed">
                                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No PDFs Found</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {searchTerm ? `No materials match your search for "${searchTerm}".` : "There are no PDFs available in your courses yet."}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
