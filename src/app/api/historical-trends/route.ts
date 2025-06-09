
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { HistoricalTrend, PlaywrightPulseReport } from '@/types/playwright';

export async function GET() {
  // console.log('[API /api/historical-trends] All Environment Variables:', JSON.stringify(process.env, null, 2)); // Uncomment for very verbose debugging
  console.log('[API /api/historical-trends] Raw process.env.PULSE_USER_CWD:', process.env.PULSE_USER_CWD);
  console.log('[API /api/historical-trends] Current process.cwd() for Next.js server:', process.cwd());

  const baseDir = process.env.PULSE_USER_CWD || process.cwd();
  console.log('[API /api/historical-trends] Effective baseDir determined:', baseDir);

  const historyDir = path.join(baseDir, 'pulse-report', 'history');
  console.log('[API /api/historical-trends] Attempting to read historical trends from directory:', historyDir);

  try {
    const files = await fs.readdir(historyDir);
    const trendFiles = files.filter(file => file.startsWith('trend-') && file.endsWith('.json'));
    console.log('[API /api/historical-trends] Found trend files:', trendFiles);

    if (trendFiles.length === 0) {
      console.log('[API /api/historical-trends] No trend files found in', historyDir);
      return NextResponse.json([]);
    }

    const trends: HistoricalTrend[] = [];
    for (const file of trendFiles) {
      const filePath = path.join(historyDir, file);
      // console.log('[API /api/historical-trends] Processing historical trend file:', filePath); // Verbose
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
          });
        } else {
          console.warn(`[API /api/historical-trends] Historical data file ${file} is missing 'run' object or has unexpected structure. Skipping.`);
        }
      } catch (fileError) {
        console.error(`[API /api/historical-trends] Error processing historical trend file ${file} at ${filePath}:`, fileError);
      }
    }

    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log('[API /api/historical-trends] Successfully processed historical trends:', trends.length, 'items.');
    return NextResponse.json(trends);
  } catch (error) {
    console.error('[API /api/historical-trends] Failed to read historical trends directory or encountered a critical error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error fetching historical trends';
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        // This specific error message will now include the historyDir it *thought* it should use.
        return NextResponse.json({ message: `Historical trends directory not found at ${historyDir}. This path was constructed using base directory: '${baseDir}'. Please ensure 'pulse-report/history/' exists in the correct location relative to where you ran the command.` }, { status: 404 });
    }
    return NextResponse.json({ message: `Error accessing or reading historical trends directory ${historyDir}: ${errorMessage}` }, { status: 500 });
  }
}
