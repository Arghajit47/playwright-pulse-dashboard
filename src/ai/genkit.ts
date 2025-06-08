
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is the global Genkit AI instance.
// It's initialized here and imported by other AI-related modules.
export const ai = genkit({
  plugins: [
    googleAI({
      // API key should be set via GOOGLE_API_KEY environment variable.
      // Example: GOOGLE_API_KEY=your_google_ai_api_key in a .env file
    }),
  ],
});
