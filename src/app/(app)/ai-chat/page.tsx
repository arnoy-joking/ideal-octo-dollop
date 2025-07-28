'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { continueChat, type ChatMessage } from '@/ai/flows/chat-flow';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function ChatBubble({ message }: { message: ChatMessage }) {
    const { currentUser } = useUser();
    const isUser = message.role === 'user';

    const author = isUser ? currentUser : { name: 'AI Assistant', avatar: '' };
    const authorName = author?.name || (isUser ? 'You' : 'AI Assistant');
    const authorAvatar = author?.avatar || '';

    return (
        <div className={cn("flex items-start gap-4", isUser ? "justify-end" : "")}>
            {!isUser && (
                <Avatar className="h-9 w-9 border">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                        <Bot className="h-5 w-5 text-primary" />
                    </div>
                </Avatar>
            )}
            <div className={cn(
                "max-w-[75%] rounded-lg p-3 text-sm", 
                isUser ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                <p className="font-semibold mb-1">{authorName}</p>
                <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {isUser && (
                <Avatar className="h-9 w-9 border">
                    <AvatarImage src={authorAvatar} alt={authorName} />
                    <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}


export default function AIChatPage() {
    const { currentUser, isLoading: isUserLoading } = useUser();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;

        const userMessage: ChatMessage = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsThinking(true);

        try {
            const aiResponse = await continueChat(newMessages, input.trim());
            const aiMessage: ChatMessage = { role: 'model', content: aiResponse };
            setMessages([...newMessages, aiMessage]);
        } catch (error) {
            console.error("Error getting AI response:", error);
            const errorMessage: ChatMessage = { role: 'model', content: "Sorry, something went wrong. Please try again." };
            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };
    
    if (isUserLoading) {
        return (
             <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
                <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
                     <Skeleton className="h-10 w-48 mb-8" />
                     <Card className="flex-1 flex flex-col">
                        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                        <CardContent className="flex-1 p-4 space-y-4">
                            <Skeleton className="h-16 w-3/4" />
                            <Skeleton className="h-16 w-3/4 self-end" />
                        </CardContent>
                        <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                     </Card>
                </div>
            </main>
        )
    }

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
            <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
                <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3 mb-8">
                    <Bot className="w-8 h-8" />
                    AI Chat
                </h1>

                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>Conversation</CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 p-0">
                        <ScrollArea ref={scrollAreaRef} className="h-[55vh] p-4">
                           <div className="space-y-6">
                                {messages.length > 0 ? (
                                    messages.map((msg, index) => (
                                        <ChatBubble key={index} message={msg} />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                        <Bot className="h-12 w-12 mb-4" />
                                        <p className="text-lg font-medium">AI Assistant is ready.</p>
                                        <p>Ask me anything!</p>
                                    </div>
                                )}
                                {isThinking && (
                                    <div className="flex items-start gap-4">
                                        <Avatar className="h-9 w-9 border">
                                             <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                                                <Bot className="h-5 w-5 text-primary" />
                                            </div>
                                        </Avatar>
                                        <div className="max-w-[75%] rounded-lg p-3 bg-muted">
                                            <p className="font-semibold mb-1">AI Assistant</p>
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                           </div>
                        </ScrollArea>
                    </CardContent>
                    
                    <CardFooter className="pt-6 border-t">
                        <div className="flex w-full items-center space-x-2">
                            <Input 
                                type="text" 
                                placeholder="Type your message here..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                disabled={isThinking}
                            />
                            <Button type="submit" onClick={handleSend} disabled={!input.trim() || isThinking}>
                                {isThinking ? <Loader2 className="animate-spin" /> : <Send />}
                                <span className="sr-only">Send</span>
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </main>
    )
}
