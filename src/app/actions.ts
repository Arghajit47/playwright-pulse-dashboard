'use server';

import { analyzeFailurePatterns, type AnalyzeFailurePatternsInput } from '@/ai/flows/analyze-failure-patterns';
import fs from 'fs/promises';
import path from 'path';
import type { HistoricalTrend } from '@/types/playwright';

export async function getFailurePatternAnalysis(): Promise<{ success: boolean; analysis?: string; error?: string }> {
  try {
    const historyDir = path.join(process.cwd(), 'public', 'pulse-report', 'history');
    const trendFileNames = (await fs.readdir(historyDir)).filter(file => file.startsWith('trend-') && file.endsWith('.json'));

    const historicalDataArray: HistoricalTrend[] = [];
    for (const fileName of trendFileNames) {
      const filePath = path.join(historyDir, fileName);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      historicalDataArray.push(JSON.parse(fileContent));
    }
    
    // Sort by date to ensure chronological order for analysis if necessary
    historicalDataArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const input: AnalyzeFailurePatternsInput = {
      historicalData: JSON.stringify(historicalDataArray),
    };

    const result = await analyzeFailurePatterns(input);
    return { success: true, analysis: result.analysis };
  } catch (error) {
    console.error('Error analyzing failure patterns:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during AI analysis.';
    return { success: false, error: errorMessage };
  }
}
