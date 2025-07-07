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

const MathProblemInputSchema = z.object({
  problem: z.string().describe('A mathematical problem to solve, or context for the problem in the image.'),
  imageDataUri: z.string().optional().describe("An image of a math problem, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type MathProblemInput = z.infer<typeof MathProblemInputSchema>;

const MathProblemOutputSchema = z.object({
  answer: z.string().describe('The final, plain-text answer to the mathematical problem. For example: "2*x" or "12.5". This is used for chaining calculations.'),
  latexAnswer: z.string().describe('The final answer formatted as a display-style LaTeX string. Do not wrap it in $$ or \\[ \\]. For example: "2x" or "12.5".'),
  latexExplanation: z.string().describe("A step-by-step explanation of how the answer was derived, formatted as a single LaTeX string. Use standard LaTeX for text. Use 'align*' environment for multi-step equations. Use '\\\\' for newlines. For example: 'First, we simplify the expression. \\\\ \\begin{align*} x^2 + 2x + 1 &= (x+1)^2 \\\\ &= ... \\end{align*} Therefore, the answer is...'"),
});
export type MathProblemOutput = z.infer<typeof MathProblemOutputSchema>;

const calculatorPrompt = ai.definePrompt({
    name: 'calculatorPrompt',
    input: { schema: MathProblemInputSchema },
    output: { schema: MathProblemOutputSchema },
    prompt: `You are an expert mathematician and a helpful calculator for higher mathematics, including calculus (integration, differentiation), trigonometry, complex numbers, matrices, vectors, and statistics.
    
    The user will provide a mathematical problem, potentially including an image.

    If an image is provided, it contains the primary problem to solve. The text input can provide additional context or clarification.

    Examples of notation to support:
    - Differentiation: d/dx(x^2)
    - Indefinite Integral: ∫ x^2 dx
    - Definite Integral: integrate x^2 from 0 to 5
    - Matrices: [[1, 2], [3, 4]]
    - Complex numbers: (3 + 4i) * (2 - i)
    
    Your task is to:
    1.  Solve the problem accurately.
    2.  Provide the final answer as a plain text string in the 'answer' field. This is for display and chaining calculations.
    3.  Provide the final answer formatted as a display-style LaTeX string in the 'latexAnswer' field. Do not wrap it in $$ or \\[ \\].
    4.  Provide a detailed, step-by-step explanation of the solution process formatted as a single LaTeX string in the 'latexExplanation' field. Use standard LaTeX for text. Use 'align*' environment for multi-step equations. Use '\\\\' for newlines between steps or paragraphs.

    Problem Description:
    {{{problem}}}

    {{#if imageDataUri}}
    Problem Image:
    {{media url=imageDataUri}}
    {{/if}}`,
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

export async function solveMathProblem(input: MathProblemInput): Promise<MathProblemOutput> {
  return await solveMathProblemFlow(input);
}
