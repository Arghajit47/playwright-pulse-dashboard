
'use server';

import { analyzeFailurePatterns, type AnalyzeFailurePatternsInput } from '@/ai/flows/analyze-failure-patterns';
import fs from 'fs/promises';
import path from 'path';
import type { PlaywrightPulseReport, DetailedTestResult, FlakyTestDetail, FlakyTestOccurrence } from '@/types/playwright'; 

export async function getFailurePatternAnalysis(): Promise<{ success: boolean; analysis?: string; error?: string }> {
  try {
    const historicalReports = await getRawHistoricalReports(); 
    
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
        if (reportData.run && reportData.results) { 
            historicalDataArray.push(reportData);
        } else {
            console.warn(`Skipping invalid historical report file: ${fileName}`);
        }
      } catch (fileReadError) {
        console.error(`Error reading or parsing historical file ${fileName}:`, fileReadError);
      }
    }
    
    historicalDataArray.sort((a, b) => new Date(a.run.timestamp).getTime() - new Date(b.run.timestamp).getTime());
    
    return historicalDataArray;
  } catch (error) {
    console.error('Error fetching raw historical reports:', error);
    return []; 
  }
}

export async function getFlakyTestsAnalysis(): Promise<{ success: boolean; flakyTests?: FlakyTestDetail[]; error?: string }> {
  try {
    const historicalReports = await getRawHistoricalReports();
    if (historicalReports.length === 0) {
      return { success: true, flakyTests: [] };
    }

    const testStatsMap = new Map<string, {
      name: string;
      suiteName: string;
      occurrences: FlakyTestOccurrence[];
    }>();

    for (const report of historicalReports) {
      for (const testResult of report.results) {
        if (!testStatsMap.has(testResult.id)) {
          testStatsMap.set(testResult.id, {
            name: testResult.name,
            suiteName: testResult.suiteName,
            occurrences: [],
          });
        }
        testStatsMap.get(testResult.id)!.occurrences.push({
          runTimestamp: report.run.timestamp,
          status: testResult.status,
        });
      }
    }

    const flakyTests: FlakyTestDetail[] = [];
    for (const [id, data] of testStatsMap.entries()) {
      const statuses = new Set(data.occurrences.map(o => o.status));
      const hasPassed = statuses.has('passed');
      const hasFailed = statuses.has('failed') || statuses.has('timedOut');

      if (hasPassed && hasFailed) {
        let passedCount = 0;
        let failedCount = 0;
        let skippedCount = 0;
        let pendingCount = 0;

        data.occurrences.forEach(occ => {
          if (occ.status === 'passed') passedCount++;
          else if (occ.status === 'failed' || occ.status === 'timedOut') failedCount++;
          else if (occ.status === 'skipped') skippedCount++;
          else if (occ.status === 'pending') pendingCount++;
        });
        
        const sortedOccurrences = data.occurrences.sort((a,b) => new Date(a.runTimestamp).getTime() - new Date(b.runTimestamp).getTime());

        flakyTests.push({
          id,
          name: data.name,
          suiteName: data.suiteName,
          occurrences: sortedOccurrences,
          passedCount,
          failedCount,
          skippedCount,
          pendingCount,
          totalRuns: data.occurrences.length,
          firstSeen: sortedOccurrences[0]?.runTimestamp || '',
          lastSeen: sortedOccurrences[sortedOccurrences.length - 1]?.runTimestamp || '',
        });
      }
    }
    
    flakyTests.sort((a,b) => (b.failedCount / b.totalRuns) - (a.failedCount / a.totalRuns) || b.totalRuns - a.totalRuns);

    return { success: true, flakyTests };
  } catch (error) {
    console.error('Error analyzing flaky tests:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during flaky test analysis.';
    return { success: false, error: errorMessage };
  }
}
