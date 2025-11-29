import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: '.env.GOOGLE_API_KEY',
    }),
  ],
  model: 'googleai/gemini-2.5-flash-lite',
});
