
"use client";

import { useEffect, useRef, useState } from "react";
import type { Lesson } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, CheckCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LessonListProps {
  lessons: Lesson[];
  activeLessonId: string;
  onLessonClick: (lesson: Lesson) => void;
  watchedLessons: Set<string>;
}

export function LessonList({
  lessons,
  activeLessonId,
  onLessonClick,
  watchedLessons,
}: LessonListProps) {
  const lessonRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const activeLessonElement = lessonRefs.current.get(activeLessonId);
    if (activeLessonElement) {
      setTimeout(() => {
        activeLessonElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [activeLessonId, isClient]);

  const handleLessonClick = (lesson: Lesson) => {
    onLessonClick(lesson);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Content</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[50vh] md:h-[480px] w-full">
            <ul className="space-y-1 pr-4">
            {lessons.map((lesson, index) => {
                const isActive = lesson.id === activeLessonId;
                const isWatched = watchedLessons.has(lesson.id);
                return (
                <li
                    key={lesson.id}
                    ref={(el) => lessonRefs.current.set(lesson.id, el)}
                    className={cn(
                    "flex items-center justify-between rounded-md transition-colors",
                    isActive ? "bg-secondary" : "hover:bg-muted/50"
                    )}
                >
                    <button
                    className="flex-1 flex items-start gap-4 p-3 text-left"
                    onClick={() => handleLessonClick(lesson)}
                    >
                        <div className="flex flex-col items-center pt-1">
                          {isClient ? (
                            isActive ? (
                                <PlayCircle className="w-6 h-6 text-primary" />
                            ) : isWatched ? (
                                <CheckCircle className="w-6 h-6 text-green-700" />
                            ) : (
                                <span className="font-bold text-lg text-muted-foreground w-6 text-center">
                                {index + 1}
                                </span>
                            )
                          ) : (
                             <span className="font-bold text-lg text-muted-foreground w-6 text-center">
                                {index + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex-1">
                            <p
                            className={cn(
                                "font-medium leading-snug",
                                isActive && "text-primary"
                            )}
                            >
                            {lesson.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                            {lesson.duration}
                            </p>
                        </div>
                    </button>
                    {lesson.pdfUrl &&
                        <a
                        href={lesson.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-muted-foreground hover:text-primary"
                        aria-label={`Download materials for ${lesson.title}`}
                        >
                            <Download className="h-5 w-5" />
                        </a>
                    }
                </li>
                );
            })}
            </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
