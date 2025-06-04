
'use server';

import { analyzeFailurePatterns, type AnalyzeFailurePatternsInput } from '@/ai/flows/analyze-failure-patterns';
import fs from 'fs/promises';
import path from 'path';
import type { PlaywrightPulseReport } from '@/types/playwright'; 

export async function getFailurePatternAnalysis(): Promise<{ success: boolean; analysis?: string; error?: string }> {
  try {
    const historicalReports = await getRawHistoricalReports(); // Use the new action
    
    if (historicalReports.length === 0) {
      return { success: true, analysis: "No historical data found to analyze." };
    }

    const input: AnalyzeFailurePatternsInput = {
      historicalData: JSON.stringify(historicalReports),
    };

    const result = await analyzeFailurePatterns(input);
    return { success: true, analysis: result.analysis };
  } catch (error) {
    console.error('Error analyzing failure patterns:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during AI analysis.';
    return { success: false, error: errorMessage };
  }
}

export async function getRawHistoricalReports(): Promise<PlaywrightPulseReport[]> {
  const historyDir = path.join(process.cwd(), 'public', 'pulse-report', 'history');
  try {
    const trendFileNames = (await fs.readdir(historyDir)).filter(file => file.startsWith('trend-') && file.endsWith('.json'));
    
    const historicalDataArray: PlaywrightPulseReport[] = [];
    for (const fileName of trendFileNames) {
      const filePath = path.join(historyDir, fileName);
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const reportData = JSON.parse(fileContent) as PlaywrightPulseReport;
        if (reportData.run && reportData.results) { // Basic validation
            historicalDataArray.push(reportData);
        } else {
            console.warn(`Skipping invalid historical report file: ${fileName}`);
        }
      } catch (fileReadError) {
        console.error(`Error reading or parsing historical file ${fileName}:`, fileReadError);
        // Optionally skip this file and continue
      }
    }
    
    // Sort by date to ensure chronological order
    historicalDataArray.sort((a, b) => new Date(a.run.timestamp).getTime() - new Date(b.run.timestamp).getTime());
    
    return historicalDataArray;
  } catch (error) {
    console.error('Error fetching raw historical reports:', error);
    // Depending on policy, could return empty array or throw
    return []; 
  }
}
