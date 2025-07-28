import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyApUm-BZdLiYhNoy1lfqZ0xwCB2Vw-kbts',
    }),
  ],
  model: 'googleai/gemini-2.0-flash-lite',
});
