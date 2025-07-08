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
  latexExplanation: z.string().describe("A step-by-step mathematical derivation of the solution, formatted as a single LaTeX string. It should only contain the mathematical steps, primarily using an 'align*' environment for multi-step equations. Do not include any descriptive English text. Each step should be on a new line, separated by '\\\\'. For example: '\\begin{align*} 2x + 5 &= 15 \\\\ 2x &= 10 \\\\ x &= 5 \\end{align*}'"),
});
export type MathProblemOutput = z.infer<typeof MathProblemOutputSchema>;

const calculatorPrompt = ai.definePrompt({
    name: 'calculatorPrompt',
    input: { schema: MathProblemInputSchema },
    output: { schema: MathProblemOutputSchema },
    prompt: `You are an expert mathematician and a helpful calculator for higher mathematics, including calculus (integration, differentiation), trigonometry, logarithms, complex numbers, matrices, vectors, and statistics.
    
    The user will provide a mathematical problem, potentially including an image.

    If an image is provided, it contains the primary problem to solve. The text input can provide additional context or clarification.

    Examples of notation to support:
    - Differentiation: d/dx(x^2)
    - Indefinite Integral: ∫ x^2 dx or integrate x^2 dx
    - Definite Integral: integrate x^2 from 0 to 5
    - Factorial: 5!
    - Permutations: nPr(10, 3) or 10P3
    - Combinations: nCr(10, 3) or 10C3
    - Matrices: [[1, 2], [3, 4]]
    - Complex numbers: (3 + 4i) * (2 - i)
    - Trigonometry: sin(pi/2), cos(0), tan(45deg), asin(1), acos(1), atan(1)
    - Hyperbolic functions: sinh(0), cosh(0), tanh(0)
    - Logarithms: log(100), ln(e^2)
    - Powers and Roots: 2^10, sqrt(16), cbrt(8)
    
    Your task is to:
    1.  Solve the problem accurately.
    2.  Provide the final answer as a plain text string in the 'answer' field. This is for display and chaining calculations.
    3.  Provide the final answer formatted as a display-style LaTeX string in the 'latexAnswer' field. Do not wrap it in $$ or \\[ \\].
    4.  Provide a step-by-step mathematical derivation of the solution in the 'latexExplanation' field. This should ONLY contain the mathematical steps, like a textbook example. Use the 'align*' environment for multi-step equations. Do NOT include any descriptive text, commentary, or prose. Show the work using equals signs.

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
