'use server';
/**
 * @fileOverview An AI flow for refining user learning goals.
 *
 * - suggestGoalEdits - A function that suggests improvements to a user's learning goals.
 * - SuggestGoalsInput - The input type for the suggestGoalEdits function.
 * - SuggestGoalsOutput - The return type for the suggestGoalEdits function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit/zod';

export const SuggestGoalsInputSchema = z.string().describe("The user's current list of learning goals, separated by newlines.");
export type SuggestGoalsInput = z.infer<typeof SuggestGoalsInputSchema>;

export const SuggestGoalsOutputSchema = z.string().describe('A revised list of learning goals, improved to be more specific, measurable, achievable, relevant, and time-bound (SMART). The output should be a list separated by newlines.');
export type SuggestGoalsOutput = z.infer<typeof SuggestGoalsOutputSchema>;


const goalsPrompt = ai.definePrompt({
    name: 'goalsPrompt',
    input: { schema: SuggestGoalsInputSchema },
    output: { schema: SuggestGoalsOutputSchema },
    prompt: `You are a helpful productivity coach. The user will provide their learning goals. Rewrite them to be more specific, measurable, achievable, relevant, and time-bound (SMART).
    
    Keep the same number of goals if possible and preserve the original intent. Present the result as a list separated by newlines. Do not add any extra text or commentary.
    
    User Goals:
    {{{input}}}`,
});

const suggestGoalEditsFlow = ai.defineFlow(
    {
        name: 'suggestGoalEditsFlow',
        inputSchema: SuggestGoalsInputSchema,
        outputSchema: SuggestGoalsOutputSchema,
    },
    async (input) => {
        const { output } = await goalsPrompt(input);
        return output || '';
    }
);

export async function suggestGoalEdits(goals: SuggestGoalsInput): Promise<SuggestGoalsOutput> {
  return await suggestGoalEditsFlow(goals);
}
