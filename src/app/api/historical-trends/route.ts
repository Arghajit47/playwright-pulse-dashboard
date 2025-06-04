
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
          // flakinessRate can be added here if available or calculated
        });
      }
    }

    // Sort by date, newest first for display consistency if needed,
    // but charts usually prefer chronological (oldest first).
    // The TrendAnalysis component sorts it chronologically, so this sort can be oldest first too.
    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    // If you want newest first for the API response (e.g. if a table was to show newest first):
    // trends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


    return NextResponse.json(trends);
  } catch (error) {
    console.error('Failed to read historical trends:', error);
    return NextResponse.json({ message: 'Error fetching historical trends' }, { status: 500 });
  }
}
