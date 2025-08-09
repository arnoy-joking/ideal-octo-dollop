
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/context/user-context';
import { getThemeSettingsAction, saveThemeSettingsAction, deleteThemeSettingAction, getPexelsImageAction } from '@/app/actions/theme-actions';
import { generateTheme } from '@/ai/flows/theme-flow';
import type { ThemeSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Settings, Image as ImageIcon, Wind, Droplets, Trash2, Sparkles, Wand2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


const themeSettingSchema = z.object({
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).or(z.literal("")),
  opacity: z.number().min(0).max(100),
  blur: z.number().min(0).max(20),
  colors: z.record(z.string()).optional(),
});

const formSchema = z.object({
  'theme-ocean': themeSettingSchema,
  'theme-sunset': themeSettingSchema,
  'theme-forest': themeSettingSchema,
  'theme-darkest': themeSettingSchema,
}).catchall(themeSettingSchema);


type FormData = z.infer<typeof formSchema>;

const builtInThemes = {
  'theme-ocean': { name: 'Ocean', icon: Droplets },
  'theme-sunset': { name: 'Sunset', icon: Wind },
  'theme-forest': { name: 'Forest', icon: ImageIcon },
  'theme-darkest': { name: 'Darkest', icon: Droplets },
};

function AIThemeGeneratorDialog({ onThemeGenerated }: { onThemeGenerated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const { currentUser } = useUser();
    const { toast } = useToast();

    const handleGenerate = async () => {
        if (!prompt.trim() || !currentUser) return;
        setIsGenerating(true);
        try {
            const result = await generateTheme({ prompt });
            
            const imageUrl = await getPexelsImageAction(result.imageSearchQuery);

            const newThemeKey = `theme-${result.name.toLowerCase().replace(/\s+/g, '-')}`;

            const newThemeSettings = {
                [newThemeKey]: {
                    imageUrl: imageUrl || 'https://images.pexels.com/photos/110854/pexels-photo-110854.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // fallback image
                    opacity: 50,
                    blur: 4,
                    colors: {
                        background: `${result.background.h} ${result.background.s}% ${result.background.l}%`,
                        foreground: `${result.foreground.h} ${result.foreground.s}% ${result.foreground.l}%`,
                        card: `${result.card.h} ${result.card.s}% ${result.card.l}%`,
                        'card-foreground': `${result.cardForeground.h} ${result.cardForeground.s}% ${result.cardForeground.l}%`,
                        popover: `${result.popover.h} ${result.popover.s}% ${result.popover.l}%`,
                        'popover-foreground': `${result.popoverForeground.h} ${result.popoverForeground.s}% ${result.popoverForeground.l}%`,
                        primary: `${result.primary.h} ${result.primary.s}% ${result.primary.l}%`,
                        'primary-foreground': `${result.primaryForeground.h} ${result.primaryForeground.s}% ${result.primaryForeground.l}%`,
                        secondary: `${result.secondary.h} ${result.secondary.s}% ${result.secondary.l}%`,
                        'secondary-foreground': `${result.secondaryForeground.h} ${result.secondaryForeground.s}% ${result.secondaryForeground.l}%`,
                        muted: `${result.muted.h} ${result.muted.s}% ${result.muted.l}%`,
                        'muted-foreground': `${result.mutedForeground.h} ${result.mutedForeground.s}% ${result.mutedForeground.l}%`,
                        accent: `${result.accent.h} ${result.accent.s}% ${result.accent.l}%`,
                        'accent-foreground': `${result.accentForeground.h} ${result.accentForeground.s}% ${result.accentForeground.l}%`,
                        destructive: `${result.destructive.h} ${result.destructive.s}% ${result.destructive.l}%`,
                        'destructive-foreground': `${result.destructiveForeground.h} ${result.destructiveForeground.s}% ${result.destructiveForeground.l}%`,
                        border: `${result.border.h} ${result.border.s}% ${result.border.l}%`,
                        input: `${result.input.h} ${result.input.s}% ${result.input.l}%`,
                        ring: `${result.ring.h} ${result.ring.s}% ${result.ring.l}%`,
                        sidebar: `${result.sidebar.h} ${result.sidebar.s}% ${result.sidebar.l}%`,
                        'sidebar-foreground': `${result.sidebarForeground.h} ${result.sidebarForeground.s}% ${result.sidebarForeground.l}%`,
                    }
                }
            };

            const existingSettings = await getThemeSettingsAction(currentUser.id) || {};
            const finalSettings = { ...existingSettings, ...newThemeSettings };
            await saveThemeSettingsAction(currentUser.id, finalSettings);
            
            toast({
                title: 'Theme Generated!',
                description: `New theme "${result.name}" has been created and saved.`,
            });
            onThemeGenerated();
            setIsOpen(false);
            setPrompt('');

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to generate theme.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Wand2 className="mr-2" /> AI Theme Generator</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate a Theme with AI</DialogTitle>
                    <DialogDescription>Describe the look and feel you want, and AI will create a theme for you.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="theme-prompt">Prompt</Label>
                    <Textarea 
                        id="theme-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A cyberpunk city at night with neon lights" 
                        rows={3}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={() => handleGenerate()} disabled={isGenerating || !prompt.trim()}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                        Generate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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

  const fetchSettings = () => {
    if (currentUser) {
      setIsLoading(true);
      getThemeSettingsAction(currentUser.id).then(settings => {
        if (settings) {
          form.reset(settings as unknown as FormData);
        }
        setIsLoading(false);
      });
    }
  };

  useEffect(fetchSettings, [currentUser, form]);

  const onSubmit = (data: FormData) => {
    if (!currentUser) return;
    startTransition(async () => {
      try {
        await saveThemeSettingsAction(currentUser.id, data as unknown as ThemeSettings);
        toast({
          title: 'Settings Saved',
          description: 'Your theme settings have been updated.',
        });
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

  const handleDeleteTheme = (themeKey: string) => {
    if (!currentUser) return;
    startTransition(async () => {
        try {
            await deleteThemeSettingAction(currentUser.id, themeKey);
            toast({
                title: 'Theme Deleted',
                description: 'The theme has been removed.',
            });
            fetchSettings(); // Refetch settings to update the UI
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete theme.', variant: 'destructive' });
        }
    });
  };
  
  const allThemeKeys = Object.keys(form.getValues());
  
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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                <Settings className="w-8 h-8" />
                Theme Settings
            </h1>
            <p className="text-muted-foreground mt-2">
                Customize the look and feel of your learning environment.
            </p>
          </div>
          <AIThemeGeneratorDialog onThemeGenerated={fetchSettings} />
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
                        {allThemeKeys.map((key) => {
                            const themeKey = key as keyof FormData;
                            const isBuiltIn = !!builtInThemes[themeKey as keyof typeof builtInThemes];
                            const name = isBuiltIn ? builtInThemes[themeKey as keyof typeof builtInThemes].name : key.replace('theme-', ' ').replace(/-/g, ' ');
                            const Icon = isBuiltIn ? builtInThemes[themeKey as keyof typeof builtInThemes].icon : Sparkles;
                            
                            return (
                                <AccordionItem value={key} key={key}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-3 flex-1">
                                            <Icon className="h-5 w-5 text-primary" />
                                            <span className="text-lg capitalize">{name}</span>
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
                                        {!isBuiltIn && (
                                            <div className="flex justify-end pt-2">
                                                <Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteTheme(themeKey)}>
                                                    <Trash2 className="mr-2" />
                                                    Delete Theme
                                                </Button>
                                            </div>
                                        )}
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
                    Save All Settings
                </Button>
            </div>
        </form>
      </div>
    </main>
  );
}
