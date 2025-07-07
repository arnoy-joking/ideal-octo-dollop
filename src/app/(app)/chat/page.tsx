'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator, Loader2, Wand2, Lightbulb } from "lucide-react";
import { solveMathProblem, type MathProblemOutput } from "@/ai/flows/calculator-flow";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AiCalculatorPage() {
    const [problem, setProblem] = useState('');
    const [result, setResult] = useState<MathProblemOutput | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

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
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="text-primary" />
                        AI Calculator
                    </CardTitle>
                    <p className="text-muted-foreground pt-2">
                        Solve higher mathematics problems like integration, differentiation, complex numbers, and trigonometry.
                    </p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                        <div className="flex w-full items-center space-x-2">
                            <Input
                                type="text"
                                placeholder="e.g., derivative of sin(x^2)"
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                            />
                            <Button type="submit" disabled={isLoading || !problem.trim()}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                Calculate
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
