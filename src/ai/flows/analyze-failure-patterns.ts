
'use server';
/**
 * @fileOverview An AI flow to analyze historical Playwright test failure patterns.
 *
 * - analyzeFailurePatterns - A function that takes historical test data and returns an analysis of failure patterns.
 * - AnalyzeFailurePatternsInput - The input type for the analyzeFailurePatterns function.
 * - AnalyzeFailurePatternsOutput - The return type for the analyzeFailurePatterns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AnalyzeFailurePatternsInputSchema = z.object({
  historicalData: z.string().describe(
    'A JSON string representing an array of historical PlaywrightPulseReport objects. Each report contains run metadata and an array of detailed test results. Key fields for analysis include test statuses, error messages, test names, and suite names.'
  ),
});
export type AnalyzeFailurePatternsInput = z.infer<typeof AnalyzeFailurePatternsInputSchema>;

const AnalyzeFailurePatternsOutputSchema = z.object({
  analysis: z.string().describe(
    'A textual analysis of failure patterns found in the historical data. This should include identified trending failures, common error messages, and potential hypotheses for root causes. The analysis should be concise and actionable.'
  ),
});
export type AnalyzeFailurePatternsOutput = z.infer<typeof AnalyzeFailurePatternsOutputSchema>;

export async function analyzeFailurePatterns(input: AnalyzeFailurePatternsInput): Promise<AnalyzeFailurePatternsOutput> {
  return analyzeFailurePatternsFlow(input);
}

const failureAnalysisPrompt = ai.definePrompt({
  name: 'failureAnalysisPrompt',
  input: {schema: AnalyzeFailurePatternsInputSchema},
  output: {schema: AnalyzeFailurePatternsOutputSchema},
  model: 'googleai/gemini-pro', // Specify the model to use
  prompt: `You are an expert Playwright test analyst. Analyze the provided historical test data to identify failure patterns.
The historical data is a JSON string containing an array of PlaywrightPulseReport objects. Each report has 'run' metadata and 'results' which is an array of test outcomes.
Focus on tests with 'failed' or 'timedOut' statuses.

Your analysis should include:
1.  **Trending Failures**: Identify specific tests (by name and suite) that are failing frequently or have started failing recently.
2.  **Common Error Messages**: Group failures by common error messages or types (e.g., assertion errors, locator issues, timeouts).
3.  **Potential Hypotheses**: Based on the patterns, suggest 1-2 potential root causes or areas to investigate. For example, if many tests fail with "element not found" in a specific suite, it might indicate a UI change in that part of the app.

Provide a concise, actionable summary of your findings in the 'analysis' field.

Historical Data:
\`\`\`json
{{{historicalData}}}
\`\`\`
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const analyzeFailurePatternsFlow = ai.defineFlow(
  {
    name: 'analyzeFailurePatternsFlow',
    inputSchema: AnalyzeFailurePatternsInputSchema,
    outputSchema: AnalyzeFailurePatternsOutputSchema,
  },
  async (input: AnalyzeFailurePatternsInput) => {
    const {output} = await failureAnalysisPrompt(input);

    if (!output) {
      console.error('AI analysis (analyzeFailurePatternsFlow) did not produce an output. This might be due to content filtering or an internal error.');
      throw new Error('AI analysis failed to produce a result. The content might have been filtered or an unexpected error occurred.');
    }
    return output;
  }
);
