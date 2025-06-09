
import { NextResponse } from 'next/server';
import { getRawHistoricalReports } from '@/app/actions';
import type { PlaywrightPulseReport, HistoricalTrend } from '@/types/playwright';

export async function GET() {
  const pulseUserCwd = process.env.PULSE_USER_CWD;
  const baseDir = (pulseUserCwd && pulseUserCwd.trim() !== '') ? pulseUserCwd.trim() : process.cwd();

  console.log('[API /api/historical-trends] Route hit.');
  console.log('[API /api/historical-trends] PULSE_USER_CWD from env:', pulseUserCwd);
  console.log('[API /api/historical-trends] Fallback process.cwd():', process.cwd());
  console.log('[API /api/historical-trends] Effective baseDir for historical trends:', baseDir);

  try {
    const rawReports: PlaywrightPulseReport[] = await getRawHistoricalReports();

    if (!rawReports || rawReports.length === 0) {
      console.log('[API /api/historical-trends] No raw historical reports found or an empty array was returned.');
      return NextResponse.json([], { status: 200 });
    }

    const historicalTrends: HistoricalTrend[] = rawReports.map(report => {
      if (!report.run) {
        console.warn('[API /api/historical-trends] Found a report in history without a .run property, skipping:', report);
        return null; // Will be filtered out later
      }
      return {
        date: report.run.timestamp,
        totalTests: report.run.totalTests,
        passed: report.run.passed,
        failed: report.run.failed + (report.run.timedOut || 0), // Combine failed and timedOut
        skipped: report.run.skipped,
        duration: report.run.duration,
        flakinessRate: report.run.flakinessRate, // Ensure this is part of your RunMetadata type if you use it
      };
    }).filter((trend): trend is HistoricalTrend => trend !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending

    console.log(`[API /api/historical-trends] Successfully processed ${historicalTrends.length} historical trend items.`);
    return NextResponse.json(historicalTrends, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/historical-trends] Critical error processing historical trends:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching historical trends.';
    return NextResponse.json({ message: `Error processing historical trends: ${errorMessage}`, details: String(error) }, { status: 500 });
  }
}
