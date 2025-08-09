
"use client"

import { useTheme } from "next-themes";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Droplets, ImageIcon, Sparkles, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import { useEffect, useState } from "react";
import type { ThemeSettings } from "@/lib/types";
import { getThemeSettingsAction } from "@/app/actions/theme-actions";

const defaultThemes = [
    { name: "Default", theme: "theme-default", color: "hsl(142 76% 36%)" },
    { name: "Ocean", theme: "theme-ocean", color: "hsl(190 70% 50%)" },
    { name: "Sunset", theme: "theme-sunset", color: "hsl(20 95% 55%)" },
    { name: "Forest", theme: "theme-forest", color: "hsl(130 40% 35%)" },
    { name: "Darkest", theme: "theme-darkest", color: "hsl(210 40% 50%)" },
];

const themeIcons = {
    "default": Sparkles,
    "ocean": Droplets,
    "sunset": Wind,
    "forest": ImageIcon,
    "darkest": Droplets,
} as const;


export function ThemeCustomizerDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { theme: activeTheme, setTheme } = useTheme();
    const { currentUser } = useUser();
    const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);

    useEffect(() => {
        if (currentUser) {
            getThemeSettingsAction(currentUser.id).then(setThemeSettings);
        }
    }, [currentUser, isOpen]);

    const customThemes = themeSettings 
        ? Object.keys(themeSettings).filter(t => !defaultThemes.some(dt => dt.theme === t))
        : [];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Customize Theme</DialogTitle>
                    <DialogDescription>
                        Pick a theme that matches your mood.
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex flex-wrap gap-4 py-4">
                    {defaultThemes.map((t) => {
                        const Icon = themeIcons[t.theme.replace('theme-', '') as keyof typeof themeIcons] || Sparkles;
                        return (
                            <div key={t.theme} className="flex flex-col items-center gap-2">
                                <Button
                                    variant={"outline"}
                                    size="icon"
                                    className={cn("h-16 w-16 rounded-full flex items-center justify-center", activeTheme === t.theme && "border-2 border-primary")}
                                    onClick={() => setTheme(t.theme)}
                                >
                                    <Icon className="h-6 w-6" style={{color: t.color}} />
                                </Button>
                                <span className="text-xs font-medium">{t.name}</span>
                            </div>
                        )
                    })}
                     {customThemes.map((themeName) => {
                        return (
                            <div key={themeName} className="flex flex-col items-center gap-2">
                                <Button
                                    variant={"outline"}
                                    size="icon"
                                    className={cn("h-16 w-16 rounded-full flex items-center justify-center", activeTheme === themeName && "border-2 border-primary")}
                                    onClick={() => setTheme(themeName)}
                                >
                                     <Sparkles className="h-6 w-6 text-primary" />
                                </Button>
                                <span className="text-xs font-medium capitalize">{themeName.replace('theme-', '').replace(/-/g, ' ')}</span>
                            </div>
                        )
                     })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
