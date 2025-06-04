
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { HistoricalTrend, PlaywrightPulseReport } from '@/types/playwright';

export async function GET() {
  const historyDir = path.join(process.cwd(), 'public', 'pulse-report', 'history');
  console.log('Attempting to read historical trends from directory:', historyDir);
  try {
    const files = await fs.readdir(historyDir);
    const trendFiles = files.filter(file => file.startsWith('trend-') && file.endsWith('.json'));
    console.log('Found trend files:', trendFiles);

    if (trendFiles.length === 0) {
      console.log('No trend files found in', historyDir);
      return NextResponse.json([]); // Return empty array if no files found
    }

    const trends: HistoricalTrend[] = [];
    for (const file of trendFiles) {
      const filePath = path.join(historyDir, file);
      console.log('Processing historical trend file:', filePath);
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
          console.warn(`Historical data file ${file} is missing 'run' object or has unexpected structure. Skipping.`);
        }
      } catch (fileError) {
        console.error(`Error processing historical trend file ${file} at ${filePath}:`, fileError);
        // Continue to the next file, but perhaps log this occurrence
      }
    }

    // Sort by date, oldest first for chart consistency.
    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log('Successfully processed historical trends:', trends.length, 'items.');
    return NextResponse.json(trends);
  } catch (error) {
    console.error('Failed to read historical trends directory or encountered a critical error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error fetching historical trends';
    return NextResponse.json({ message: `Error accessing or reading historical trends directory ${historyDir}: ${errorMessage}` }, { status: 500 });
  }
}
