'use server';
/**
 * @fileOverview An AI flow for solving mathematical problems.
 *
 * - solveMathProblem - A function that solves a math problem and provides an explanation.
 * - MathProblemInput - The input type for the solveMathProblem function.
 * - MathProblemOutput - The return type for the solveMathProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const MathProblemInputSchema = z.string().describe('A mathematical problem to solve, e.g., "derivative of x^2" or "integrate 2x from 0 to 5".');
export type MathProblemInput = z.infer<typeof MathProblemInputSchema>;

const MathProblemOutputSchema = z.object({
  answer: z.string().describe('The final, concise answer to the mathematical problem.'),
  explanation: z.string().describe('A step-by-step explanation of how the answer was derived.'),
});
export type MathProblemOutput = z.infer<typeof MathProblemOutputSchema>;

const calculatorPrompt = ai.definePrompt({
    name: 'calculatorPrompt',
    input: { schema: MathProblemInputSchema },
    output: { schema: MathProblemOutputSchema },
    prompt: `You are an expert mathematician and a helpful calculator for higher mathematics, including calculus (integration, differentiation), trigonometry, and complex numbers.
    
    The user will provide a mathematical problem.
    
    Your task is to:
    1.  Solve the problem accurately.
    2.  Provide the final, concise answer in the 'answer' field.
    3.  Provide a detailed, step-by-step explanation of the solution process in the 'explanation' field. The explanation should be clear and easy for a student to understand.

    Problem:
    {{{input}}}`,
});

const solveMathProblemFlow = ai.defineFlow(
    {
        name: 'solveMathProblemFlow',
        inputSchema: MathProblemInputSchema,
        outputSchema: MathProblemOutputSchema,
    },
    async (input) => {
        const { output } = await calculatorPrompt(input);
        return output!;
    }
);

export async function solveMathProblem(problem: MathProblemInput): Promise<MathProblemOutput> {
  return await solveMathProblemFlow(problem);
}
