
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
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
    { name: "Default", theme: "default", color: "hsl(135 28% 30%)" },
    { name: "Ocean", theme: "ocean", color: "hsl(217.2 91.2% 59.8%)" },
    { name: "Sunset", theme: "sunset", color: "hsl(35.8 91.7% 55.1%)" },
    { name: "Forest", theme: "forest", color: "hsl(90 45% 45%)" },
    { name: "Darkest", theme: "darkest", color: "hsl(210 40% 40%)" },
];

export function ThemeCustomizerDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { theme: activeTheme, setTheme } = useTheme();

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
                    {themes.map((t) => (
                        <div key={t.theme} className="flex flex-col items-center gap-2">
                             <Button
                                variant="outline"
                                size="icon"
                                className="h-16 w-16 rounded-full"
                                style={{ backgroundColor: t.color }}
                                onClick={() => setTheme(`theme-${t.theme}`)}
                             >
                                {activeTheme === `theme-${t.theme}` && <Check className="h-6 w-6 text-primary-foreground" />}
                                <span className="sr-only">{t.name}</span>
                            </Button>
                            <span className="text-xs font-medium">{t.name}</span>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
