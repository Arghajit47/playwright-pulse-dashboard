'use server';

/**
 * @fileOverview A flow to analyze failure patterns across historical test runs and suggest potential root causes and fixes.
 *
 * - analyzeFailurePatterns - A function that handles the failure pattern analysis process.
 * - AnalyzeFailurePatternsInput - The input type for the analyzeFailurePatterns function.
 * - AnalyzeFailurePatternsOutput - The return type for the analyzeFailurePatterns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeFailurePatternsInputSchema = z.object({
  historicalData: z
    .string()
    .describe('Historical test run data in JSON format, including failure information, error messages, and associated code changes.'),
});
export type AnalyzeFailurePatternsInput = z.infer<typeof AnalyzeFailurePatternsInputSchema>;

const AnalyzeFailurePatternsOutputSchema = z.object({
  analysis: z
    .string()
    .describe('An analysis of failure patterns, potential root causes, and suggested fixes.'),
});
export type AnalyzeFailurePatternsOutput = z.infer<typeof AnalyzeFailurePatternsOutputSchema>;

export async function analyzeFailurePatterns(input: AnalyzeFailurePatternsInput): Promise<AnalyzeFailurePatternsOutput> {
  return analyzeFailurePatternsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeFailurePatternsPrompt',
  input: {schema: AnalyzeFailurePatternsInputSchema},
  output: {schema: AnalyzeFailurePatternsOutputSchema},
  prompt: `You are an AI assistant that analyzes test failure patterns in historical test run data to identify potential root causes and suggest fixes.

  Analyze the following historical test data:
  {{{historicalData}}}

  Provide a concise analysis of failure patterns, potential root causes, and suggested fixes.
  Focus on trending failures, common error messages, and code changes associated with failures to form hypotheses.
  Return the analysis.`,
});

const analyzeFailurePatternsFlow = ai.defineFlow(
  {
    name: 'analyzeFailurePatternsFlow',
    inputSchema: AnalyzeFailurePatternsInputSchema,
    outputSchema: AnalyzeFailurePatternsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
