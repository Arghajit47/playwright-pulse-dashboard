
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { HistoricalTrend, PlaywrightPulseReport } from '@/types/playwright';

export async function GET() {
  try {
    const historyDir = path.join(process.cwd(), 'public', 'pulse-report', 'history');
    const files = await fs.readdir(historyDir);
    const trendFiles = files.filter(file => file.startsWith('trend-') && file.endsWith('.json'));

    const trends: HistoricalTrend[] = [];
    for (const file of trendFiles) {
      const filePath = path.join(historyDir, file);
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const reportData: PlaywrightPulseReport = JSON.parse(fileContent);

        if (reportData.run) {
          trends.push({
            date: reportData.run.timestamp,
            totalTests: reportData.run.totalTests,
            passed: reportData.run.passed,
            failed: reportData.run.failed,
            skipped: reportData.run.skipped,
            duration: reportData.run.duration,
            // flakinessRate can be added here if available or calculated from reportData if needed
          });
        } else {
          // Optionally log or handle files missing the 'run' object
          // console.warn(`Historical data file ${file} is missing 'run' object.`);
        }
      } catch (fileError) {
        // Log the error for the specific file and continue processing other files
        console.error(`Error processing historical trend file ${file}:`, fileError);
        // Continue to the next file
      }
    }

    // Sort by date, oldest first for chart consistency.
    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(trends);
  } catch (error) {
    console.error('Failed to read historical trends directory or encountered a critical error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error fetching historical trends';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
