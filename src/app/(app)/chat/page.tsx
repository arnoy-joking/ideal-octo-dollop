
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
import { Calculator, Loader2, Lightbulb, Camera, ImageUp, Trash2 } from "lucide-react";
import { solveMathProblem, type MathProblemInput, type MathProblemOutput } from "@/ai/flows/calculator-flow";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

export default function AiCalculatorPage() {
    const [problem, setProblem] = useState('');
    const [lastProblem, setLastProblem] = useState('');
    const [result, setResult] = useState<MathProblemOutput | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [imageDataUri, setImageDataUri] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [resultScale, setResultScale] = useState(1);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const resultTextRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const calculateScale = () => {
            if (result && resultTextRef.current) {
                const contentNode = resultTextRef.current;
                const containerNode = contentNode.parentElement;

                if (containerNode) {
                    const containerWidth = containerNode.clientWidth;
                    const contentWidth = contentNode.scrollWidth;
                    
                    if (contentWidth > containerWidth) {
                        setResultScale(containerWidth / contentWidth);
                    } else {
                        setResultScale(1);
                    }
                }
            } else {
                setResultScale(1);
            }
        };

        // KaTeX rendering can be asynchronous. A timeout helps get the final rendered size.
        const timer = setTimeout(calculateScale, 50);

        // Also add a resize listener to adapt to screen changes
        window.addEventListener('resize', calculateScale);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateScale);
        };

    }, [result]);


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
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
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

        if (value === 'Ans') {
            if (result?.answer) {
                setProblem(prev => prev + result.answer);
            }
            return;
        }
        
        const isOperator = ['+', '-', '*', '/'].includes(value);

        // If there's a result and the user types something that isn't an operator, start a new calculation
        if (result && !showExplanation) {
            if (isOperator) {
                // Continue the calculation
                setProblem(result.answer + value);
            } else {
                // Start a new calculation
                setProblem(value);
            }
            setResult(null);
            setLastProblem('');
            setImageDataUri(null);
        } else {
            // Otherwise, just append to the current problem
            setProblem(prev => prev + value);
        }
    };

    const handleClear = () => {
        if (isLoading) return;
        setProblem('');
        setResult(null);
        setLastProblem('');
        setShowExplanation(false);
        setImageDataUri(null);
    };

    const handleBackspace = () => {
        if (isLoading) return;
        if (result && !showExplanation) {
            setProblem('');
            setResult(null);
            setLastProblem('');
        } else {
            setProblem(prev => prev.slice(0, -1));
        }
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageDataUri(event.target?.result as string);
                setProblem('');
                setResult(null);
                setLastProblem('');
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
            setProblem('');
            setResult(null);
            setLastProblem('');
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
            setLastProblem(problem || 'Image problem');
            setProblem(response.answer);
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
        setLastProblem(trimmedProblem);

        // Simple check to see if we should use local eval or send to AI
        if (!imageDataUri && /^[0-9+\-*/().\s^]+$/.test(trimmedProblem) && !/[a-zA-Z]/.test(trimmedProblem)) {
            try {
                // Sanitize for eval
                const problemToEval = trimmedProblem.replace(/\^/g, '**');
                // Use Function constructor for safer eval
                const answer = new Function('return ' + problemToEval)();
                if (typeof answer !== 'number' || !isFinite(answer)) {
                    throw new Error("Invalid calculation");
                }
                const finalAnswer = String(answer);
                setResult({
                    answer: finalAnswer,
                    latexAnswer: finalAnswer,
                    latexExplanation: "This was calculated using basic arithmetic."
                });
                setProblem(finalAnswer);
                setIsLoading(false);
            } catch (error) {
                // If local eval fails, fall back to AI
                await solveWithAI({ problem: trimmedProblem, imageDataUri: undefined });
            }
        } else {
            // Use AI for complex problems or problems with images
            await solveWithAI({
                problem: trimmedProblem,
                imageDataUri: imageDataUri || undefined
            });
        }
    };


    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="text-primary" />
                        AI Scientific Calculator
                    </CardTitle>
                    <p className="text-muted-foreground pt-2">
                        Use buttons, type a problem, or upload an image of one.
                    </p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                       <div className="p-4 rounded-lg bg-muted border min-h-40 flex flex-col justify-between">
                            <div className="flex justify-between items-start min-h-8">
                                {imageDataUri ? (
                                    <div className="relative">
                                        <Image src={imageDataUri} alt="Problem preview" width={80} height={80} className="rounded-md object-contain max-h-16 w-auto" data-ai-hint="math equation" />
                                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={clearImage}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : <div />}
                                <div className="text-muted-foreground text-lg text-right truncate pl-4">
                                    {lastProblem}
                                </div>
                            </div>
                            
                            <div className="text-right text-5xl font-mono text-foreground font-semibold min-h-[56px] flex items-center justify-end overflow-hidden py-1">
                                {result ? (
                                    <div
                                        ref={resultTextRef}
                                        style={{ 
                                            transform: `scale(${resultScale})`, 
                                            transformOrigin: 'right center',
                                            whiteSpace: 'nowrap',
                                            transition: 'transform 0.2s ease-out'
                                        }}
                                    >
                                        <BlockMath math={result.latexAnswer} />
                                    </div>
                                ) : (
                                    <Input
                                        type="text"
                                        placeholder="0"
                                        value={problem}
                                        onChange={(e) => setProblem(e.target.value)}
                                        disabled={isLoading}
                                        autoFocus
                                        className="text-5xl h-auto font-mono bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-right break-all w-full"
                                    />
                                )}
                            </div>
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
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('sin(')}>sin</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('cos(')}>cos</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('tan(')}>tan</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('log(')}>log</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('ln(')}>ln</Button>

                            <Button type="button" variant="outline" onClick={() => handleButtonClick('(')}>(</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(')')}>)</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('sqrt(')}>√</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('^2')}>x²</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('^')}>xʸ</Button>
                            
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('^-1')}>x⁻¹</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('nCr(')}>nCr</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('nPr(')}>nPr</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('!')}>x!</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('d/dx(')}>d/dx</Button>

                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('7')}>7</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('8')}>8</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('9')}>9</Button>
                            <Button type="button" variant="destructive" onClick={handleBackspace}>DEL</Button>
                            <Button type="button" variant="destructive" onClick={handleClear}>AC</Button>

                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('4')}>4</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('5')}>5</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('6')}>6</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('*')}>×</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('/')}>÷</Button>
                            
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('1')}>1</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('2')}>2</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('3')}>3</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('+')}>+</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('-')}>−</Button>

                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('0')}>0</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('.')}>.</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('π')}>π</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('Ans')}>Ans</Button>
                            <Button type="submit" variant="primary" disabled={isLoading || (!problem.trim() && !imageDataUri)}>=</Button>
                        </div>
                    </CardContent>
                </form>
                {isLoading && !result && (
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
                                Show Explanation
                            </Button>
                        )}

                        {showExplanation && (
                             <div className="w-full">
                                <div className="flex items-center gap-2 font-bold text-lg mb-2">
                                    <Lightbulb />
                                    Explanation
                                </div>
                                <div className="max-h-96 w-full overflow-auto rounded-md border bg-muted/50 p-4 text-base">
                                    <BlockMath math={result.latexExplanation} renderError={(error) => {
                                        console.error("KaTeX Error:", error);
                                        toast({ title: "Rendering Error", description: "Could not display the explanation correctly.", variant: "destructive" });
                                        return <pre className="text-destructive whitespace-pre-wrap">{result.latexExplanation}</pre>;
                                    }} />
                                </div>
                            </div>
                        )}
                    </CardFooter>
                )}
            </Card>
            <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                <DialogContent className="sm:max-w-3xl">
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
