'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator, Loader2, Lightbulb, Delete as Backspace, Divide, Minus, Plus, X as Times, Equal } from "lucide-react";
import { solveMathProblem, type MathProblemOutput } from "@/ai/flows/calculator-flow";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AiCalculatorPage() {
    const [problem, setProblem] = useState('');
    const [result, setResult] = useState<MathProblemOutput | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleButtonClick = (value: string) => {
        if (isLoading) return;
        
        const isNumeric = /[0-9.]/.test(value);
        const isOperator = [' + ', ' - ', ' * ', ' / '].includes(value);

        if (result && !showExplanation) {
            if (isNumeric && !isOperator) {
                setProblem(value);
                setResult(null);
                return;
            } else if (isOperator) {
                setProblem(result.answer + value);
                setResult(null);
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
    };

    const handleBackspace = () => {
        if (isLoading) return;
        setProblem(prev => prev.slice(0, -1));
    };
    
    const solveWithAI = async (problemToSolve: string) => {
         try {
            const response = await solveMathProblem(problemToSolve);
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
        if (!trimmedProblem) {
            toast({ title: "Error", description: "Please enter a problem.", variant: "destructive" });
            return;
        }
        
        setIsLoading(true);
        setResult(null);
        setShowExplanation(false);

        // Check for simple arithmetic (only numbers, operators, parens, and dots)
        const isSimpleMath = /^[0-9+\-*/().\s]+$/.test(trimmedProblem) && !/[a-zA-Z]/.test(trimmedProblem);

        if (isSimpleMath) {
            try {
                // Safe evaluation for simple math
                const answer = new Function('return ' + trimmedProblem)();
                if (typeof answer !== 'number' || !isFinite(answer)) {
                    throw new Error("Invalid calculation");
                }
                setResult({
                    answer: String(answer),
                    explanation: "This was calculated using basic arithmetic."
                });
                setIsLoading(false);
            } catch (error) {
                // If safe eval fails (e.g. syntax error), fallback to AI
                await solveWithAI(trimmedProblem);
            }
        } else {
            // For complex math, use the AI flow
            await solveWithAI(trimmedProblem);
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
                        Use buttons for quick entry or type complex problems like "derivative of x^2".
                    </p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="p-2 rounded-lg bg-muted border h-24 flex flex-col justify-end">
                            <Input
                                type="text"
                                placeholder="0"
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                                className="text-2xl h-auto text-right font-mono bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                            />
                             {result && (
                                <div className="text-4xl text-right font-mono text-foreground truncate">
                                    {result.answer}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('derivative of ')}>d/dx</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('integrate ')}>∫</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('(')}>(</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(')')}>)</Button>
                            <Button type="button" variant="outline" onClick={handleBackspace} aria-label="Backspace"><Backspace /></Button>

                            <Button type="button" variant="outline" onClick={() => handleButtonClick('sin(')}>sin</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('cos(')}>cos</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('tan(')}>tan</Button>
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
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('x')}>x</Button>
                            
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('1')}>1</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('2')}>2</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('3')}>3</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(' - ')} aria-label="Subtract"><Minus /></Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick('y')}>y</Button>
                            
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('0')} className="col-span-2">0</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('.')}>.</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(' + ')} aria-label="Add"><Plus/></Button>
                            <Button type="submit" disabled={isLoading || !problem.trim()}>
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
                                <AlertDescription className="pt-2 whitespace-pre-wrap text-sm leading-relaxed">
                                    {result.explanation}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardFooter>
                )}
            </Card>
        </main>
    );
}
