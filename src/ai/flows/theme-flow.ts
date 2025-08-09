'use server';
/**
 * @fileOverview An AI flow for generating custom UI themes.
 *
 * - generateTheme - A function that creates a new theme palette based on a user prompt.
 * - GenerateThemeInput - The input type for the generateTheme function.
 * - GenerateThemeOutput - The return type for the generateTheme function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Zod schemas for structured input and output
const GenerateThemeInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired theme, e.g., "a calming ocean vibe" or "a futuristic neon city".'),
});

const ColorSchema = z.object({
  h: z.number().describe('The hue value (0-360).'),
  s: z.number().describe('The saturation value (0-100).'),
  l: z.number().describe('The lightness value (0-100).'),
});

const GenerateThemeOutputSchema = z.object({
  name: z.string().describe('A short, catchy name for the theme, e.g., "Oceanic Serenity" or "Neon Grid".'),
  imageSearchQuery: z.string().describe('A one or two-word search query for Pexels to find a suitable background image for the theme, based on the prompt.'),
  background: ColorSchema.describe('The main background color.'),
  foreground: ColorSchema.describe('The main text color.'),
  primary: ColorSchema.describe('The primary color for buttons and highlights.'),
  primaryForeground: ColorSchema.describe('The text color for on top of primary elements.'),
  secondary: ColorSchema.describe('The secondary color for less prominent elements.'),
  accent: ColorSchema.describe('An accent color for special highlights.'),
  muted: ColorSchema.describe('A muted color for subtle backgrounds and borders.'),
  card: ColorSchema.describe('The background color for card components.'),
  sidebar: ColorSchema.describe('The background color for the sidebar.'),
  sidebarForeground: ColorSchema.describe('The text color for the sidebar.'),
});

export type GenerateThemeInput = z.infer<typeof GenerateThemeInputSchema>;
export type GenerateThemeOutput = z.infer<typeof GenerateThemeOutputSchema>;

// The Genkit prompt definition
const themePrompt = ai.definePrompt({
  name: 'themeGeneratorPrompt',
  input: { schema: GenerateThemeInputSchema },
  output: { schema: GenerateThemeOutputSchema },
  prompt: `You are a professional UI/UX designer specializing in creating beautiful and accessible color palettes. Based on the user's prompt, generate a complete theme.

User Prompt:
{{{prompt}}}

Instructions:
1.  **Analyze the Prompt:** Understand the mood, objects, and colors mentioned in the prompt.
2.  **Create a Name:** Devise a short, creative name for the theme.
3.  **Generate Image Search Query:** Provide a one or two-word search query to find a relevant background image on Pexels.
4.  **Generate HSL Colors:** Create a harmonious and accessible color palette. Provide HSL values for each required color.
    -   Ensure sufficient contrast between background and foreground colors.
    -   The primary and accent colors should be distinct and vibrant but fit the theme.
    -   Muted and secondary colors should be subtle and complementary.
    -   Sidebar colors should complement the main theme.
    -   **Important:** Provide only the HSL values (hue, saturation, lightness) as numbers for each color property. Do not use the 'hsl()' CSS function syntax.
5.  **Output Format:** Your response MUST be a valid JSON object matching the defined output schema.
`,
});

// The Genkit flow definition
const generateThemeFlow = ai.defineFlow(
  {
    name: 'generateThemeFlow',
    inputSchema: GenerateThemeInputSchema,
    outputSchema: GenerateThemeOutputSchema,
  },
  async (input) => {
    const { output } = await themePrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a theme.');
    }
    return output;
  }
);

// The exported server action that the frontend will call
export async function generateTheme(input: GenerateThemeInput): Promise<GenerateThemeOutput> {
  return await generateThemeFlow(input);
}
