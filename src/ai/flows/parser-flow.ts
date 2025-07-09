'use server';
/**
 * @fileOverview An AI flow for parsing lesson data from an HTML snippet.
 *
 * - parseLessonsFromHtml - A function that parses HTML to extract lesson details.
 * - ParseLessonsInput - The input type for the parseLessonsFromHtml function.
 * - ParseLessonsOutput - The return type for the parseLessonsFromHtml function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const LessonSchema = z.object({
    title: z.string().describe('The title of the lesson.'),
    duration: z.string().describe("The duration of the video in HH:MM:SS format. Set to '00:00:00' as a placeholder."),
    videoId: z.string().describe('The YouTube video ID.'),
    pdfUrl: z.string().describe('The full URL to the lesson PDF. This should be an empty string if no PDF is available.'),
});

const ParseLessonsInputSchema = z.object({
  html: z.string().describe('An HTML snippet containing a list of lessons.'),
  pdfBaseUrl: z.string().optional().describe('An optional base URL to prepend to the PDF filenames found in the HTML.'),
});
export type ParseLessonsInput = z.infer<typeof ParseLessonsInputSchema>;

const ParseLessonsOutputSchema = z.object({
  lessons: z.array(LessonSchema),
});
export type ParseLessonsOutput = z.infer<typeof ParseLessonsOutputSchema>;

const parserPrompt = ai.definePrompt({
    name: 'parserPrompt',
    input: { schema: ParseLessonsInputSchema },
    output: { schema: ParseLessonsOutputSchema },
    prompt: `You are an expert HTML parser. Your task is to extract lesson information from a given HTML snippet. The snippet contains a series of '<li>' elements.

For each '<li class="watchli">':
1.  Find the 'data-vid' attribute. This is the 'videoId'.
2.  Find the 'data-nname' attribute. This is the 'title'. If 'data-nname' is not present, use the text content of the '<li>' tag.
3.  Find the 'data-npdf' attribute. This contains a filename for a PDF.
    -   If the 'data-npdf' attribute exists AND a 'pdfBaseUrl' is provided, construct the full 'pdfUrl' by combining them. For example, if 'pdfBaseUrl' is 'https://example.com/pdfs/' and 'data-npdf' is 'file.pdf', the 'pdfUrl' should be 'https://example.com/pdfs/file.pdf'. Make sure there is only one slash between the base URL and the filename.
    -   If 'data-npdf' does not exist or 'pdfBaseUrl' is not provided, the 'pdfUrl' should be an empty string.
4.  The video duration is not available in the HTML. For the 'duration' field, you MUST use the placeholder value '00:00:00'.

Return the extracted information as a JSON object containing a list of lessons.

HTML Snippet:
{{{html}}}

{{#if pdfBaseUrl}}
PDF Base URL:
{{{pdfBaseUrl}}}
{{/if}}
`,
});

const parseLessonsFlow = ai.defineFlow(
    {
        name: 'parseLessonsFlow',
        inputSchema: ParseLessonsInputSchema,
        outputSchema: ParseLessonsOutputSchema,
    },
    async (input) => {
        const { output } = await parserPrompt(input);
        return output!;
    }
);

export async function parseLessonsFromHtml(input: ParseLessonsInput): Promise<ParseLessonsOutput> {
  return await parseLessonsFlow(input);
}
