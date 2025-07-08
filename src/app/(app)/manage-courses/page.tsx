'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { Course, Lesson } from '@/lib/types';
import { getCoursesAction, addCourseAction, deleteCourseAction, updateCourseAction, updateCourseOrderAction } from '@/app/actions/course-actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
  
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2, Edit, Loader2, Lock, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


const lessonSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    duration: z.string().regex(/^\d{2,}:\d{2}:\d{2}$/, 'Duration must be in HH:MM:SS format'),
    videoId: z.string().min(1, 'Video ID is required'),
    pdfUrl: z.string().url('Must be a valid URL if provided').or(z.literal('')).optional(),
});

const courseSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    description: z.string().min(1, 'Description is required'),
    thumbnail: z.string().url('Thumbnail must be a valid URL'),
    lessons: z.array(lessonSchema).min(1, 'At least one lesson is required'),
    order: z.number(),
});

type CourseFormData = z.infer<typeof courseSchema>;

function CourseForm({ course, onFormSubmit, closeDialog, totalCourses }: { course?: Course; onFormSubmit: () => void; closeDialog: () => void; totalCourses?: number }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkText, setBulkText] = useState('');
    
    const form = useForm<CourseFormData>({
        resolver: zodResolver(courseSchema),
        defaultValues: course ? {
            ...course,
            lessons: course.lessons.map(l => ({...l, pdfUrl: l.pdfUrl || ''}))
        } : {
            title: '',
            slug: '',
            description: '',
            thumbnail: '',
            lessons: [],
            order: totalCourses || 0,
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "lessons",
    });

    const handleParseBulkLessons = () => {
        const lines = bulkText.split('\n').filter(line => line.trim() !== '');
        const newLessons: (Omit<Lesson, 'id'|'pdfUrl'> & {pdfUrl?: string})[] = [];
        let errors = 0;

        lines.forEach((line, index) => {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length === 3 || parts.length === 4) {
                newLessons.push({
                    title: parts[1],
                    duration: parts[2],
                    videoId: parts[0],
                    pdfUrl: parts[3] || ''
                });
            } else {
                errors++;
            }
        });

        if (newLessons.length > 0) {
            const lessonsToAppend = newLessons.map(l => ({...l, id: crypto.randomUUID(), title: l.title, duration: l.duration, videoId: l.videoId, pdfUrl: l.pdfUrl || ''}));
            append(lessonsToAppend);
            toast({
                title: 'Lessons Appended',
                description: `Successfully appended ${newLessons.length} lessons. ${errors > 0 ? `${errors} lines had formatting issues and were ignored.` : ''}`
            });
        } else {
            toast({
                title: 'Parsing Failed',
                description: 'No valid lessons found. Please check the format and try again.',
                variant: 'destructive'
            });
        }
    };


    const onSubmit = async (data: CourseFormData) => {
        setIsSubmitting(true);
        
        const coursePayload = {
            ...data,
            lessons: data.lessons.map(l => ({ ...l, id: l.id || crypto.randomUUID() }))
        };

        const result = course 
            ? await updateCourseAction(course.id, coursePayload as Omit<Course, 'id'>)
            : await addCourseAction(coursePayload as Omit<Course, 'id'>);

        setIsSubmitting(false);

        if (result.success) {
            toast({ title: 'Success', description: `Course ${course ? 'updated' : 'added'} successfully.` });
            onFormSubmit();
            closeDialog();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="slug" render={({ field }) => ( <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="thumbnail" render={({ field }) => ( <FormItem><FormLabel>Thumbnail URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="order" render={({ field }) => ( <FormItem><FormLabel>Display Order</FormLabel><FormControl><Input type="number" {...field} disabled /></FormControl><FormMessage /></FormItem> )} />
                </div>
                
                <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Add</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="space-y-4 pt-4">
                         {fields.length > 0 && <h3 className="text-lg font-medium">Lessons</h3>}
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                                <FormField control={form.control} name={`lessons.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Lesson Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`lessons.${index}.duration`} render={({ field }) => ( <FormItem><FormLabel>Duration (HH:MM:SS)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`lessons.${index}.videoId`} render={({ field }) => ( <FormItem><FormLabel>YouTube Video ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`lessons.${index}.pdfUrl`} render={({ field }) => ( <FormItem><FormLabel>PDF URL (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), title: '', duration: '00:00:00', videoId: '', pdfUrl: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Lesson
                        </Button>
                    </TabsContent>
                    <TabsContent value="bulk" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="bulk-lessons">Bulk Add Lessons</Label>
                            <FormDescription>
                                Add lessons using the format: `Video ID | Title | Duration (HH:MM:SS) | PDF URL`. The PDF URL is optional. Each lesson on a new line.
                            </FormDescription>
                            <Textarea
                                id="bulk-lessons"
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                rows={10}
                                placeholder="SqcY0GlETPk | What is React? | 00:10:32 | https://example.com/react-1.pdf&#10;9S6M2i_S8s | Setting Up Your Environment | 00:15:10"
                                className="font-code text-xs"
                            />
                        </div>
                        <Button type="button" onClick={handleParseBulkLessons}>Parse & Add Lessons</Button>
                    </TabsContent>
                </Tabs>


                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {course ? 'Save Changes' : 'Add Course'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

function AddEditCourseDialog({ course, onUpdate, children, totalCourses }: { course?: Course, onUpdate: () => void, children: React.ReactNode, totalCourses?: number }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{course ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                    <DialogDescription>{course ? 'Edit the details of your course.' : 'Fill in the details for the new course.'}</DialogDescription>
                </DialogHeader>
                <CourseForm course={course} onFormSubmit={onUpdate} closeDialog={() => setIsOpen(false)} totalCourses={totalCourses} />
            </DialogContent>
        </Dialog>
    );
}

function CourseManager() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [initialOrder, setInitialOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const { toast } = useToast();

    const fetchCourses = async () => {
        setIsLoading(true);
        const fetchedCourses = await getCoursesAction();
        setCourses(fetchedCourses);
        setInitialOrder(fetchedCourses.map(c => c.id));
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleDelete = async (courseId: string) => {
        const result = await deleteCourseAction(courseId);
        if (result.success) {
            toast({ title: 'Success', description: 'Course deleted.' });
            fetchCourses();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };
    
    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newCourses = [...courses];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (newIndex < 0 || newIndex >= newCourses.length) return;

        [newCourses[index], newCourses[newIndex]] = [newCourses[newIndex], newCourses[index]];
        setCourses(newCourses);
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        const courseIds = courses.map(c => c.id);
        const result = await updateCourseOrderAction(courseIds);
        if (result.success) {
            toast({ title: 'Success', description: 'Course order saved.' });
            setInitialOrder(courseIds);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setIsSavingOrder(false);
    };
    
    const isOrderChanged = JSON.stringify(courses.map(c => c.id)) !== JSON.stringify(initialOrder);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        )
    }

    return (
        <div>
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Manage Courses</h1>
                    <p className="text-muted-foreground">Add, edit, or reorder your courses.</p>
                </div>
                <AddEditCourseDialog onUpdate={fetchCourses} totalCourses={courses.length}>
                    <Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Course</Button>
                </AddEditCourseDialog>
            </div>
            {isOrderChanged && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 p-4 border rounded-lg bg-secondary/50">
                    <p className="text-sm font-medium text-secondary-foreground text-center sm:text-left">You have unsaved changes to the course order.</p>
                    <Button onClick={handleSaveOrder} disabled={isSavingOrder} className="w-full sm:w-auto">
                        {isSavingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Order
                    </Button>
                </div>
             )}
            <div className="space-y-4">
                {courses.map((course, index) => (
                    <Card key={course.id}>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                               <div className="flex flex-col gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'down')} disabled={index === courses.length - 1}>
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                               </div>
                               <div>
                                    <CardTitle>{course.title}</CardTitle>
                                    <CardDescription>{course.lessons.length} lessons</CardDescription>
                               </div>
                           </div>
                           <div className="flex gap-2 self-end sm:self-center">
                                <AddEditCourseDialog course={course} onUpdate={fetchCourses}>
                                    <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                                </AddEditCourseDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the course "{course.title}".
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(course.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                           </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    )
}


export default function ManageCoursesPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'arnoy-joking';

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setTimeout(() => {
            if (password === correctPassword) {
                setIsAuthenticated(true);
            } else {
                setError('Incorrect password. Please try again.');
            }
            setIsLoading(false);
        }, 500)
    };

    if (!isAuthenticated) {
        return (
            <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <form onSubmit={handleLogin}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Lock /> Secure Area</CardTitle>
                            <CardDescription>Enter the password to manage courses.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Label htmlFor="password">Password</Label>
                             <Input 
                                id="password" 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Unlock
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </main>
        )
    }

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <CourseManager />
            </div>
        </main>
    );
}
