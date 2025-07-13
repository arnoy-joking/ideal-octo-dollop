
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/context/user-context';
import { getThemeSettingsAction, saveThemeSettingsAction } from '@/app/actions/theme-actions';
import type { ThemeSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Settings, Image as ImageIcon, Wind, Droplets } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


const themeSettingSchema = z.object({
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).or(z.literal("")),
  opacity: z.number().min(0).max(100),
  blur: z.number().min(0).max(20),
});

const formSchema = z.object({
  'theme-ocean': themeSettingSchema,
  'theme-sunset': themeSettingSchema,
  'theme-forest': themeSettingSchema,
  'theme-darkest': themeSettingAwaited,
});

type FormData = z.infer<typeof formSchema>;

const themeDetails = {
  'theme-ocean': { name: 'Ocean', icon: Droplets },
  'theme-sunset': { name: 'Sunset', icon: Wind },
  'theme-forest': { name: 'Forest', icon: ImageIcon },
  'theme-darkest': { name: 'Darkest', icon: Droplets },
};


export default function SettingsPage() {
  const { currentUser, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      'theme-ocean': { imageUrl: '', opacity: 50, blur: 4 },
      'theme-sunset': { imageUrl: '', opacity: 50, blur: 4 },
      'theme-forest': { imageUrl: '', opacity: 50, blur: 4 },
      'theme-darkest': { imageUrl: '', opacity: 50, blur: 4 },
    },
  });

  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      getThemeSettingsAction(currentUser.id).then(settings => {
        if (settings) {
          form.reset(settings as FormData);
        }
        setIsLoading(false);
      });
    }
  }, [currentUser, form]);

  const onSubmit = (data: FormData) => {
    if (!currentUser) return;
    startTransition(async () => {
      try {
        await saveThemeSettingsAction(currentUser.id, data);
        toast({
          title: 'Settings Saved',
          description: 'Your theme settings have been updated.',
        });
        // Optionally refresh the page to see changes immediately
        window.location.reload();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save settings.',
          variant: 'destructive',
        });
      }
    });
  };
  
  if (isLoading || isUserLoading) {
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
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
            <Settings className="w-8 h-8" />
            Theme Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize the look and feel of your learning environment.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Custom Themes</CardTitle>
                    <CardDescription>
                        Set a custom background image, opacity, and blur for each theme.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" defaultValue={["theme-ocean"]} className="w-full">
                        {Object.entries(themeDetails).map(([key, { name, icon: Icon }]) => {
                            const themeKey = key as keyof FormData;
                            return (
                                <AccordionItem value={key} key={key}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-5 w-5 text-primary" />
                                            <span className="text-lg">{name}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor={`${key}-imageUrl`}>Background Image URL</Label>
                                            <Controller
                                                name={`${themeKey}.imageUrl`}
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Input
                                                        id={`${key}-imageUrl`}
                                                        placeholder="https://images.unsplash.com/..."
                                                        {...field}
                                                    />
                                                )}
                                            />
                                            {form.formState.errors[themeKey]?.imageUrl && (
                                                <p className="text-sm text-destructive">{form.formState.errors[themeKey]?.imageUrl?.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Opacity ({form.watch(`${themeKey}.opacity`)}%)</Label>
                                             <Controller
                                                name={`${themeKey}.opacity`}
                                                control={form.control}
                                                render={({ field: { value, onChange } }) => (
                                                    <Slider
                                                        value={[value]}
                                                        onValueChange={(vals) => onChange(vals[0])}
                                                        max={100}
                                                        step={1}
                                                    />
                                                )}
                                            />
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Blur ({form.watch(`${themeKey}.blur`)}px)</Label>
                                             <Controller
                                                name={`${themeKey}.blur`}
                                                control={form.control}
                                                render={({ field: { value, onChange } }) => (
                                                    <Slider
                                                        value={[value]}
                                                        onValueChange={(vals) => onChange(vals[0])}
                                                        max={20}
                                                        step={1}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Settings
                </Button>
            </div>
        </form>
      </div>
    </main>
  );
}
