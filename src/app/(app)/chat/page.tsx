'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator, Loader2, Lightbulb, Backspace, Divide, Minus, Plus, X as Times, Equal } from "lucide-react";
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
        setProblem(prev => prev + value);
    };

    const handleClear = () => {
        if (isLoading) return;
        setProblem('');
    };

    const handleBackspace = () => {
        if (isLoading) return;
        setProblem(prev => prev.slice(0, -1));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!problem.trim()) {
            toast({ title: "Error", description: "Please enter a problem.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setResult(null);
        setShowExplanation(false);

        try {
            const response = await solveMathProblem(problem);
            setResult(response);
        } catch (error) {
            console.error("Calculation error:", error);
            toast({ title: "Error", description: "Could not solve the problem. Please try again.", variant: "destructive" });
        } finally {
            setIsLoading(false);
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
                        Use the buttons to build your equation or type directly into the display.
                    </p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <Input
                            type="text"
                            placeholder="e.g., derivative of x^2"
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                            className="text-2xl h-16 text-right font-mono"
                        />
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
                            
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('0')}>0</Button>
                            <Button type="button" variant="secondary" onClick={() => handleButtonClick('.')}>.</Button>
                            <Button type="button" variant="outline" onClick={() => handleButtonClick(' + ')} aria-label="Add"><Plus/></Button>
                            <Button type="submit" className="col-span-2" disabled={isLoading || !problem.trim()}>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Equal />}
                            </Button>
                        </div>
                    </CardContent>
                </form>
                {isLoading && (
                    <div className="p-6 pt-0 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground mt-2">Calculating...</p>
                    </div>
                )}
                {result && (
                    <CardFooter className="flex flex-col items-start gap-4">
                        <Alert className="w-full">
                            <AlertTitle className="font-bold text-lg">Answer</AlertTitle>
                            <AlertDescription className="text-base font-mono py-2">
                                {result.answer}
                            </AlertDescription>
                        </Alert>

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
