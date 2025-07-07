'use client';
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Calculator, Loader2, Lightbulb, Delete as Backspace, Divide, Minus, Plus, X as Times, Equal, Camera, ImageUp, Trash2 } from "lucide-react";
import { solveMathProblem, type MathProblemInput, type MathProblemOutput } from "@/ai/flows/calculator-flow";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

export default function AiCalculatorPage() {
    const [problem, setProblem] = useState('');
    const [result, setResult] = useState<MathProblemOutput | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [imageDataUri, setImageDataUri] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isCameraOpen) {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            return;
        }

        const getCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        };

        getCameraPermission();
    }, [isCameraOpen, toast]);

    const handleButtonClick = (value: string) => {
        if (isLoading) return;
        
        const isNumeric = /[0-9.]/.test(value);
        const isOperator = [' + ', ' - ', ' * ', ' / '].includes(value);

        if (result && !showExplanation) {
            if (isNumeric && !isOperator) {
                setProblem(value);
                setResult(null);
                setImageDataUri(null);
                return;
            } else if (isOperator) {
                setProblem(result.answer + value);
                setResult(null);
                setImageDataUri(null);
                return;
            }
        }
        
        setProblem(prev => prev + value);
    };

    const handleClear = () => {
        if (isLoading) return;
        setProblem('');
        setResult(null);
        setShowExplanation(false);
        setImageDataUri(null);
    };

    const handleBackspace = () => {
        if (isLoading) return;
        setProblem(prev => prev.slice(0, -1));
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageDataUri(event.target?.result as string);
            };
            reader.readAsDataURL(file);
            if (e.target) e.target.value = '';
        }
    };

    const handleCapture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUri = canvas.toDataURL('image/jpeg');
            setImageDataUri(dataUri);
            setIsCameraOpen(false);
        }
    }, []);

    const clearImage = () => {
        setImageDataUri(null);
    };

    const solveWithAI = async (input: MathProblemInput) => {
         try {
            const response = await solveMathProblem(input);
            setResult(response);
        } catch (error) {
            console.error("Calculation error:", error);
            toast({ title: "Error", description: "Could not solve the problem. Please try again.", variant: "destructive" });
            setResult(null);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedProblem = problem.trim();
        if (!trimmedProblem && !imageDataUri) {
            toast({ title: "Error", description: "Please enter a problem or upload an image.", variant: "destructive" });
            return;
        }
        
        setIsLoading(true);
        setResult(null);
        setShowExplanation(false);

        if (!imageDataUri && /^[0-9+\-*/().\s^]+$/.test(trimmedProblem) && !/[a-zA-Z]/.test(trimmedProblem)) {
            try {
                const problemToEval = trimmedProblem.replace(/\^/g, '**');
                const answer = new Function('return ' + problemToEval)();
                if (typeof answer !== 'number' || !isFinite(answer)) {
                    throw new Error("Invalid calculation");
                }
                setResult({
                    answer: String(answer),
                    latexAnswer: String(answer),
                    latexExplanation: "This was calculated using basic arithmetic."
                });
                setIsLoading(false);
            } catch (error) {
                await solveWithAI({ problem: trimmedProblem, imageDataUri: undefined });
            }
        } else {
            await solveWithAI({
                problem: trimmedProblem,
                imageDataUri: imageDataUri || undefined
            });
        }
    };


    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="text-primary" />
                        AI Calculator
                    </CardTitle>
                    <p className="text-muted-foreground pt-2">
                        Use buttons, type a problem, or upload an image of one.
                    </p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="p-2 rounded-lg bg-muted border min-h-28 flex flex-col justify-end">
                            {imageDataUri && (
                                <div className="relative mb-2">
                                    <Image src={imageDataUri} alt="Problem preview" width={400} height={100} className="rounded-md object-contain max-h-24 w-auto mx-auto" data-ai-hint="math equation" />
                                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={clearImage}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <Input
                                type="text"
                                placeholder="sqrt(16) + 4^2"
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                                className="text-2xl h-auto text-right font-mono bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                            />
                             {result && (
                                <div className="text-4xl text-right font-mono text-foreground truncate h-12 flex justify-end items-center">
                                    <BlockMath math={result.latexAnswer} />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                <ImageUp className="mr-2 h-4 w-4" /> Upload Image
                            </Button>
                            <Input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCameraOpen(true)} disabled={isLoading}>
                                <Camera className="mr-2 h-4 w-4" /> Use Camera
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2">
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('d/dx(')}>d/dx</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('∫')}>∫</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('(')}>(</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(')')}>)</Button>
                            <Button type="button" variant="outline" onClick={handleBackspace} aria-label="Backspace"><Backspace /></Button>

                            <Button type="button" variant="outline" onClick={() => handleButtonClick('[')}>[</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(']')}>]</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('i')}>i</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('^')}>xʸ</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('sqrt(')}>√</Button>
                           
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('7')}>7</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('8')}>8</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('9')}>9</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(' / ')} aria-label="Divide"><Divide /></Button>
                            <Button type="button" variant="destructive" onClick={handleClear}>C</Button>

                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('4')}>4</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('5')}>5</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('6')}>6</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(' * ')} aria-label="Multiply"><Times /></Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('/')}>a/b</Button>
                            
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('1')}>1</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('2')}>2</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('3')}>3</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(' - ')} aria-label="Subtract"><Minus /></Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('x')}>x</Button>
                            
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('0')} className="col-span-2">0</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('.')}>.</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(' + ')} aria-label="Add"><Plus/></Button>
                            <Button type="submit" disabled={isLoading || (!problem.trim() && !imageDataUri)}>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Equal />}
                            </Button>
                        </div>
                    </CardContent>
                </form>
                {isLoading && (
                    <div className="p-6 pt-0 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground mt-2">AI is thinking...</p>
                    </div>
                )}
                {result && (
                    <CardFooter className="flex flex-col items-start gap-4">
                        {!showExplanation && (
                            <Button variant="outline" onClick={() => setShowExplanation(true)}>
                                <Lightbulb className="mr-2 h-4 w-4" />
                                Explain Answer
                            </Button>
                        )}

                        {showExplanation && (
                             <Alert variant="default" className="w-full">
                                <AlertTitle className="font-bold text-lg flex items-center gap-2">
                                    <Lightbulb />
                                    Explanation
                                </AlertTitle>
                                <AlertDescription className="pt-2 text-sm leading-relaxed whitespace-pre-wrap">
                                    <BlockMath math={result.latexExplanation} />
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardFooter>
                )}
            </Card>
            <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Use Camera</DialogTitle>
                        <DialogDescription>Position the math problem in the frame and capture.</DialogDescription>
                    </DialogHeader>
                    {hasCameraPermission === false && (
                        <Alert variant="destructive">
                            <AlertTitle>Camera Access Required</AlertTitle>
                            <AlertDescription>
                                Please allow camera access in your browser settings to use this feature.
                            </AlertDescription>
                        </Alert>
                    )}
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted />
                    <canvas ref={canvasRef} className="hidden" />
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>Capture Image</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
