'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";

export default function ChatPage() {
    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="text-primary" />
                        AI Assistant
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex-1 p-4 border rounded-lg h-96 flex items-center justify-center text-muted-foreground bg-muted/50">
                        <p>Chat functionality coming soon!</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full items-center space-x-2">
                        <Input type="text" placeholder="Type a message..." disabled />
                        <Button type="submit" disabled>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </main>
    );
}
